"use strict";
/**
 * Wrapper Manager
 *
 * Manages Claude wrapper sessions with PTY.
 * Spawns and manages Claude processes, handles input/output streaming,
 * persists session state, and cleans up on exit.
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
exports.WrapperManager = void 0;
const pty = __importStar(require("node-pty"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const uuid_1 = require("uuid");
const child_process_1 = require("child_process");
class WrapperManager {
    constructor(persistPath, onEvent) {
        this.wrappers = new Map();
        this.persistPath = persistPath;
        this.onEvent = onEvent;
    }
    /**
     * Initialize - load persisted wrappers and clean up dead ones
     */
    async initialize() {
        await fs.ensureDir(path.dirname(this.persistPath));
        await this.loadAndCleanup();
    }
    /**
     * Load persisted wrappers and clean up any that are no longer running
     */
    async loadAndCleanup() {
        try {
            if (await fs.pathExists(this.persistPath)) {
                const data = await fs.readJson(this.persistPath);
                const persistedWrappers = data.wrappers || [];
                // Check each persisted wrapper to see if it's still running
                const stillRunning = [];
                for (const wrapper of persistedWrappers) {
                    if (this.isProcessRunning(wrapper.pid)) {
                        console.log(`[WrapperManager] Found running wrapper ${wrapper.wrapperId} (PID ${wrapper.pid})`);
                        stillRunning.push(wrapper);
                        // Note: We can't reconnect to existing PTYs, so these are "orphaned"
                        // We'll mark them as ended and clean up
                    }
                    else {
                        console.log(`[WrapperManager] Cleaning up dead wrapper ${wrapper.wrapperId} (PID ${wrapper.pid})`);
                    }
                }
                // For now, we just clean up all persisted wrappers since we can't reconnect to PTYs
                // In a more advanced implementation, we could use screen/tmux to maintain sessions
                await this.persist();
            }
        }
        catch (err) {
            console.error('[WrapperManager] Error loading persisted wrappers:', err);
        }
    }
    /**
     * Check if a process is still running
     */
    isProcessRunning(pid) {
        try {
            process.kill(pid, 0);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Spawn a new Claude wrapper session
     */
    async spawn(options = {}) {
        const wrapperId = (0, uuid_1.v4)().slice(0, 8);
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
        const session = {
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
    writeInput(wrapperId, input) {
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
    resize(wrapperId, cols, rows) {
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
    kill(wrapperId) {
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
    getAll() {
        return Array.from(this.wrappers.values());
    }
    /**
     * Get a specific wrapper
     */
    get(wrapperId) {
        return this.wrappers.get(wrapperId);
    }
    /**
     * Update wrapper state (e.g., from hook events)
     */
    updateState(wrapperId, state, claudeSessionId) {
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
    async shutdown() {
        console.log(`[WrapperManager] Shutting down ${this.wrappers.size} wrappers`);
        for (const [wrapperId, session] of this.wrappers) {
            try {
                session.ptyProcess.kill();
            }
            catch (err) {
                console.error(`[WrapperManager] Error killing wrapper ${wrapperId}:`, err);
            }
        }
        this.wrappers.clear();
        await this.persist();
    }
    /**
     * Persist wrapper state to disk
     */
    async persist() {
        const data = Array.from(this.wrappers.values()).map(w => ({
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
        }
        catch (err) {
            console.error('[WrapperManager] Error persisting wrappers:', err);
        }
    }
    /**
     * Detect if output indicates Claude is waiting for input
     */
    detectInputPrompt(buffer) {
        // Look for common patterns that indicate Claude is waiting
        const patterns = [
            />\s*$/, // Simple prompt
            /\?\s*$/, // Question prompt
            /:\s*$/, // Colon prompt
            /waiting for.*input/i, // Explicit waiting message
            /enter.*to continue/i, // Continue prompt
            /press.*to/i, // Press key prompt
        ];
        return patterns.some(p => p.test(buffer));
    }
    /**
     * Find the Claude executable
     */
    findClaudeExecutable() {
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
                }
                catch {
                    return p;
                }
            }
        }
        // Try to find via PATH
        try {
            const result = (0, child_process_1.execSync)('which claude 2>/dev/null || where claude 2>/dev/null', {
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
                }
                catch {
                    return foundPath;
                }
            }
        }
        catch {
            // Not found via PATH
        }
        return null;
    }
}
exports.WrapperManager = WrapperManager;
