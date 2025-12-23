#!/usr/bin/env node

/**
 * Contextuate Monitor - Hook Event Emitter
 *
 * This script is invoked by Claude Code hooks to emit events
 * to the Contextuate Monitor server.
 *
 * Hook Registration (in ~/.claude/settings.json):
 * {
 *   "hooks": {
 *     "PreToolUse": [{ "type": "command", "command": "~/.contextuate/hooks/emit-event.js" }],
 *     "PostToolUse": [{ "type": "command", "command": "~/.contextuate/hooks/emit-event.js" }],
 *     "Notification": [{ "type": "command", "command": "~/.contextuate/hooks/emit-event.js" }],
 *     "Stop": [{ "type": "command", "command": "~/.contextuate/hooks/emit-event.js" }],
 *     "SubagentStop": [{ "type": "command", "command": "~/.contextuate/hooks/emit-event.js" }]
 *   }
 * }
 *
 * Usage: echo '{"hook_type":"PreToolUse",...}' | emit-event.js
 */

const fs = require('fs');
const path = require('path');
const net = require('net');
const os = require('os');
const crypto = require('crypto');

// Configuration paths
const CONFIG_DIR = path.join(os.homedir(), '.contextuate');
const CONFIG_FILE = path.join(CONFIG_DIR, 'monitor.config.json');
const SESSION_CACHE_DIR = '/tmp';

// Default configuration
const DEFAULT_CONFIG = {
  mode: 'local',
  socketPath: '/tmp/contextuate-monitor.sock',
  redis: {
    host: 'localhost',
    port: 6379,
    password: null,
    channel: 'contextuate:events'
  }
};

/**
 * Load configuration
 */
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(content) };
    }
  } catch (err) {
    // Ignore config errors, use defaults
  }
  return DEFAULT_CONFIG;
}

/**
 * Generate or retrieve session ID
 * Claude doesn't provide a session ID, so we derive one from:
 * - PID of the parent process
 * - TTY or pseudo-terminal
 * - Start time (cached)
 */
function getSessionId() {
  // Check for explicit session ID in environment
  if (process.env.CLAUDE_SESSION_ID) {
    return process.env.CLAUDE_SESSION_ID;
  }

  // Generate consistent session ID based on process info
  const ppid = process.ppid || process.pid;
  const tty = process.env.TTY || process.env.SSH_TTY || '';

  // Create a session cache file to maintain consistency
  const cacheFile = path.join(SESSION_CACHE_DIR, `contextuate-session-${ppid}.id`);

  try {
    if (fs.existsSync(cacheFile)) {
      const cached = fs.readFileSync(cacheFile, 'utf-8').trim();
      if (cached) return cached;
    }
  } catch (err) {
    // Ignore cache read errors
  }

  // Generate new session ID
  const hash = crypto.createHash('sha256');
  hash.update(`${ppid}-${tty}-${Date.now()}`);
  const sessionId = hash.digest('hex').slice(0, 16);

  // Cache the session ID
  try {
    fs.writeFileSync(cacheFile, sessionId);
  } catch (err) {
    // Ignore cache write errors
  }

  return sessionId;
}

/**
 * Get machine ID
 */
function getMachineId() {
  return process.env.HOSTNAME || os.hostname() || 'unknown';
}

/**
 * Get working directory
 */
function getWorkingDirectory() {
  return process.env.PWD || process.cwd();
}

/**
 * Generate UUID v4
 */
