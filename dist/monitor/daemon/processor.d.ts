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
import type { CircuitBreaker } from './circuit-breaker.js';
export declare class EventProcessor {
    private state;
    private notifier;
    private sessions;
    private circuitBreaker;
    constructor(state: StateManager, notifier: Notifier);
    /**
     * Set the circuit breaker instance for health monitoring
     */
    setCircuitBreaker(circuitBreaker: CircuitBreaker): void;
    /**
     * Load existing sessions from disk
     */
    loadSessions(): Promise<void>;
    private processedEventIds;
    /**
     * Process a single event
     * @param event The event to process
     * @param filepath The source file path (null if from socket)
     */
    processEvent(event: MonitorEvent, filepath: string | null): Promise<void>;
    /**
     * Find wrapper ID associated with a session (for circuit breaker)
     * This is a placeholder - the daemon will provide better association
     */
    private findWrapperForSession;
    /**
     * Handle SubagentStart event - create child session immediately
     */
    private handleSubagentStart;
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
