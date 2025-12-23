"use strict";
/**
 * WebSocket Server
 *
 * Provides real-time event streaming to connected UI clients.
 * Uses the 'ws' library for WebSocket handling.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitorWebSocketServer = void 0;
const ws_1 = require("ws");
const uuid_1 = require("uuid");
class MonitorWebSocketServer {
    constructor(options) {
        this.wss = null;
        this.clients = new Map();
        this.port = options.port;
        this.host = options.host || '0.0.0.0';
        this.broker = options.broker;
        this.persistence = options.persistence;
    }
    /**
     * Start the WebSocket server
     */
    async start() {
        this.wss = new ws_1.WebSocketServer({
            port: this.port,
            host: this.host,
        });
        this.wss.on('connection', (ws) => this.handleConnection(ws));
        this.wss.on('error', (err) => {
            console.error('[WebSocket] Server error:', err);
        });
        // Subscribe to broker events
        this.unsubscribeBroker = this.broker.onEvent((type, data) => {
            this.handleBrokerEvent(type, data);
        });
        console.log(`[WebSocket] Server listening on ws://${this.host}:${this.port}`);
    }
    /**
     * Stop the WebSocket server
     */
    async stop() {
        if (this.unsubscribeBroker) {
            this.unsubscribeBroker();
        }
        // Close all client connections
        for (const [, client] of this.clients) {
            client.send({ type: 'error', message: 'Server shutting down' });
        }
        if (this.wss) {
            return new Promise((resolve) => {
                this.wss.close(() => {
                    this.wss = null;
                    this.clients.clear();
                    console.log('[WebSocket] Server stopped');
                    resolve();
                });
            });
        }
    }
    /**
     * Handle new WebSocket connection
     */
    handleConnection(ws) {
        const clientId = (0, uuid_1.v4)();
        const client = {
            id: clientId,
            subscription: {
                sessionIds: new Set(),
                allSessions: false,
            },
            showHidden: false,
            send: (message) => {
                if (ws.readyState === ws_1.WebSocket.OPEN) {
                    ws.send(JSON.stringify(message));
                }
            },
        };
        this.clients.set(clientId, client);
        console.log(`[WebSocket] Client connected: ${clientId}`);
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleClientMessage(client, message);
            }
            catch (err) {
                console.error('[WebSocket] Failed to parse message:', err);
                client.send({ type: 'error', message: 'Invalid message format' });
            }
        });
        ws.on('close', () => {
            this.clients.delete(clientId);
            console.log(`[WebSocket] Client disconnected: ${clientId}`);
        });
        ws.on('error', (err) => {
            console.error(`[WebSocket] Client error (${clientId}):`, err);
        });
    }
    /**
     * Handle message from client
     */
    async handleClientMessage(client, message) {
        switch (message.type) {
            case 'subscribe':
                if (message.sessionIds && message.sessionIds.length > 0) {
                    // Subscribe to specific sessions
                    client.subscription.allSessions = false;
                    for (const id of message.sessionIds) {
                        client.subscription.sessionIds.add(id);
                    }
                }
                else {
                    // Subscribe to all sessions
                    client.subscription.allSessions = true;
                }
                break;
            case 'unsubscribe':
                for (const id of message.sessionIds) {
                    client.subscription.sessionIds.delete(id);
                }
                break;
            case 'get_sessions':
                const sessions = this.broker.getSessions(client.showHidden);
                client.send({ type: 'sessions', sessions });
                break;
            case 'get_events':
                await this.sendHistoricalEvents(client, message.sessionId, message.limit, message.before);
                break;
            case 'get_all_recent_events':
                await this.sendAllRecentEvents(client, message.limit);
                break;
            case 'send_input':
                // TODO: Implement input forwarding to Claude sessions
                console.log(`[WebSocket] Input for session ${message.sessionId}: ${message.input}`);
                break;
            case 'hide_session':
                try {
                    await this.broker.hideSession(message.sessionId);
                }
                catch (err) {
                    const error = err;
                    client.send({ type: 'error', message: error.message });
                }
                break;
            case 'unhide_session':
                try {
                    await this.broker.unhideSession(message.sessionId);
                }
                catch (err) {
                    const error = err;
                    client.send({ type: 'error', message: error.message });
                }
                break;
            case 'delete_session':
                try {
                    await this.broker.deleteSession(message.sessionId);
                }
                catch (err) {
                    const error = err;
                    client.send({ type: 'error', message: error.message });
                }
                break;
            case 'hide_all_sessions':
                try {
                    await this.broker.hideAllSessions();
                    const updatedSessions = this.broker.getSessions(client.showHidden);
                    this.broadcastSessionsUpdate(updatedSessions);
                }
                catch (err) {
                    const error = err;
                    client.send({ type: 'error', message: error.message });
                }
                break;
            case 'delete_all_sessions':
                try {
                    await this.broker.deleteAllSessions();
                    const updatedSessions = this.broker.getSessions(client.showHidden);
                    this.broadcastSessionsUpdate(updatedSessions);
                }
                catch (err) {
                    const error = err;
                    client.send({ type: 'error', message: error.message });
                }
                break;
            case 'set_show_hidden':
                client.showHidden = message.showHidden;
                const filteredSessions = this.broker.getSessions(client.showHidden);
                client.send({ type: 'sessions', sessions: filteredSessions });
                break;
            case 'set_parent':
                try {
                    await this.broker.setParentSession(message.sessionId, message.parentSessionId);
                }
                catch (err) {
                    const error = err;
                    client.send({ type: 'error', message: error.message });
                }
                break;
            case 'toggle_pin':
                try {
                    await this.broker.togglePin(message.sessionId);
                }
                catch (err) {
                    const error = err;
                    client.send({ type: 'error', message: error.message });
                }
                break;
            case 'set_user_initiated':
                try {
                    await this.broker.setUserInitiated(message.sessionId, message.isUserInitiated);
                }
                catch (err) {
                    const error = err;
                    client.send({ type: 'error', message: error.message });
                }
                break;
            case 'rename_session':
                try {
                    await this.broker.renameSession(message.sessionId, message.label);
                }
                catch (err) {
                    const error = err;
                    client.send({ type: 'error', message: error.message });
                }
                break;
        }
    }
    /**
     * Send historical events to a client
     */
    async sendHistoricalEvents(client, sessionId, limit, before) {
        if (!this.persistence) {
            client.send({ type: 'error', message: 'Persistence not available' });
            return;
        }
        try {
            const events = await this.persistence.getEvents(sessionId, {
                limit: limit || 100,
                before,
            });
            client.send({ type: 'events', sessionId, events });
        }
        catch (err) {
            console.error('[WebSocket] Failed to fetch events:', err);
            client.send({ type: 'error', message: 'Failed to fetch events' });
        }
    }
    /**
     * Send all recent events across all sessions to a client
     */
    async sendAllRecentEvents(client, limit) {
        if (!this.persistence) {
            client.send({ type: 'error', message: 'Persistence not available' });
            return;
        }
        try {
            const events = await this.persistence.getAllRecentEvents(limit || 200);
            client.send({ type: 'all_events', events });
        }
        catch (err) {
            console.error('[WebSocket] Failed to fetch all events:', err);
            client.send({ type: 'error', message: 'Failed to fetch events' });
        }
    }
    /**
     * Handle events from the broker
     */
    handleBrokerEvent(type, data) {
        switch (type) {
            case 'event':
                this.broadcastEvent(data);
                break;
            case 'session_created':
            case 'session_updated':
            case 'session_ended':
                this.broadcastSessionUpdate(data);
                break;
        }
    }
    /**
     * Broadcast an event to subscribed clients
     */
    broadcastEvent(event) {
        for (const [, client] of this.clients) {
            if (this.isClientSubscribed(client, event.sessionId)) {
                client.send({ type: 'event', event });
            }
        }
    }
    /**
     * Broadcast a session update to all clients
     */
    broadcastSessionUpdate(session) {
        const message = { type: 'session_update', session };
        for (const [, client] of this.clients) {
            // Session updates go to all clients
            client.send(message);
        }
    }
    /**
     * Broadcast updated session list to all clients (for bulk operations)
     */
    broadcastSessionsUpdate(sessions) {
        const message = { type: 'sessions_updated', sessions };
        for (const [, client] of this.clients) {
            // Filter sessions based on client's showHidden preference
            const filteredSessions = sessions.filter(s => client.showHidden || !s.hidden);
            client.send({ type: 'sessions_updated', sessions: filteredSessions });
        }
    }
    /**
     * Check if a client is subscribed to events for a session
     */
    isClientSubscribed(client, sessionId) {
        return client.subscription.allSessions || client.subscription.sessionIds.has(sessionId);
    }
    /**
     * Get the number of connected clients
     */
    getClientCount() {
        return this.clients.size;
    }
}
exports.MonitorWebSocketServer = MonitorWebSocketServer;