function generateUUID() {
  return crypto.randomUUID ? crypto.randomUUID() :
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

/**
 * Parse transcript JSONL file to extract thinking blocks and token usage
 * @param {string} transcriptPath - Path to the transcript JSONL file
 * @returns {{ thinkingBlocks: Array, sessionTokenUsage: Object, model: string|null }}
 */
function parseTranscript(transcriptPath) {
  const result = {
    thinkingBlocks: [],
    sessionTokenUsage: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheCreation5m: 0,
      cacheCreation1h: 0
    },
    model: null
  };

  try {
    if (!transcriptPath || !fs.existsSync(transcriptPath)) {
      return result;
    }

    const content = fs.readFileSync(transcriptPath, 'utf-8');
    const lines = content.trim().split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const entry = JSON.parse(line);

        // Only process assistant messages (which contain thinking and usage)
        if (entry.type !== 'assistant' || !entry.message) continue;

        const message = entry.message;

        // Extract model (use the last one seen)
        if (message.model) {
          result.model = message.model;
        }

        // Extract token usage
        if (message.usage) {
          const usage = message.usage;
          result.sessionTokenUsage.input += usage.input_tokens || 0;
          result.sessionTokenUsage.output += usage.output_tokens || 0;
          result.sessionTokenUsage.cacheRead += usage.cache_read_input_tokens || 0;

          // Cache creation tokens
          if (usage.cache_creation) {
            result.sessionTokenUsage.cacheCreation5m += usage.cache_creation.ephemeral_5m_input_tokens || 0;
            result.sessionTokenUsage.cacheCreation1h += usage.cache_creation.ephemeral_1h_input_tokens || 0;
          }
          // Also check for cache_creation_input_tokens (aggregate)
          if (usage.cache_creation_input_tokens) {
            // Only add if we haven't already counted via cache_creation
            if (!usage.cache_creation) {
              result.sessionTokenUsage.cacheCreation5m += usage.cache_creation_input_tokens || 0;
            }
          }
        }

        // Extract thinking blocks from content
        if (message.content && Array.isArray(message.content)) {
          for (const block of message.content) {
            if (block.type === 'thinking' && block.thinking) {
              result.thinkingBlocks.push({
                content: block.thinking,
                timestamp: entry.timestamp ? new Date(entry.timestamp).getTime() : Date.now(),
                requestId: entry.requestId || undefined
              });
            }
          }
        }
      } catch (parseErr) {
        // Skip malformed lines
        if (process.env.CONTEXTUATE_DEBUG) {
          console.error(`[emit-event] Failed to parse transcript line: ${parseErr.message}`);
        }
      }
    }
  } catch (err) {
    if (process.env.CONTEXTUATE_DEBUG) {
      console.error(`[emit-event] Failed to read transcript: ${err.message}`);
    }
  }

  return result;
}

/**
 * Map hook type to event type
 */
function getEventType(hookType, payload) {
  switch (hookType) {
    case 'PreToolUse':
      return 'tool_call';
    case 'PostToolUse':
      return 'tool_result';
    case 'Notification':
      return 'notification';
    case 'Stop':
      return 'session_end';
    case 'SubagentStop':
      return 'agent_complete';
    default:
      return 'message';
  }
}

/**
 * Build MonitorEvent from hook payload
 */
