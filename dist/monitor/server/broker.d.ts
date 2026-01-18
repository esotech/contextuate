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
import type { MonitorEvent, SessionMeta, PersistenceStore, MonitorConfig } from '../../types/monitor';
export type BrokerEventType = 'event' | 'session_created' | 'session_updated' | 'session_ended' | 'wrapper_connected' | 'wrapper_disconnected' | 'wrapper_state' | 'wrapper_output' | 'wrapper_spawned' | 'wrappers_list';
export interface WrapperEventData {
    wrapperId?: string;
    state?: string;
    claudeSessionId?: string;
    exitCode?: number;
    data?: string;
    timestamp?: number;
    success?: boolean;
    error?: string;
    wrappers?: Array<{
        wrapperId: string;
        state: string;
        claudeSessionId: string | null;
    }>;
}
export type BrokerHandler = (type: BrokerEventType, data: MonitorEvent | SessionMeta | WrapperEventData) => void | Promise<void>;
export declare class EventBroker {
    private daemonSocket;
    private persistence;
    private handlers;
    private sessions;
    private config;
    private reconnectTimeout;
    private stopping;
    private connectionAttempts;
    constructor(config: MonitorConfig);
    /**
     * Start the event broker
     */
    start(): Promise<void>;
    /**
     * Stop the event broker
     */
    stop(): Promise<void>;
    /**
     * Connect to daemon socket to receive processed events
     */
    private connectToDaemon;
    /**
     * Schedule reconnection to daemon
     */
    private scheduleDaemonReconnect;
    /**
     * Handle message from daemon
     */
    private handleDaemonMessage;
    /**
     * Send a message to the daemon
     */
    sendToDaemon(message: any): void;
    /**
     * Set the persistence store
     */
    setPersistence(store: PersistenceStore): void;
    /**
     * Register an event handler
     */
    onEvent(handler: BrokerHandler): () => void;
    /**
     * Get all active sessions
     */
    getSessions(includeHidden?: boolean): SessionMeta[];
    /**
     * Get a specific session
     */
    getSession(sessionId: string): SessionMeta | undefined;
    /**
     * Persist session to storage
     */
    private persistSession;
    /**
     * Emit event to all handlers
     */
    private emit;
    /**
     * Load existing sessions from persistence (disk)
     */
    loadSessions(): Promise<void>;
    /**
     * Get configuration
     */
    getConfig(): MonitorConfig;
    /**
     * Hide a session (soft-hide, preserves data)
     */
    hideSession(sessionId: string): Promise<void>;
    /**
     * Unhide a session
     */
    unhideSession(sessionId: string): Promise<void>;
    /**
     * Delete a session (permanent removal)
     */
    deleteSession(sessionId: string): Promise<void>;
    /**
     * Hide all sessions
     */
    hideAllSessions(): Promise<void>;
    /**
     * Delete all sessions
     */
    deleteAllSessions(): Promise<void>;
    /**
     * Manually set parent session (user override for grouping)
     */
    setParentSession(sessionId: string, parentSessionId: string | null): Promise<void>;
    /**
     * Toggle session pinned state
     */
    togglePin(sessionId: string): Promise<void>;
    /**
     * Set whether a session is user-initiated
     */
    setUserInitiated(sessionId: string, isUserInitiated: boolean): Promise<void>;
    /**
     * Rename a session (set custom label)
     */
    renameSession(sessionId: string, label: string): Promise<void>;
}
