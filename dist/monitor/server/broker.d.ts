/**
 * Event Broker
 *
 * Central event routing and distribution system.
 * Receives events from IPC adapters and forwards to:
 * - Persistence layer for storage
 * - WebSocket server for real-time clients
 * - Session manager for state tracking
 */
import type { MonitorEvent, SessionMeta, IPCAdapter, PersistenceStore, MonitorConfig } from '../../types/monitor';
export type BrokerEventType = 'event' | 'session_created' | 'session_updated' | 'session_ended';
export type BrokerHandler = (type: BrokerEventType, data: MonitorEvent | SessionMeta) => void | Promise<void>;
export declare class EventBroker {
    private adapter;
    private persistence;
    private handlers;
    private sessions;
    private config;
    private pendingSubagentSpawns;
    private activeSubagentStack;
    constructor(config: MonitorConfig);
    /**
     * Start the event broker with the configured adapter
     */
    start(): Promise<void>;
    /**
     * Stop the event broker
     */
    stop(): Promise<void>;
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
     * Generate a short unique ID for virtual sessions
     */
    private generateVirtualSessionId;
    /**
     * Handle an incoming event
     */
    private handleEvent;
    /**
     * Start tracking a subagent context when Task tool is called
     */
    private startSubagentContext;
    /**
     * End the current subagent context
     */
    private endSubagentContext;
    /**
     * Get the currently active subagent for a session (top of stack)
     */
    private getActiveSubagent;
    /**
     * Track potential sub-agent spawns from Task tool calls (for external session correlation)
     */
    private trackSubagentSpawn;
    /**
     * Check if two working directories share a common project root
     * Handles git worktrees and different path variations
     */
    private directoriesShareProject;
    /**
     * Try to correlate a new session with a pending sub-agent spawn
     * Returns both parent session ID and agent type if found
     */
    private correlateSubagentSpawn;
    /**
     * Remove stale pending spawns
     */
    private cleanupPendingSpawns;
    /**
     * Update session state based on event
     */
    private updateSession;
    /**
     * Persist session to storage
     */
    private persistSession;
    /**
     * Emit event to all handlers
     */
    private emit;
    /**
     * Load existing sessions from persistence
     */
    loadSessions(): Promise<void>;
    /**
     * Get the IPC adapter
     */
    getAdapter(): IPCAdapter | null;
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
