/**
 * Event Processor
 *
 * Core event processing logic extracted from broker.ts.
 * Handles:
 * - Session correlation (parent-child linking)
 * - Subagent lifecycle tracking
 * - Virtual session routing
 * - Event persistence
 */
import { MonitorEvent } from '../../types/monitor.js';
import { StateManager } from './state.js';
import { Notifier } from './notifier.js';
export declare class EventProcessor {
    private state;
    private notifier;
    private sessions;
    constructor(state: StateManager, notifier: Notifier);
    /**
     * Load existing sessions from disk
     */
    loadSessions(): Promise<void>;
    /**
     * Process a single event
     */
    processEvent(event: MonitorEvent, filepath: string): Promise<void>;
    /**
     * Generate a short unique ID for virtual sessions
     */
    private generateVirtualSessionId;
    /**
     * Start tracking a subagent context when Task tool is called
     */
    private startSubagentContext;
    /**
     * End the current subagent context
     */
    private endSubagentContext;
    /**
     * Extract agent type from Task tool input
     */
    private extractAgentType;
    /**
     * Track potential sub-agent spawns from Task tool calls
     */
    private trackSubagentSpawn;
    /**
     * Update session state based on event
     */
    private updateSession;
    /**
     * Try to correlate a new session with a pending sub-agent spawn
     */
    private correlateParent;
    /**
     * Check if two working directories match (handles git worktrees)
     */
    private directoriesMatch;
    /**
     * Persist session metadata to disk
     */
    private persistSession;
    /**
     * Persist event to session's events.jsonl file
     */
    private persistEvent;
    /**
     * Move processed file from raw/ to processed/
     */
    private moveToProcessed;
}
