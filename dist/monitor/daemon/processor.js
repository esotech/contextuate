"use strict";
/**
 * Event Processor
 *
 * Core event processing logic extracted from broker.ts.
 * Handles:
 * - Session correlation (parent-child linking)
 * - Subagent lifecycle tracking
 * - Virtual session routing
 * - Event persistence
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventProcessor = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const monitor_js_1 = require("../../types/monitor.js");
const PATHS = (0, monitor_js_1.getDefaultMonitorPaths)();
const SUBAGENT_CORRELATION_WINDOW_MS = 30000;
class EventProcessor {
    constructor(state, notifier) {
        this.sessions = new Map();
        this.state = state;
        this.notifier = notifier;
    }
    /**
     * Load existing sessions from disk
     */
    async loadSessions() {
        try {
            const sessionDirs = await fs.promises.readdir(PATHS.sessionsDir);
            for (const dir of sessionDirs) {
                const metaPath = path.join(PATHS.sessionsDir, dir, 'meta.json');
                try {
                    const data = await fs.promises.readFile(metaPath, 'utf8');
                    const session = JSON.parse(data);
                    this.sessions.set(session.sessionId, session);
                }
                catch (err) {
                    // Skip invalid session directories
                }
            }
            console.log(`[Processor] Loaded ${this.sessions.size} sessions`);
        }
        catch (err) {
            // No sessions directory yet
        }
    }
    /**
     * Process a single event
     */
    async processEvent(event, filepath) {
        const originalSessionId = event.sessionId;
        // Handle subagent lifecycle
        if (event.hookType === 'PreToolUse' && event.data?.toolName === 'Task') {
            this.startSubagentContext(event);
        }
        else if (event.hookType === 'SubagentStop') {
            this.endSubagentContext(event);
        }
        else {
            // Route to active subagent if exists
            const activeStack = this.state.getActiveSubagentStack(originalSessionId);
            if (activeStack.length > 0) {
                const active = activeStack[activeStack.length - 1];
                event = { ...event, sessionId: active.virtualSessionId, parentSessionId: originalSessionId };
            }
        }
        // Track pending subagent spawns
        this.trackSubagentSpawn(event);
        // Update session
        await this.updateSession(event);
        // Persist event
        await this.persistEvent(event);
        // Update state checkpoint
        this.state.lastProcessedTimestamp = event.timestamp;
        // Move raw file to processed
        await this.moveToProcessed(filepath);
        // Notify UI server
        await this.notifier.notify(event);
    }
    /**
     * Generate a short unique ID for virtual sessions
     */
    generateVirtualSessionId() {
        const chars = 'abcdef0123456789';
        let id = '';
        for (let i = 0; i < 8; i++) {
            id += chars[Math.floor(Math.random() * chars.length)];
        }
        return id;
    }
    /**
     * Start tracking a subagent context when Task tool is called
     */
    startSubagentContext(event) {
        const virtualId = this.generateVirtualSessionId();
        const agentType = this.extractAgentType(event);
        const subagent = {
            virtualSessionId: virtualId,
            parentSessionId: event.sessionId,
            agentType,
            startTime: event.timestamp,
        };
        this.state.pushActiveSubagent(event.sessionId, subagent);
        console.log(`[Processor] Started subagent context: ${virtualId} (type: ${agentType || 'unknown'})`);
    }
    /**
     * End the current subagent context
     */
    endSubagentContext(event) {
        const subagent = this.state.popActiveSubagent(event.sessionId);
        if (subagent) {
            // Mark virtual session as completed
            const session = this.sessions.get(subagent.virtualSessionId);
            if (session) {
                session.status = 'completed';
                session.endTime = event.timestamp;
                this.persistSession(session);
            }
            console.log(`[Processor] Ended subagent context: ${subagent.virtualSessionId}`);
        }
    }
    /**
     * Extract agent type from Task tool input
     */
    extractAgentType(event) {
        const toolInput = event.data?.toolInput;
        return toolInput?.subagent_type || toolInput?.agentType;
    }
    /**
     * Track potential sub-agent spawns from Task tool calls
     */
    trackSubagentSpawn(event) {
        if (event.hookType === 'PreToolUse' && event.data?.toolName === 'Task') {
            const spawn = {
                parentSessionId: event.sessionId,
                workingDirectory: event.workingDirectory,
                timestamp: event.timestamp,
                agentType: this.extractAgentType(event),
            };
            const spawns = this.state.pendingSubagentSpawns;
            spawns.push(spawn);
            // Clean up old spawns (older than correlation window)
            const cutoff = Date.now() - SUBAGENT_CORRELATION_WINDOW_MS;
            this.state.pendingSubagentSpawns = spawns.filter(s => s.timestamp > cutoff);
        }
    }
    /**
     * Update session state based on event
     */
    async updateSession(event) {
        let session = this.sessions.get(event.sessionId);
        if (!session) {
            // New session
            const parentSessionId = event.parentSessionId || this.correlateParent(event);
            const isUserInitiated = !parentSessionId;
            session = {
                sessionId: event.sessionId,
                machineId: event.machineId,
                workingDirectory: event.workingDirectory,
                startTime: event.timestamp,
                status: 'active',
                parentSessionId,
                childSessionIds: [],
                tokenUsage: { totalInput: 0, totalOutput: 0 },
                isUserInitiated,
                isPinned: isUserInitiated,
            };
            // Add to parent's children
            if (parentSessionId) {
                const parent = this.sessions.get(parentSessionId);
                if (parent && !parent.childSessionIds.includes(event.sessionId)) {
                    parent.childSessionIds.push(event.sessionId);
                    await this.persistSession(parent);
                }
            }
            this.sessions.set(event.sessionId, session);
            console.log(`[Processor] New session: ${event.sessionId} (parent: ${parentSessionId || 'none'})`);
        }
        // Update session based on event
        if (event.eventType === 'session_end' || event.eventType === 'agent_complete') {
            session.status = 'completed';
            session.endTime = event.timestamp;
            // Use session token usage from transcript parsing
            if (event.data.sessionTokenUsage) {
                session.tokenUsage = {
                    totalInput: event.data.sessionTokenUsage.input || 0,
                    totalOutput: event.data.sessionTokenUsage.output || 0,
                    totalCacheRead: event.data.sessionTokenUsage.cacheRead || 0,
                    totalCacheCreation: (event.data.sessionTokenUsage.cacheCreation5m || 0) +
                        (event.data.sessionTokenUsage.cacheCreation1h || 0),
                };
            }
            // Store model and transcript path
            if (event.data.model) {
                session.model = event.data.model;
            }
            if (event.data.transcriptPath) {
                session.transcriptPath = event.data.transcriptPath;
            }
        }
        else if (event.eventType === 'error') {
            session.status = 'error';
        }
        // Accumulate tokens
        if (event.data?.tokenUsage) {
            session.tokenUsage.totalInput += event.data.tokenUsage.input || 0;
            session.tokenUsage.totalOutput += event.data.tokenUsage.output || 0;
        }
        await this.persistSession(session);
        await this.notifier.notifySessionUpdate(session);
    }
    /**
     * Try to correlate a new session with a pending sub-agent spawn
     */
    correlateParent(event) {
        const spawns = this.state.pendingSubagentSpawns;
        const cutoff = event.timestamp - SUBAGENT_CORRELATION_WINDOW_MS;
        for (const spawn of spawns) {
            if (spawn.timestamp < cutoff)
                continue;
            if (spawn.parentSessionId === event.sessionId)
                continue;
            if (!this.directoriesMatch(spawn.workingDirectory, event.workingDirectory))
                continue;
            return spawn.parentSessionId;
        }
        return undefined;
    }
    /**
     * Check if two working directories match (handles git worktrees)
     */
    directoriesMatch(dir1, dir2) {
        // Normalize paths
        const norm1 = dir1.replace(/\\/g, '/').replace(/\/+$/, '');
        const norm2 = dir2.replace(/\\/g, '/').replace(/\/+$/, '');
        // Exact match
        if (norm1 === norm2)
            return true;
        // One contains the other
        if (norm1.startsWith(norm2 + '/') || norm2.startsWith(norm1 + '/'))
            return true;
        // Check for common parent (worktree scenario)
        const parent1 = norm1.split('/').slice(0, -1).join('/');
        const parent2 = norm2.split('/').slice(0, -1).join('/');
        if (parent1 === parent2)
            return true;
        // Check for shared ancestor up to 3 levels
        const parts1 = norm1.split('/');
        const parts2 = norm2.split('/');
        const minLength = Math.min(parts1.length, parts2.length);
        // Find common prefix depth (at least 3 levels like /home/user/project)
        for (let i = Math.min(minLength, parts1.length - 3); i >= 3; i--) {
            const prefix1 = parts1.slice(0, i).join('/');
            const prefix2 = parts2.slice(0, i).join('/');
            if (prefix1 === prefix2)
                return true;
        }
        return false;
    }
    /**
     * Persist session metadata to disk
     */
    async persistSession(session) {
        const sessionDir = path.join(PATHS.sessionsDir, session.sessionId);
        await fs.promises.mkdir(sessionDir, { recursive: true });
        const metaPath = path.join(sessionDir, 'meta.json');
        await fs.promises.writeFile(metaPath, JSON.stringify(session, null, 2));
    }
    /**
     * Persist event to session's events.jsonl file
     */
    async persistEvent(event) {
        const sessionDir = path.join(PATHS.sessionsDir, event.sessionId);
        await fs.promises.mkdir(sessionDir, { recursive: true });
        const eventsPath = path.join(sessionDir, 'events.jsonl');
        await fs.promises.appendFile(eventsPath, JSON.stringify(event) + '\n');
    }
    /**
     * Move processed file from raw/ to processed/
     */
    async moveToProcessed(filepath) {
        try {
            await fs.promises.mkdir(PATHS.processedDir, { recursive: true });
            const filename = path.basename(filepath);
            const destPath = path.join(PATHS.processedDir, filename);
            await fs.promises.rename(filepath, destPath);
        }
        catch (err) {
            console.error('[Processor] Failed to move to processed:', err);
        }
    }
}
exports.EventProcessor = EventProcessor;
