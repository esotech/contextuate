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

import * as net from 'net';
import type {
  MonitorEvent,
  SessionMeta,
  PersistenceStore,
  MonitorConfig,
} from '../../types/monitor';

export type BrokerEventType =
  | 'event'
  | 'session_created'
  | 'session_updated'
  | 'session_ended';

export type BrokerHandler = (type: BrokerEventType, data: MonitorEvent | SessionMeta) => void | Promise<void>;

export class EventBroker {
  private daemonSocket: net.Socket | null = null;
  private persistence: PersistenceStore | null = null;
  private handlers: Set<BrokerHandler> = new Set();
  private sessions: Map<string, SessionMeta> = new Map();
  private config: MonitorConfig;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(config: MonitorConfig) {
    this.config = config;
  }

  /**
   * Start the event broker
   */
  async start(): Promise<void> {
    // Load sessions from disk
    await this.loadSessions();

    // Connect to daemon socket (optional - daemon may not be running)
    this.connectToDaemon();

    console.log('[Broker] Started - sessions loaded, daemon connection initiated');
  }

  /**
   * Stop the event broker
   */
  async stop(): Promise<void> {
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
  private connectToDaemon(): void {
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
          } catch (err) {
            console.error('[Broker] Failed to parse daemon message:', err);
          }
        }
      }
    });

    this.daemonSocket.on('connect', () => {
      console.log('[Broker] Connected to daemon');
    });

    this.daemonSocket.on('error', (err) => {
      console.log('[Broker] Daemon connection error (daemon may not be running):', err.message);
      this.scheduleDaemonReconnect();
    });

    this.daemonSocket.on('close', () => {
      console.log('[Broker] Daemon connection closed, will retry...');
      this.scheduleDaemonReconnect();
    });
  }

  /**
   * Schedule reconnection to daemon
   */
  private scheduleDaemonReconnect(): void {
    if (this.reconnectTimeout) {
      return;
    }

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connectToDaemon();
    }, 5000);
  }

  /**
   * Handle message from daemon
   */
  private handleDaemonMessage(message: any): void {
    if (message.type === 'session_update') {
      // Update local session cache
      const session = message.session as SessionMeta;
      const isNew = !this.sessions.has(session.sessionId);

      this.sessions.set(session.sessionId, session);

      // Emit to WebSocket clients
      if (isNew) {
        this.emit('session_created', session);
      } else {
        this.emit('session_updated', session);
      }
    } else if (message.eventType) {
      // This is an event from the daemon
      const event = message as MonitorEvent;
      this.emit('event', event);
    }
  }

  /**
   * Set the persistence store
   */
  setPersistence(store: PersistenceStore): void {
    this.persistence = store;
  }

  /**
   * Register an event handler
   */
  onEvent(handler: BrokerHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /**
   * Get all active sessions
   */
  getSessions(includeHidden: boolean = true): SessionMeta[] {
    const sessions = Array.from(this.sessions.values());
    if (includeHidden) {
      return sessions;
    }
    return sessions.filter(session => !session.hidden);
  }

  /**
   * Get a specific session
   */
  getSession(sessionId: string): SessionMeta | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Persist session to storage
   */
  private async persistSession(session: SessionMeta): Promise<void> {
    if (this.persistence) {
      try {
        await this.persistence.saveSession(session);
      } catch (err) {
        console.error('[Broker] Failed to persist session:', err);
      }
    }
  }

  /**
   * Emit event to all handlers
   */
  private emit(type: BrokerEventType, data: MonitorEvent | SessionMeta): void {
    this.handlers.forEach((handler) => {
      try {
        const result = handler(type, data);
        if (result instanceof Promise) {
          result.catch((err) => {
            console.error('[Broker] Handler error:', err);
          });
        }
      } catch (err) {
        console.error('[Broker] Handler error:', err);
      }
    });
  }

  /**
   * Load existing sessions from persistence (disk)
   */
  async loadSessions(): Promise<void> {
    if (this.persistence) {
      try {
        const sessions = await this.persistence.getSessions();
        for (const session of sessions) {
          this.sessions.set(session.sessionId, session);
        }
        console.log(`[Broker] Loaded ${sessions.length} sessions from persistence`);
      } catch (err) {
        console.error('[Broker] Failed to load sessions:', err);
      }
    }
  }

  /**
   * Get configuration
   */
  getConfig(): MonitorConfig {
    return this.config;
  }

  /**
   * Hide a session (soft-hide, preserves data)
   */
  async hideSession(sessionId: string): Promise<void> {
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
  async unhideSession(sessionId: string): Promise<void> {
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
  async deleteSession(sessionId: string): Promise<void> {
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
      } catch (err) {
        console.error('[Broker] Failed to delete session from persistence:', err);
      }
    }

    console.log(`[Broker] Session deleted: ${sessionId.slice(0, 8)}`);
  }

  /**
   * Hide all sessions
   */
  async hideAllSessions(): Promise<void> {
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
  async deleteAllSessions(): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys());

    // Clear memory
    this.sessions.clear();

    // Clear persistence
    if (this.persistence) {
      try {
        await this.persistence.deleteAllSessions();
      } catch (err) {
        console.error('[Broker] Failed to delete all sessions from persistence:', err);
      }
    }

    console.log(`[Broker] All sessions deleted (${sessionIds.length} total)`);
  }

  /**
   * Manually set parent session (user override for grouping)
   */
  async setParentSession(sessionId: string, parentSessionId: string | null): Promise<void> {
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
  async togglePin(sessionId: string): Promise<void> {
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
  async setUserInitiated(sessionId: string, isUserInitiated: boolean): Promise<void> {
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
  async renameSession(sessionId: string, label: string): Promise<void> {
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
