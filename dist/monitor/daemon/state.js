"use strict";
/**
 * Daemon State Management
 *
 * Manages persistent state for the monitor daemon including:
 * - Last processed timestamp (for crash recovery)
 * - Pending subagent spawns (for parent-child correlation)
 * - Active subagent stacks (for virtual session routing)
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
exports.StateManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const monitor_js_1 = require("../../types/monitor.js");
const PATHS = (0, monitor_js_1.getDefaultMonitorPaths)();
class StateManager {
    constructor() {
        this.saveInterval = null;
        this.state = {
            lastProcessedTimestamp: 0,
            pendingSubagentSpawns: [],
            activeSubagentStacks: {},
        };
    }
    /**
     * Load state from disk
     */
    async load() {
        try {
            const data = await fs.promises.readFile(PATHS.daemonStateFile, 'utf8');
            this.state = JSON.parse(data);
            console.log(`[State] Loaded state, last processed: ${new Date(this.state.lastProcessedTimestamp).toISOString()}`);
        }
        catch (err) {
            console.log('[State] No existing state file, starting fresh');
        }
    }
    /**
     * Save state to disk
     */
    async save() {
        try {
            await fs.promises.mkdir(path.dirname(PATHS.daemonStateFile), { recursive: true });
            await fs.promises.writeFile(PATHS.daemonStateFile, JSON.stringify(this.state, null, 2));
        }
        catch (err) {
            console.error('[State] Failed to save state:', err);
        }
    }
    /**
     * Start periodic state saving
     */
    startPeriodicSave(intervalMs = 30000) {
        this.saveInterval = setInterval(() => this.save(), intervalMs);
    }
    /**
     * Stop periodic state saving
     */
    stopPeriodicSave() {
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
            this.saveInterval = null;
        }
    }
    /**
     * Get last processed timestamp
     */
    get lastProcessedTimestamp() {
        return this.state.lastProcessedTimestamp;
    }
    /**
     * Set last processed timestamp
     */
    set lastProcessedTimestamp(timestamp) {
        this.state.lastProcessedTimestamp = timestamp;
    }
    /**
     * Get pending subagent spawns
     */
    get pendingSubagentSpawns() {
        return this.state.pendingSubagentSpawns;
    }
    /**
     * Set pending subagent spawns
     */
    set pendingSubagentSpawns(spawns) {
        this.state.pendingSubagentSpawns = spawns;
    }
    /**
     * Get active subagent stack for a session
     */
    getActiveSubagentStack(sessionId) {
        return this.state.activeSubagentStacks[sessionId] || [];
    }
    /**
     * Set active subagent stack for a session
     */
    setActiveSubagentStack(sessionId, stack) {
        if (stack.length === 0) {
            delete this.state.activeSubagentStacks[sessionId];
        }
        else {
            this.state.activeSubagentStacks[sessionId] = stack;
        }
    }
    /**
     * Push a new subagent onto the stack for a session
     */
    pushActiveSubagent(sessionId, subagent) {
        if (!this.state.activeSubagentStacks[sessionId]) {
            this.state.activeSubagentStacks[sessionId] = [];
        }
        this.state.activeSubagentStacks[sessionId].push(subagent);
    }
    /**
     * Pop the top subagent from the stack for a session
     */
    popActiveSubagent(sessionId) {
        const stack = this.state.activeSubagentStacks[sessionId];
        if (!stack || stack.length === 0)
            return undefined;
        const subagent = stack.pop();
        if (stack.length === 0) {
            delete this.state.activeSubagentStacks[sessionId];
        }
        return subagent;
    }
}
exports.StateManager = StateManager;
