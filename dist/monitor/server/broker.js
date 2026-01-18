"use strict";
/**
 * Event Broker
 *
 * Session management and WebSocket broadcast layer for the 3-layer architecture.
 *
 * Role:
 * - Load sessions from disk on startup
 * - Connect to daemon to receive processed events and session updates
 * - Handle session management actions (rename, pin, hide, delete, set parent)
 * - Broadcast updates to WebSocket clients
 * - Subscribe to Redis for multi-machine UI aggregation (optional)
 *
 * Note: Event processing (correlation, parent linking, etc.) is handled by the daemon.
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
exports.EventBroker = void 0;
const net = __importStar(require("net"));
class EventBroker {
    constructor(config) {
        this.daemonSocket = null;
        this.persistence = null;
        this.handlers = new Set();
        this.sessions = new Map();
        this.reconnectTimeout = null;
        this.stopping = false;
        this.connectionAttempts = 0;
        this.config = config;
    }
    /**
     * Start the event broker
     */
    async start() {
        // Load sessions from disk
        await this.loadSessions();
        // Connect to daemon socket (optional - daemon may not be running)
        this.connectToDaemon();
        console.log('[Broker] Started - sessions loaded, daemon connection initiated');
    }
    /**
     * Stop the event broker
     */
    async stop() {
        // Set stopping flag BEFORE clearing timeout or destroying socket
        // This prevents the close event from scheduling a new reconnection
        this.stopping = true;
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        if (this.daemonSocket) {
            this.daemonSocket.destroy();
            this.daemonSocket = null;
        }
        console.log('[Broker] Stopped');
    }
    /**
     * Connect to daemon socket to receive processed events
     */
    connectToDaemon() {
        const socketPath = '/tmp/contextuate-daemon.sock';
        this.daemonSocket = net.createConnection(socketPath);
        let buffer = '';
        this.daemonSocket.on('data', (data) => {
            buffer += data.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const message = JSON.parse(line);
                        this.handleDaemonMessage(message);
                    }
                    catch (err) {
                        console.error('[Broker] Failed to parse daemon message:', err);
                    }
                }
            }
        });
        this.daemonSocket.on('connect', () => {
            this.connectionAttempts = 0; // Reset on successful connection
            console.log('[Broker] Connected to daemon');
        });
        this.daemonSocket.on('error', (err) => {
            // Only log after a few attempts to avoid noise during startup
            if (this.connectionAttempts >= 3) {
                console.log('[Broker] Daemon connection error:', err.message);
            }
            this.scheduleDaemonReconnect();
        });
        this.daemonSocket.on('close', () => {
            if (!this.stopping && this.connectionAttempts === 0) {
                // Only log if we were previously connected
                console.log('[Broker] Daemon connection closed, will retry...');
            }
            this.scheduleDaemonReconnect();
        });
    }
    /**
     * Schedule reconnection to daemon
     */
    scheduleDaemonReconnect() {
        // Don't reconnect if we're stopping
        if (this.stopping) {
            return;
        }
        if (this.reconnectTimeout) {
            return;
        }
        this.connectionAttempts++;
        // Fast retries initially (500ms for first 5 attempts), then slow down
        const delay = this.connectionAttempts <= 5 ? 500 : 5000;
        this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            // Double-check stopping flag before reconnecting
            if (!this.stopping) {
                this.connectToDaemon();
            }
        }, delay);
    }
    /**
     * Handle message from daemon
     */
    handleDaemonMessage(message) {
        if (message.type === 'session_update') {
            // Update local session cache
            const session = message.session;
            const isNew = !this.sessions.has(session.sessionId);
            this.sessions.set(session.sessionId, session);
            // Emit to WebSocket clients
            if (isNew) {
                this.emit('session_created', session);
            }
            else {
                this.emit('session_updated', session);
            }
        }
        else if (message.type === 'wrapper_connected') {
            // Wrapper session connected
            this.emit('wrapper_connected', {
                wrapperId: message.wrapperId,
                state: message.state,
            });
        }
        else if (message.type === 'wrapper_disconnected') {
            // Wrapper session disconnected
            this.emit('wrapper_disconnected', {
                wrapperId: message.wrapperId,
                exitCode: message.exitCode,
            });
        }
        else if (message.type === 'wrapper_state') {
            // Wrapper state changed
            this.emit('wrapper_state', {
                wrapperId: message.wrapperId,
                state: message.state,
                claudeSessionId: message.claudeSessionId,
            });
        }
        else if (message.type === 'wrapper_output') {
            // Wrapper terminal output
            this.emit('wrapper_output', {
                wrapperId: message.wrapperId,
                data: message.data,
                timestamp: message.timestamp,
            });
        }
        else if (message.type === 'wrapper_spawned') {
            // Wrapper spawn response
            this.emit('wrapper_spawned', {
                wrapperId: message.wrapperId || '',
                success: message.success,
                error: message.error,
            });
        }
        else if (message.type === 'wrappers_list') {
            // List of active wrappers from daemon
            this.emit('wrappers_list', {
                wrappers: message.wrappers || [],
            });
        }
        else if (message.eventType) {
            // This is an event from the daemon
            const event = message;
            this.emit('event', event);
        }
    }
    /**
     * Send a message to the daemon
     */
    sendToDaemon(message) {
        if (this.daemonSocket && this.daemonSocket.writable) {
            this.daemonSocket.write(JSON.stringify(message) + '\n');
        }
        else {
            console.error('[Broker] Cannot send to daemon - not connected');
        }
    }
    /**
     * Set the persistence store
     */
    setPersistence(store) {
        this.persistence = store;
    }
    /**
     * Register an event handler
     */
    onEvent(handler) {
        this.handlers.add(handler);
        return () => this.handlers.delete(handler);
    }
    /**
     * Get all active sessions
     */
    getSessions(includeHidden = true) {
        const sessions = Array.from(this.sessions.values());
        if (includeHidden) {
            return sessions;
        }
        return sessions.filter(session => !session.hidden);
    }
    /**
     * Get a specific session
     */
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    /**
     * Persist session to storage
     */
    async persistSession(session) {
        if (this.persistence) {
            try {
                await this.persistence.saveSession(session);
            }
            catch (err) {
                console.error('[Broker] Failed to persist session:', err);
            }
        }
    }
    /**
     * Emit event to all handlers
     */
    emit(type, data) {
        this.handlers.forEach((handler) => {
            try {
                const result = handler(type, data);
                if (result instanceof Promise) {
                    result.catch((err) => {
                        console.error('[Broker] Handler error:', err);
                    });
                }
            }
            catch (err) {
                console.error('[Broker] Handler error:', err);
            }
        });
    }
    /**
     * Load existing sessions from persistence (disk)
     */
    async loadSessions() {
        if (this.persistence) {
            try {
                const sessions = await this.persistence.getSessions();
                for (const session of sessions) {
                    this.sessions.set(session.sessionId, session);
                }
                console.log(`[Broker] Loaded ${sessions.length} sessions from persistence`);
            }
            catch (err) {
                console.error('[Broker] Failed to load sessions:', err);
            }
        }
    }
    /**
     * Get configuration
     */
    getConfig() {
        return this.config;
    }
    /**
     * Hide a session (soft-hide, preserves data)
     */
    async hideSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        session.hidden = true;
        await this.persistSession(session);
        this.emit('session_updated', session);
        console.log(`[Broker] Session hidden: ${sessionId.slice(0, 8)}`);
    }
    /**
     * Unhide a session
     */
    async unhideSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        session.hidden = false;
        await this.persistSession(session);
        this.emit('session_updated', session);
        console.log(`[Broker] Session unhidden: ${sessionId.slice(0, 8)}`);
    }
    /**
     * Delete a session (permanent removal)
     */
    async deleteSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        // Remove from parent's child list if applicable
        if (session.parentSessionId) {
            const parent = this.sessions.get(session.parentSessionId);
            if (parent) {
                parent.childSessionIds = parent.childSessionIds.filter(id => id !== sessionId);
                await this.persistSession(parent);
                this.emit('session_updated', parent);
            }
        }
        // Remove from memory
        this.sessions.delete(sessionId);
        // Remove from persistence
        if (this.persistence) {
            try {
                await this.persistence.deleteSession(sessionId);
            }
            catch (err) {
                console.error('[Broker] Failed to delete session from persistence:', err);
            }
        }
        console.log(`[Broker] Session deleted: ${sessionId.slice(0, 8)}`);
    }
    /**
     * Hide all sessions
     */
    async hideAllSessions() {
        const sessions = Array.from(this.sessions.values());
        for (const session of sessions) {
            session.hidden = true;
            await this.persistSession(session);
        }
        console.log(`[Broker] All sessions hidden (${sessions.length} total)`);
    }
    /**
     * Delete all sessions
     */
    async deleteAllSessions() {
        const sessionIds = Array.from(this.sessions.keys());
        // Clear memory
        this.sessions.clear();
        // Clear persistence
        if (this.persistence) {
            try {
                await this.persistence.deleteAllSessions();
            }
            catch (err) {
                console.error('[Broker] Failed to delete all sessions from persistence:', err);
            }
        }
        console.log(`[Broker] All sessions deleted (${sessionIds.length} total)`);
    }
    /**
     * Manually set parent session (user override for grouping)
     */
    async setParentSession(sessionId, parentSessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        // Remove from old parent's child list
        if (session.parentSessionId) {
            const oldParent = this.sessions.get(session.parentSessionId);
            if (oldParent) {
                oldParent.childSessionIds = oldParent.childSessionIds.filter(id => id !== sessionId);
                await this.persistSession(oldParent);
                this.emit('session_updated', oldParent);
            }
        }
        // Update session's parent
        session.parentSessionId = parentSessionId || undefined;
        session.manualParentSessionId = parentSessionId || undefined;
        session.isUserInitiated = !parentSessionId; // No parent = user-initiated
        // Add to new parent's child list
        if (parentSessionId) {
            const newParent = this.sessions.get(parentSessionId);
            if (newParent && !newParent.childSessionIds.includes(sessionId)) {
                newParent.childSessionIds.push(sessionId);
                await this.persistSession(newParent);
                this.emit('session_updated', newParent);
            }
        }
        await this.persistSession(session);
        this.emit('session_updated', session);
        console.log(`[Broker] Session ${sessionId.slice(0, 8)} parent set to ${parentSessionId?.slice(0, 8) || 'none'}`);
    }
    /**
     * Toggle session pinned state
     */
    async togglePin(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        session.isPinned = !session.isPinned;
        await this.persistSession(session);
        this.emit('session_updated', session);
        console.log(`[Broker] Session ${sessionId.slice(0, 8)} ${session.isPinned ? 'pinned' : 'unpinned'}`);
    }
    /**
     * Set whether a session is user-initiated
     */
    async setUserInitiated(sessionId, isUserInitiated) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        session.isUserInitiated = isUserInitiated;
        await this.persistSession(session);
        this.emit('session_updated', session);
        console.log(`[Broker] Session ${sessionId.slice(0, 8)} marked as ${isUserInitiated ? 'user-initiated' : 'sub-agent'}`);
    }
    /**
     * Rename a session (set custom label)
     */
    async renameSession(sessionId, label) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        // Empty string clears the label
        session.label = label.trim() || undefined;
        await this.persistSession(session);
        this.emit('session_updated', session);
        console.log(`[Broker] Session ${sessionId.slice(0, 8)} renamed to "${session.label || '(cleared)'}"`);
    }
}
exports.EventBroker = EventBroker;
