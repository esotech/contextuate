/**
 * Wrapper Manager
 *
 * Manages Claude wrapper sessions with PTY.
 * Spawns and manages Claude processes, handles input/output streaming,
 * persists session state, and cleans up on exit.
 */

import * as pty from 'node-pty';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { execSync } from 'child_process';

export interface WrapperSession {
  wrapperId: string;
  ptyProcess: pty.IPty;
  pid: number;
  claudeSessionId: string | null;
  state: 'starting' | 'processing' | 'waiting_input' | 'ended';
  cwd: string;
  args: string[];
  startTime: number;
  cols: number;
  rows: number;
}

export interface PersistedWrapper {
  wrapperId: string;
  pid: number;
  claudeSessionId: string | null;
  state: string;
  cwd: string;
  args: string[];
  startTime: number;
  cols: number;
  rows: number;
}

export type WrapperEventCallback = (event: {
  type: 'output' | 'state_changed' | 'started' | 'ended';
  wrapperId: string;
  data?: string;
  state?: string;
  claudeSessionId?: string;
  exitCode?: number;
}) => void;

export class WrapperManager {
  private wrappers: Map<string, WrapperSession> = new Map();
  private persistPath: string;
  private onEvent: WrapperEventCallback;

  constructor(persistPath: string, onEvent: WrapperEventCallback) {
    this.persistPath = persistPath;
    this.onEvent = onEvent;
  }

  /**
   * Initialize - load persisted wrappers and clean up dead ones
   */
  async initialize(): Promise<void> {
    await fs.ensureDir(path.dirname(this.persistPath));
    await this.loadAndCleanup();
  }

  /**
   * Load persisted wrappers and clean up any that are no longer running
   */
  private async loadAndCleanup(): Promise<void> {
    try {
      if (await fs.pathExists(this.persistPath)) {
        const data = await fs.readJson(this.persistPath);
        const persistedWrappers: PersistedWrapper[] = data.wrappers || [];

        // Check each persisted wrapper to see if it's still running
        const stillRunning: PersistedWrapper[] = [];
        for (const wrapper of persistedWrappers) {
          if (this.isProcessRunning(wrapper.pid)) {
            console.log(`[WrapperManager] Found running wrapper ${wrapper.wrapperId} (PID ${wrapper.pid})`);
            stillRunning.push(wrapper);
            // Note: We can't reconnect to existing PTYs, so these are "orphaned"
            // We'll mark them as ended and clean up
          } else {
            console.log(`[WrapperManager] Cleaning up dead wrapper ${wrapper.wrapperId} (PID ${wrapper.pid})`);
          }
        }

        // For now, we just clean up all persisted wrappers since we can't reconnect to PTYs
        // In a more advanced implementation, we could use screen/tmux to maintain sessions
        await this.persist();
      }
    } catch (err) {
      console.error('[WrapperManager] Error loading persisted wrappers:', err);
    }
  }