function buildEvent(hookPayload) {
  const hookType = hookPayload.hook_type || 'Unknown';
  const eventType = getEventType(hookType, hookPayload);

  // Build event data
  const data = {};

  if (hookPayload.tool_name) {
    data.toolName = hookPayload.tool_name;
  }

  if (hookPayload.tool_input !== undefined) {
    data.toolInput = hookPayload.tool_input;
  }

  if (hookPayload.tool_output !== undefined) {
    data.toolOutput = hookPayload.tool_output;
  }

  if (hookPayload.message) {
    data.message = hookPayload.message;
  }

  if (hookPayload.error) {
    data.error = {
      code: hookPayload.error.code || 'UNKNOWN',
      message: hookPayload.error.message || 'Unknown error'
    };
  }

  if (hookPayload.token_usage) {
    data.tokenUsage = {
      input: hookPayload.token_usage.input_tokens || 0,
      output: hookPayload.token_usage.output_tokens || 0,
      cacheRead: hookPayload.token_usage.cache_read_tokens,
      cacheWrite: hookPayload.token_usage.cache_write_tokens
    };
  }

  if (hookPayload.subagent) {
    data.subagent = {
      type: hookPayload.subagent.type || 'unknown',
      prompt: hookPayload.subagent.prompt || ''
    };
  }

  // For Stop and SubagentStop events, parse the transcript for thinking and token usage
  if ((hookType === 'Stop' || hookType === 'SubagentStop') && hookPayload.transcript_path) {
    const transcriptData = parseTranscript(hookPayload.transcript_path);

    // Add transcript path to data
    data.transcriptPath = hookPayload.transcript_path;

    // Add thinking blocks
    if (transcriptData.thinkingBlocks.length > 0) {
      data.thinkingBlocks = transcriptData.thinkingBlocks;
      // Also set the last thinking as the legacy 'thinking' field
      data.thinking = transcriptData.thinkingBlocks[transcriptData.thinkingBlocks.length - 1].content;
    }

    // Add session token usage (cumulative)
    if (transcriptData.sessionTokenUsage.input > 0 || transcriptData.sessionTokenUsage.output > 0) {
      data.sessionTokenUsage = transcriptData.sessionTokenUsage;
    }

    // Add model
    if (transcriptData.model) {
      data.model = transcriptData.model;
    }
  }

  // Get parent session ID from environment if this is a sub-agent
  const parentSessionId = process.env.CONTEXTUATE_PARENT_SESSION;

  return {
    id: generateUUID(),
    timestamp: Date.now(),
    sessionId: getSessionId(),
    parentSessionId: parentSessionId || undefined,
    machineId: getMachineId(),
    workingDirectory: hookPayload.cwd || getWorkingDirectory(),
    eventType: eventType,
    hookType: hookType,
    data: data
  };
}

/**
 * Send event via Unix socket
 */
function sendViaSocket(socketPath, event) {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(socketPath, () => {
      const data = JSON.stringify(event) + '\n';
      client.write(data, () => {
        client.end();
        resolve();
      });
    });

    client.on('error', (err) => {
      // Silently fail if monitor is not running
      resolve();
    });

    // Timeout after 1 second (hook scripts need to be fast)
    client.setTimeout(1000, () => {
      client.destroy();
      resolve();
    });
  });
}

/**
 * Send event via Redis pub/sub
 */
async function sendViaRedis(config, event) {
  let client = null;
  try {
    // Dynamic require to avoid loading redis when not needed
    const Redis = require('ioredis');

    client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      connectTimeout: 1000,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // Don't retry in hook script (needs to be fast)
      lazyConnect: true,
    });

    // Connect with timeout
    await Promise.race([
      client.connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 1000)
      ),
    ]);

    // Publish event
    await client.publish(config.redis.channel, JSON.stringify(event));

    // Log success for debugging (only if DEBUG env var is set)
    if (process.env.CONTEXTUATE_DEBUG) {
      console.error(`[emit-event] Published to Redis: ${event.eventType} from ${event.machineId}`);
    }
  } catch (err) {
    // Silently fail if redis is not available (hook scripts need to be fast)
    // Only log if DEBUG is enabled
    if (process.env.CONTEXTUATE_DEBUG) {
      console.error(`[emit-event] Redis publish failed: ${err.message}`);
    }
  } finally {
    // Always disconnect to avoid hanging connections
    if (client) {
      client.disconnect();
    }
  }
}

/**
 * Main entry point
 */
async function main() {
  // Read hook payload from stdin
  let input = '';

  // Check if stdin has data
  if (process.stdin.isTTY) {
    // No input, exit
    process.exit(0);
  }

  // Read all input
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  if (!input.trim()) {
    process.exit(0);
  }

  // Parse the hook payload
  let hookPayload;
  try {
    hookPayload = JSON.parse(input);
  } catch (err) {
    console.error('[emit-event] Failed to parse hook payload:', err.message);
    process.exit(1);
  }

  // Load configuration
  const config = loadConfig();

  // Build the monitor event
  const event = buildEvent(hookPayload);

  // Send the event
  if (config.mode === 'redis') {
    await sendViaRedis(config, event);
  } else {
    await sendViaSocket(config.socketPath, event);
  }

  // Output response (continue hook execution)
  console.log(JSON.stringify({ continue: true }));
}

// Run
main().catch((err) => {
  console.error('[emit-event] Error:', err.message);
  process.exit(1);
});
