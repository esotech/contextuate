/**
 * File-based Persistence Store
 *
 * Stores session data and events in JSON files.
 * Uses JSON Lines format for event logs (one JSON object per line).
 */
import type { PersistenceStore, MonitorEvent, SessionMeta, SessionStatus } from '../../types/monitor';
export interface FileStoreOptions {
    baseDir?: string;
}
export declare class FileStore implements PersistenceStore {
    private paths;
    private baseDir;
    private sessionsDir;
    private processedDir;
    constructor(options?: FileStoreOptions);
    /**
     * Initialize the store - create directories if needed
     */
    init(): Promise<void>;
    /**
     * Close the store (no-op for file store)
     */
    close(): Promise<void>;
    /**
     * Save an event to the session's event log
     */
    saveEvent(event: MonitorEvent): Promise<void>;
    /**
     * Get events for a session
     */
    getEvents(sessionId: string, options?: {
        limit?: number;
        before?: number;
        after?: number;
    }): Promise<MonitorEvent[]>;
    /**
     * Save session metadata
     */
    saveSession(session: SessionMeta): Promise<void>;
    /**
     * Get session metadata
     */
    getSession(sessionId: string): Promise<SessionMeta | null>;
    /**
     * Get all sessions
     */
    getSessions(options?: {
        status?: SessionStatus;
        limit?: number;
    }): Promise<SessionMeta[]>;
    /**
     * Update session metadata
     */
    updateSession(sessionId: string, updates: Partial<SessionMeta>): Promise<void>;
    /**
     * Delete a session
     */
    deleteSession(sessionId: string): Promise<void>;
    /**
     * Delete all sessions
     */
    deleteAllSessions(): Promise<void>;
    /**
     * Get all recent events across all sessions
     */
    getAllRecentEvents(limit?: number): Promise<MonitorEvent[]>;
    /**
     * Delete old sessions
     */
    pruneOldSessions(olderThan: number): Promise<number>;
    /**
     * Get event count for a session
     */
    getEventCount(sessionId: string): Promise<number>;
    /**
     * Get the base directory path
     */
    getBaseDir(): string;
    /**
     * Get list of processed event files (for recovery)
     */
    getProcessedFiles(): Promise<string[]>;
}