  /**
   * Check if a process is still running
   */
  private isProcessRunning(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Spawn a new Claude wrapper session
   */
  async spawn(options: {
    cwd?: string;
    args?: string[];
    cols?: number;
    rows?: number;
  } = {}): Promise<string> {
    const wrapperId = uuidv4().slice(0, 8);
    const cwd = options.cwd || process.cwd();
    const args = options.args || [];
    const cols = options.cols || 120;
    const rows = options.rows || 40;

    // Find Claude executable
    const claudePath = this.findClaudeExecutable();
    if (!claudePath) {
      throw new Error('Claude CLI not found. Please install Claude Code.');
    }

    console.log(`[WrapperManager] Spawning Claude wrapper ${wrapperId} at ${cwd}`);

    // Spawn Claude with PTY
    const ptyProcess = pty.spawn(claudePath, args, {
      name: 'xterm-256color',
      cols,
      rows,
      cwd,
      env: {
        ...process.env,
        CONTEXTUATE_WRAPPER_ID: wrapperId,
      },
    });

    const session: WrapperSession = {
      wrapperId,
      ptyProcess,
      pid: ptyProcess.pid,
      claudeSessionId: null,
      state: 'starting',
      cwd,
      args,
      startTime: Date.now(),
      cols,
      rows,
    };

    this.wrappers.set(wrapperId, session);

    // Handle PTY output
    let outputBuffer = '';
    ptyProcess.onData((data) => {
      // Stream to UI
      this.onEvent({
        type: 'output',
        wrapperId,
        data,
      });

      // Buffer for pattern detection
      outputBuffer += data;
      if (outputBuffer.length > 1000) {
        outputBuffer = outputBuffer.slice(-500);
      }

      // Heuristic: detect if waiting for input
      if (session.state === 'processing' || session.state === 'starting') {
        if (this.detectInputPrompt(outputBuffer)) {
          session.state = 'waiting_input';
          this.onEvent({
            type: 'state_changed',
            wrapperId,
            state: 'waiting_input',
          });
          outputBuffer = '';
        }
      }
    });

    // Handle PTY exit
    ptyProcess.onExit(({ exitCode }) => {
      console.log(`[WrapperManager] Wrapper ${wrapperId} exited with code ${exitCode}`);
      session.state = 'ended';

      this.onEvent({
        type: 'ended',
        wrapperId,
        exitCode,
      });

      this.wrappers.delete(wrapperId);
      this.persist();
    });

    // Persist and notify
    await this.persist();

    this.onEvent({
      type: 'started',
      wrapperId,
      state: 'starting',
    });

    // Mark as processing after a short delay (Claude is starting up)
    setTimeout(() => {
      if (session.state === 'starting') {
        session.state = 'processing';
        this.onEvent({
          type: 'state_changed',
          wrapperId,
          state: 'processing',
        });
      }
    }, 1000);

    return wrapperId;
  }

  /**
   * Write input to a wrapper's PTY
   */
  writeInput(wrapperId: string, input: string): boolean {
    const session = this.wrappers.get(wrapperId);
    if (!session) {
      return false;
    }

    session.ptyProcess.write(input);
    return true;
  }

  /**
   * Resize a wrapper's PTY
   */
  resize(wrapperId: string, cols: number, rows: number): boolean {
    const session = this.wrappers.get(wrapperId);
    if (!session) {
      return false;
    }

    session.ptyProcess.resize(cols, rows);
    session.cols = cols;
    session.rows = rows;
    return true;
  }

  /**
   * Kill a wrapper session
   */
  kill(wrapperId: string): boolean {
    const session = this.wrappers.get(wrapperId);
    if (!session) {
      return false;
    }

    console.log(`[WrapperManager] Killing wrapper ${wrapperId}`);
    session.ptyProcess.kill();
    return true;
  }

  /**
   * Get all active wrappers
   */
  getAll(): WrapperSession[] {
    return Array.from(this.wrappers.values());
  }

  /**
   * Get a specific wrapper
   */
  get(wrapperId: string): WrapperSession | undefined {
    return this.wrappers.get(wrapperId);
  }

  /**
   * Update wrapper state (e.g., from hook events)
   */
  updateState(wrapperId: string, state: 'starting' | 'processing' | 'waiting_input' | 'ended', claudeSessionId?: string): void {
    const session = this.wrappers.get(wrapperId);
    if (session) {
      session.state = state;
      if (claudeSessionId) {
        session.claudeSessionId = claudeSessionId;
      }
      this.onEvent({
        type: 'state_changed',
        wrapperId,
        state,
        claudeSessionId,
      });
    }
  }

  /**
   * Shutdown all wrappers
   */
  async shutdown(): Promise<void> {
    console.log(`[WrapperManager] Shutting down ${this.wrappers.size} wrappers`);
    for (const [wrapperId, session] of this.wrappers) {
      try {
        session.ptyProcess.kill();
      } catch (err) {
        console.error(`[WrapperManager] Error killing wrapper ${wrapperId}:`, err);
      }
    }
    this.wrappers.clear();
    await this.persist();
  }

  /**
   * Persist wrapper state to disk
   */
  private async persist(): Promise<void> {
    const data: PersistedWrapper[] = Array.from(this.wrappers.values()).map(w => ({
      wrapperId: w.wrapperId,
      pid: w.pid,
      claudeSessionId: w.claudeSessionId,
      state: w.state,
      cwd: w.cwd,
      args: w.args,
      startTime: w.startTime,
      cols: w.cols,
      rows: w.rows,
    }));

    try {
      await fs.writeJson(this.persistPath, { wrappers: data }, { spaces: 2 });
    } catch (err) {
      console.error('[WrapperManager] Error persisting wrappers:', err);
    }
  }

  /**
   * Detect if output indicates Claude is waiting for input
   */
  private detectInputPrompt(buffer: string): boolean {
    // Look for common patterns that indicate Claude is waiting
    const patterns = [
      />\s*$/,                    // Simple prompt
      /\?\s*$/,                   // Question prompt
      /:\s*$/,                    // Colon prompt
      /waiting for.*input/i,     // Explicit waiting message
      /enter.*to continue/i,     // Continue prompt
      /press.*to/i,              // Press key prompt
    ];

    return patterns.some(p => p.test(buffer));
  }

  /**
   * Find the Claude executable
   */
  private findClaudeExecutable(): string | null {
    const commonPaths = [
      // New Claude Code installation location (Bun-based)
      path.join(os.homedir(), '.local', 'bin', 'claude'),
      // Legacy npm-based installations
      path.join(os.homedir(), '.npm-global', 'bin', 'claude'),
      path.join(os.homedir(), '.nvm', 'versions', 'node', process.version, 'bin', 'claude'),
      '/opt/homebrew/bin/claude',
      '/usr/local/bin/claude',
      '/usr/bin/claude',
    ];

    for (const p of commonPaths) {
      if (fs.existsSync(p)) {
        // Resolve symlinks to get the actual executable path
        try {
          const resolved = fs.realpathSync(p);
          console.log(`[WrapperManager] Found Claude at ${p} -> ${resolved}`);
          return resolved;
        } catch {
          return p;
        }
      }
    }

    // Try to find via PATH
    try {
      const result = execSync('which claude 2>/dev/null || where claude 2>/dev/null', {
        encoding: 'utf-8',
        timeout: 5000,
      }).trim();
      if (result) {
        const foundPath = result.split('\n')[0];
        // Resolve symlinks to get the actual executable path
        try {
          const resolved = fs.realpathSync(foundPath);
          console.log(`[WrapperManager] Found Claude via PATH at ${foundPath} -> ${resolved}`);
          return resolved;
        } catch {
          return foundPath;
        }
      }
    } catch {
      // Not found via PATH
    }

    return null;
  }
}
