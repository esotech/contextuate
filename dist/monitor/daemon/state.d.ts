/**
 * Daemon State Management
 *
 * Manages persistent state for the monitor daemon including:
 * - Last processed timestamp (for crash recovery)
 * - Pending subagent spawns (for parent-child correlation)
 * - Active subagent stacks (for virtual session routing)
 */
/**
 * Pending subagent spawn tracking (adjusted to match broker.ts usage)
 */
interface PendingSubagentSpawn {
    parentSessionId: string;
    workingDirectory: string;
    timestamp: number;
    agentType?: string;
}
/**
 * Active subagent in the stack (adjusted to match broker.ts usage)
 */
interface ActiveSubagent {
    virtualSessionId: string;
    parentSessionId: string;
    agentType?: string;
    startTime: number;
}
export declare class StateManager {
    private state;
    private saveInterval;
    constructor();
    /**
     * Load state from disk
     */
    load(): Promise<void>;
    /**
     * Save state to disk
     */
    save(): Promise<void>;
    /**
     * Start periodic state saving
     */
    startPeriodicSave(intervalMs?: number): void;
    /**
     * Stop periodic state saving
     */
    stopPeriodicSave(): void;
    /**
     * Get last processed timestamp
     */
    get lastProcessedTimestamp(): number;
    /**
     * Set last processed timestamp
     */
    set lastProcessedTimestamp(timestamp: number);
    /**
     * Get pending subagent spawns
     */
    get pendingSubagentSpawns(): PendingSubagentSpawn[];
    /**
     * Set pending subagent spawns
     */
    set pendingSubagentSpawns(spawns: PendingSubagentSpawn[]);
    /**
     * Get active subagent stack for a session
     */
    getActiveSubagentStack(sessionId: string): ActiveSubagent[];
    /**
     * Set active subagent stack for a session
     */
    setActiveSubagentStack(sessionId: string, stack: ActiveSubagent[]): void;
    /**
     * Push a new subagent onto the stack for a session
     */
    pushActiveSubagent(sessionId: string, subagent: ActiveSubagent): void;
    /**
     * Pop the top subagent from the stack for a session
     */
    popActiveSubagent(sessionId: string): ActiveSubagent | undefined;
}
export {};
