/**
 * WebSocket Server
 *
 * Provides real-time event streaming to connected UI clients.
 * Uses the 'ws' library for WebSocket handling.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type {
  ClientMessage,
  ServerMessage,
  MonitorEvent,
  SessionMeta,
  WSClient,
  Subscription,
} from '../../types/monitor';
import type { EventBroker, BrokerEventType } from './broker';
import type { PersistenceStore } from '../../types/monitor';

export interface WebSocketServerOptions {
  port: number;
  host?: string;
  broker: EventBroker;
  persistence?: PersistenceStore;
}

export class MonitorWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WSClient> = new Map();
  private broker: EventBroker;
  private persistence?: PersistenceStore;
  private port: number;
  private host: string;
  private unsubscribeBroker?: () => void;

  constructor(options: WebSocketServerOptions) {
    this.port = options.port;
    this.host = options.host || '0.0.0.0';
    this.broker = options.broker;
    this.persistence = options.persistence;
  }

  /**
   * Start the WebSocket server
   */
  async start(): Promise<void> {
    this.wss = new WebSocketServer({
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
  async stop(): Promise<void> {
    if (this.unsubscribeBroker) {
      this.unsubscribeBroker();
    }

    if (this.wss) {
      // Forcefully close all client connections
      for (const ws of this.wss.clients) {
        try {
          ws.send(JSON.stringify({ type: 'error', message: 'Server shutting down' }));
          ws.terminate(); // Force close the connection
        } catch (err) {
          // Ignore errors during shutdown
        }
      }

      return new Promise((resolve) => {
        // Add timeout to force resolve if close takes too long
        const timeout = setTimeout(() => {
          console.log('[WebSocket] Server close timeout, forcing shutdown');
          this.wss = null;
          this.clients.clear();
          resolve();
        }, 3000);

        this.wss!.close(() => {
          clearTimeout(timeout);
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
  private handleConnection(ws: WebSocket): void {
    const clientId = uuidv4();

    const client: WSClient = {
      id: clientId,
      subscription: {
        sessionIds: new Set(),
        allSessions: false,
      },
      showHidden: false,
      send: (message: ServerMessage) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
      },
    };

    this.clients.set(clientId, client);
    console.log(`[WebSocket] Client connected: ${clientId}`);

    ws.on('message', (data) => {
      try {
        const message: ClientMessage = JSON.parse(data.toString());
        this.handleClientMessage(client, message);
      } catch (err) {
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
  private async handleClientMessage(client: WSClient, message: ClientMessage): Promise<void> {
    switch (message.type) {
      case 'subscribe':
        if (message.sessionIds && message.sessionIds.length > 0) {
          // Subscribe to specific sessions
          client.subscription.allSessions = false;
          for (const id of message.sessionIds) {
            client.subscription.sessionIds.add(id);
          }
        } else {
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

      case 'get_event_detail':
        await this.sendEventDetail(client, message.sessionId, message.eventId);
        break;

      case 'send_input':
        // Legacy - kept for backward compatibility
        console.log(`[WebSocket] Input for session ${message.sessionId}: ${message.input}`);
        break;

      case 'inject_input':
        // Forward input injection to daemon via broker
        this.broker.sendToDaemon({
          type: 'inject_input',
          wrapperId: message.wrapperId,
          input: message.input,
        });
        break;

      case 'resize_wrapper':
        // Forward resize to daemon via broker
        this.broker.sendToDaemon({
          type: 'resize_wrapper',
          wrapperId: message.wrapperId,
          cols: message.cols,
          rows: message.rows,
        });
        break;

      case 'get_wrappers':
        // Request current wrapper list from daemon
        this.broker.sendToDaemon({ type: 'get_wrappers' });
        break;

      case 'spawn_wrapper':
        // Forward spawn request to daemon
        this.broker.sendToDaemon({
          type: 'spawn_wrapper',
          cwd: message.cwd,
          args: message.args,
          cols: message.cols,
          rows: message.rows,
        });
        break;

      case 'kill_wrapper':
        // Forward kill request to daemon
        this.broker.sendToDaemon({
          type: 'kill_wrapper',
          wrapperId: message.wrapperId,
        });
        break;

      case 'hide_session':
        try {
          await this.broker.hideSession(message.sessionId);
        } catch (err) {
          const error = err as Error;
          client.send({ type: 'error', message: error.message });
        }
        break;

      case 'unhide_session':
        try {
          await this.broker.unhideSession(message.sessionId);
        } catch (err) {
          const error = err as Error;
          client.send({ type: 'error', message: error.message });
        }
        break;

      case 'delete_session':
        try {
          await this.broker.deleteSession(message.sessionId);
        } catch (err) {
          const error = err as Error;
          client.send({ type: 'error', message: error.message });
        }
        break;

      case 'hide_all_sessions':
        try {
          await this.broker.hideAllSessions();
          const updatedSessions = this.broker.getSessions(client.showHidden);
          this.broadcastSessionsUpdate(updatedSessions);
        } catch (err) {
          const error = err as Error;
          client.send({ type: 'error', message: error.message });
        }
        break;

      case 'delete_all_sessions':
        try {
          await this.broker.deleteAllSessions();
          const updatedSessions = this.broker.getSessions(client.showHidden);
          this.broadcastSessionsUpdate(updatedSessions);
        } catch (err) {
          const error = err as Error;
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
        } catch (err) {
          const error = err as Error;
          client.send({ type: 'error', message: error.message });
        }
        break;

      case 'toggle_pin':
        try {
          await this.broker.togglePin(message.sessionId);
        } catch (err) {
          const error = err as Error;
          client.send({ type: 'error', message: error.message });
        }
        break;

      case 'set_user_initiated':
        try {
          await this.broker.setUserInitiated(message.sessionId, message.isUserInitiated);
        } catch (err) {
          const error = err as Error;
          client.send({ type: 'error', message: error.message });
        }
        break;

      case 'rename_session':
        try {
          await this.broker.renameSession(message.sessionId, message.label);
        } catch (err) {
          const error = err as Error;
          client.send({ type: 'error', message: error.message });
        }
        break;
    }
  }

  /**
   * Send historical events to a client
   */
  private async sendHistoricalEvents(
    client: WSClient,
    sessionId: string,
    limit?: number,
    before?: number
  ): Promise<void> {
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
    } catch (err) {
      console.error('[WebSocket] Failed to fetch events:', err);
      client.send({ type: 'error', message: 'Failed to fetch events' });
    }
  }

  /**
   * Send all recent events across all sessions to a client
   */
  private async sendAllRecentEvents(
    client: WSClient,
    limit?: number
  ): Promise<void> {
    if (!this.persistence) {
      client.send({ type: 'error', message: 'Persistence not available' });
      return;
    }

    try {
      const events = await this.persistence.getAllRecentEvents(limit || 200);
      client.send({ type: 'all_events', events });
    } catch (err) {
      console.error('[WebSocket] Failed to fetch all events:', err);
      client.send({ type: 'error', message: 'Failed to fetch events' });
    }
  }

  /**
   * Send event detail to a client
   */
  private async sendEventDetail(
    client: WSClient,
    sessionId: string,
    eventId: string
  ): Promise<void> {
    if (!this.persistence) {
      client.send({ type: 'error', message: 'Persistence not available' });
      return;
    }

    try {
      const event = await this.persistence.getEventById(sessionId, eventId);
      if (event) {
        client.send({ type: 'event_detail', event });
      } else {
        client.send({ type: 'error', message: 'Event not found' });
      }
    } catch (err) {
      console.error('[WebSocket] Failed to fetch event detail:', err);
      client.send({ type: 'error', message: 'Failed to fetch event detail' });
    }
  }

  /**
   * Handle events from the broker
   */
  private handleBrokerEvent(type: BrokerEventType, data: MonitorEvent | SessionMeta | any): void {
    switch (type) {
      case 'event':
        this.broadcastEvent(data as MonitorEvent);
        break;

      case 'session_created':
      case 'session_updated':
      case 'session_ended':
        this.broadcastSessionUpdate(data as SessionMeta);
        break;

      case 'wrapper_connected':
        this.broadcastToAll({
          type: 'wrapper_connected',
          wrapperId: data.wrapperId,
          state: data.state,
        });
        break;

      case 'wrapper_disconnected':
        this.broadcastToAll({
          type: 'wrapper_disconnected',
          wrapperId: data.wrapperId,
          exitCode: data.exitCode,
        });
        break;

      case 'wrapper_state':
        this.broadcastToAll({
          type: 'wrapper_state',
          wrapperId: data.wrapperId,
          state: data.state,
          claudeSessionId: data.claudeSessionId,
        });
        break;

      case 'wrapper_output':
        this.broadcastToAll({
          type: 'wrapper_output',
          wrapperId: data.wrapperId,
          data: data.data,
          timestamp: data.timestamp,
        });
        break;

      case 'wrapper_spawned':
        this.broadcastToAll({
          type: 'wrapper_spawned',
          wrapperId: data.wrapperId,
          success: data.success ?? false,
          error: data.error,
        });
        break;

      case 'wrappers_list':
        this.broadcastToAll({
          type: 'wrappers',
          wrappers: data.wrappers || [],
        });
        break;
    }
  }

  /**
   * Broadcast a message to all connected clients
   */
  private broadcastToAll(message: ServerMessage): void {
    for (const [, client] of this.clients) {
      client.send(message);
    }
  }

  /**
   * Broadcast an event to subscribed clients
   */
  private broadcastEvent(event: MonitorEvent): void {
    for (const [, client] of this.clients) {
      if (this.isClientSubscribed(client, event.sessionId)) {
        client.send({ type: 'event', event });
      }
    }
  }

  /**
   * Broadcast a session update to all clients
   */
  private broadcastSessionUpdate(session: SessionMeta): void {
    const message: ServerMessage = { type: 'session_update', session };
    for (const [, client] of this.clients) {
      // Session updates go to all clients
      client.send(message);
    }
  }

  /**
   * Broadcast updated session list to all clients (for bulk operations)
   */
  private broadcastSessionsUpdate(sessions: SessionMeta[]): void {
    const message: ServerMessage = { type: 'sessions_updated', sessions };
    for (const [, client] of this.clients) {
      // Filter sessions based on client's showHidden preference
      const filteredSessions = sessions.filter(s => client.showHidden || !s.hidden);
      client.send({ type: 'sessions_updated', sessions: filteredSessions });
    }
  }

  /**
   * Check if a client is subscribed to events for a session
   */
  private isClientSubscribed(client: WSClient, sessionId: string): boolean {
    return client.subscription.allSessions || client.subscription.sessionIds.has(sessionId);
  }

  /**
   * Get the number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }
}
