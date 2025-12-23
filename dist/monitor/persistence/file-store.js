"use strict";
/**
 * File-based Persistence Store
 *
 * Stores session data and events in JSON files.
 * Uses JSON Lines format for event logs (one JSON object per line).
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
exports.FileStore = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const readline = __importStar(require("readline"));
const monitor_js_1 = require("../../types/monitor.js");
class FileStore {
    constructor(options) {
        this.paths = (0, monitor_js_1.getDefaultMonitorPaths)();
        this.baseDir = options?.baseDir || this.paths.baseDir;
        this.sessionsDir = path.join(this.baseDir, 'sessions');
        this.processedDir = path.join(this.baseDir, 'processed');
    }
    /**
     * Initialize the store - create directories if needed
     */
    async init() {
        await fs.promises.mkdir(this.sessionsDir, { recursive: true });
        await fs.promises.mkdir(this.processedDir, { recursive: true });
        console.log(`[FileStore] Initialized at ${this.baseDir}`);
    }
    /**
     * Close the store (no-op for file store)
     */
    async close() {
        // Nothing to clean up
    }
    /**
     * Save an event to the session's event log
     */
    async saveEvent(event) {
        const sessionDir = path.join(this.sessionsDir, event.sessionId);
        await fs.promises.mkdir(sessionDir, { recursive: true });
        const eventsFile = path.join(sessionDir, 'events.jsonl');
        const line = JSON.stringify(event) + '\n';
        await fs.promises.appendFile(eventsFile, line);
    }
    /**
     * Get events for a session
     */
    async getEvents(sessionId, options) {
        const eventsFile = path.join(this.sessionsDir, sessionId, 'events.jsonl');
        if (!fs.existsSync(eventsFile)) {
            return [];
        }
        const events = [];
        const limit = options?.limit || 1000;
        const fileStream = fs.createReadStream(eventsFile);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity,
        });
        for await (const line of rl) {
            if (!line.trim())
                continue;
            try {
                const event = JSON.parse(line);
                // Apply filters
                if (options?.before && event.timestamp >= options.before)
                    continue;
                if (options?.after && event.timestamp <= options.after)
                    continue;
                events.push(event);
            }
            catch (err) {
                console.error('[FileStore] Failed to parse event line:', err);
            }
        }
        // Sort by timestamp and limit
        events.sort((a, b) => a.timestamp - b.timestamp);
        if (events.length > limit) {
            return events.slice(-limit);
        }
        return events;
    }
    /**
     * Save session metadata
     */
    async saveSession(session) {
        const sessionDir = path.join(this.sessionsDir, session.sessionId);
        await fs.promises.mkdir(sessionDir, { recursive: true });
        const metaFile = path.join(sessionDir, 'meta.json');
        await fs.promises.writeFile(metaFile, JSON.stringify(session, null, 2));
    }
    /**
     * Get session metadata
     */
    async getSession(sessionId) {
        const metaFile = path.join(this.sessionsDir, sessionId, 'meta.json');
        if (!fs.existsSync(metaFile)) {
            return null;
        }
        try {
            const content = await fs.promises.readFile(metaFile, 'utf-8');
            return JSON.parse(content);
        }
        catch (err) {
            console.error('[FileStore] Failed to read session:', err);
            return null;
        }
    }
    /**
     * Get all sessions
     */
    async getSessions(options) {
        if (!fs.existsSync(this.sessionsDir)) {
            return [];
        }
        const sessions = [];
        const entries = await fs.promises.readdir(this.sessionsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory())
                continue;
            const session = await this.getSession(entry.name);
            if (!session)
                continue;
            // Apply status filter
            if (options?.status && session.status !== options.status)
                continue;
            sessions.push(session);
        }
        // Sort by start time (newest first)
        sessions.sort((a, b) => b.startTime - a.startTime);
        // Apply limit
        if (options?.limit && sessions.length > options.limit) {
            return sessions.slice(0, options.limit);
        }
        return sessions;
    }
    /**
     * Update session metadata
     */
    async updateSession(sessionId, updates) {
        const session = await this.getSession(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        const updated = { ...session, ...updates };
        await this.saveSession(updated);
    }
    /**
     * Delete a session
     */
    async deleteSession(sessionId) {
        const sessionDir = path.join(this.sessionsDir, sessionId);
        if (!fs.existsSync(sessionDir)) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        try {
            await fs.promises.rm(sessionDir, { recursive: true });
            console.log(`[FileStore] Deleted session: ${sessionId}`);
        }
        catch (err) {
            console.error(`[FileStore] Failed to delete session ${sessionId}:`, err);
            throw err;
        }
    }
    /**
     * Delete all sessions
     */
    async deleteAllSessions() {
        if (!fs.existsSync(this.sessionsDir)) {
            return;
        }
        try {
            const entries = await fs.promises.readdir(this.sessionsDir, { withFileTypes: true });
            let deleted = 0;
            for (const entry of entries) {
                if (!entry.isDirectory())
                    continue;
                const sessionDir = path.join(this.sessionsDir, entry.name);
                try {
                    await fs.promises.rm(sessionDir, { recursive: true });
                    deleted++;
                }
                catch (err) {
                    console.error(`[FileStore] Failed to delete session ${entry.name}:`, err);
                }
            }
            console.log(`[FileStore] Deleted all sessions (${deleted} total)`);
        }
        catch (err) {
            console.error('[FileStore] Failed to delete all sessions:', err);
            throw err;
        }
    }
    /**
     * Get all recent events across all sessions
     */
    async getAllRecentEvents(limit = 200) {
        if (!fs.existsSync(this.sessionsDir)) {
            return [];
        }
        const allEvents = [];
        const entries = await fs.promises.readdir(this.sessionsDir, { withFileTypes: true });
        // Read events from all sessions
        for (const entry of entries) {
            if (!entry.isDirectory())
                continue;
            const sessionEvents = await this.getEvents(entry.name, { limit: 100 });
            allEvents.push(...sessionEvents);
        }
        // Sort by timestamp (newest first) and limit
        allEvents.sort((a, b) => b.timestamp - a.timestamp);
        return allEvents.slice(0, limit);
    }
    /**
     * Delete old sessions
     */
    async pruneOldSessions(olderThan) {
        const sessions = await this.getSessions();
        let pruned = 0;
        for (const session of sessions) {
            const endTime = session.endTime || session.startTime;
            if (endTime < olderThan) {
                const sessionDir = path.join(this.sessionsDir, session.sessionId);
                try {
                    await fs.promises.rm(sessionDir, { recursive: true });
                    pruned++;
                }
                catch (err) {
                    console.error(`[FileStore] Failed to prune session ${session.sessionId}:`, err);
                }
            }
        }
        if (pruned > 0) {
            console.log(`[FileStore] Pruned ${pruned} old sessions`);
        }
        return pruned;
    }
    /**
     * Get event count for a session
     */
    async getEventCount(sessionId) {
        const eventsFile = path.join(this.sessionsDir, sessionId, 'events.jsonl');
        if (!fs.existsSync(eventsFile)) {
            return 0;
        }
        let count = 0;
        const fileStream = fs.createReadStream(eventsFile);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity,
        });
        for await (const line of rl) {
            if (line.trim())
                count++;
        }
        return count;
    }
    /**
     * Get the base directory path
     */
    getBaseDir() {
        return this.baseDir;
    }
    /**
     * Get list of processed event files (for recovery)
     */
    async getProcessedFiles() {
        try {
            const files = await fs.promises.readdir(this.processedDir);
            return files.filter(f => f.endsWith('.json')).sort();
        }
        catch {
            return [];
        }
    }
}
exports.FileStore = FileStore;
