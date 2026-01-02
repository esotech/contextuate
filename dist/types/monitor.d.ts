/**
 * Contextuate Monitor - Type Definitions
 *
 * Shared TypeScript types for the monitor feature.
 * Used by both server and client components.
 */
/**
 * Types of events that can be monitored
 */
export type MonitorEventType = 'session_start' | 'session_end' | 'tool_call' | 'tool_result' | 'tool_error' | 'message' | 'notification' | 'thinking' | 'error' | 'agent_spawn' | 'agent_complete' | 'subagent_start' | 'subagent_stop' | 'user_prompt' | 'pre_compact' | 'permission_request';
/**
 * Claude hook types that trigger events
 */
export type ClaudeHookType = 'SessionStart' | 'SessionEnd' | 'PreToolUse' | 'PostToolUse' | 'PostToolUseFailure' | 'Notification' | 'UserPromptSubmit' | 'Stop' | 'SubagentStart' | 'SubagentStop' | 'PreCompact' | 'PermissionRequest';
/**
 * Token usage metrics
 */
export interface TokenUsage {
    input: number;
    output: number;
    cacheRead?: number;
    cacheWrite?: number;
    /** Cache creation tokens (5-minute ephemeral) */
    cacheCreation5m?: number;
    /** Cache creation tokens (1-hour ephemeral) */
    cacheCreation1h?: number;
}
/**
 * Thinking block from Claude's chain of thought
 */
export interface ThinkingBlock {
    /** The thinking/reasoning content */
    content: string;
    /** Timestamp when this thinking occurred */
    timestamp: number;
    /** Request ID this thinking belongs to */
    requestId?: string;
}
/**
 * Error information in events
 */
export interface EventError {
    code: string;
    message: string;
    stack?: string;
}
/**
 * Subagent information
 */
export interface SubagentInfo {
    type: string;
    prompt: string;
}
/**
 * Data payload for monitor events
 */
export interface EventData {
    toolName?: string;
    toolInput?: unknown;
    toolOutput?: unknown;
    message?: string;
    /** Single thinking content (legacy, for backward compat) */
    thinking?: string;
    /** Array of thinking blocks from the session */
    thinkingBlocks?: ThinkingBlock[];
    tokenUsage?: TokenUsage;
    /** Cumulative token usage for the session */
    sessionTokenUsage?: TokenUsage;
    error?: EventError;
    subagent?: SubagentInfo;
    /** Model used for this interaction */
    model?: string;
    /** Path to the transcript file */
    transcriptPath?: string;
    /** Final assistant response (from transcript parsing) */
    assistantResponse?: string;
}
/**
 * Core monitor event structure
 */
export interface MonitorEvent {
    id: string;
    timestamp: number;
    sessionId: string;
    parentSessionId?: string;
    machineId: string;
    workingDirectory: string;
    eventType: MonitorEventType;
    hookType: ClaudeHookType;
    data: EventData;
}
/**
 * Session status
 */
export type SessionStatus = 'active' | 'completed' | 'error';
/**
 * Session metadata
 */
export interface SessionMeta {
    sessionId: string;
    machineId: string;
    workingDirectory: string;
    startTime: number;
    endTime?: number;
    status: SessionStatus;
    parentSessionId?: string;
    childSessionIds: string[];
    tokenUsage: {
        totalInput: number;
        totalOutput: number;
        totalCacheRead?: number;
        totalCacheCreation?: number;
    };
    hidden?: boolean;
    /** Agent type for sub-agents (e.g., "nexus", "canvas", "archon") */
    agentType?: string;
    /** Whether this session was user-initiated (not spawned by Task tool) */
    isUserInitiated?: boolean;
    /** Whether this session is pinned to the top of the session list */
    isPinned?: boolean;
    /** Manual parent override set by user via UI */
    manualParentSessionId?: string;
    /** Custom label/name set by user */
    label?: string;
    /** Model used in this session */
    model?: string;
    /** Path to the transcript file */
    transcriptPath?: string;
}
/**
 * Monitor mode - local (Unix socket) or distributed (Redis)
 */
export type MonitorMode = 'local' | 'redis';
/**
 * Persistence type
 */
export type PersistenceType = 'file' | 'mysql' | 'postgresql';
/**
 * Server configuration
 */
export interface ServerConfig {
    host: string;
    port: number;
    wsPort: number;
}
/**
 * Redis configuration
 */
export interface RedisConfig {
    host: string;
    port: number;
    password: string | null;
    channel: string;
}
/**
 * Database configuration
 */
export interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
}
/**
 * Persistence configuration
 */
export interface PersistenceConfig {
    enabled: boolean;
    type: PersistenceType;
    database?: DatabaseConfig;
}
/**
 * Complete monitor configuration
 */
export interface MonitorConfig {
    mode: MonitorMode;
    server: ServerConfig;
    redis: RedisConfig;
    persistence: PersistenceConfig;
    socketPath: string;
}
/**
 * Default configuration values
 */
export declare const DEFAULT_CONFIG: MonitorConfig;
/**
 * Get default monitor paths
 *
 * @returns MonitorPaths with all default directory and file paths
 */
export declare function getDefaultMonitorPaths(): MonitorPaths;
/**
 * Client to server message types
 */
export type ClientMessage = {
    type: 'subscribe';
    sessionIds?: string[];
} | {
    type: 'unsubscribe';
    sessionIds: string[];
} | {
    type: 'get_sessions';
} | {
    type: 'get_events';
    sessionId: string;
    limit?: number;
    before?: number;
} | {
    type: 'get_all_recent_events';
    limit?: number;
} | {
    type: 'get_event_detail';
    eventId: string;
    sessionId: string;
} | {
    type: 'send_input';
    sessionId: string;
    input: string;
} | {
    type: 'hide_session';
    sessionId: string;
} | {
    type: 'unhide_session';
    sessionId: string;
} | {
    type: 'delete_session';
    sessionId: string;
} | {
    type: 'hide_all_sessions';
} | {
    type: 'delete_all_sessions';
} | {
    type: 'set_show_hidden';
    showHidden: boolean;
} | {
    type: 'set_parent';
    sessionId: string;
    parentSessionId: string | null;
} | {
    type: 'toggle_pin';
    sessionId: string;
} | {
    type: 'set_user_initiated';
    sessionId: string;
    isUserInitiated: boolean;
} | {
    type: 'rename_session';
    sessionId: string;
    label: string;
};
/**
 * Server to client message types
 */
export type ServerMessage = {
    type: 'sessions';
    sessions: SessionMeta[];
} | {
    type: 'event';
    event: MonitorEvent;
} | {
    type: 'session_update';
    session: SessionMeta;
} | {
    type: 'sessions_updated';
    sessions: SessionMeta[];
} | {
    type: 'events';
    sessionId: string;
    events: MonitorEvent[];
} | {
    type: 'all_events';
    events: MonitorEvent[];
} | {
    type: 'event_detail';
    event: MonitorEvent;
} | {
    type: 'error';
    message: string;
};
/**
 * Event handler callback
 */
export type EventHandler = (event: MonitorEvent) => void | Promise<void>;
/**
 * IPC Adapter interface - implemented by Unix socket and Redis adapters
 */
export interface IPCAdapter {
    /**
     * Start listening for events
     */
    start(): Promise<void>;
    /**
     * Stop listening and cleanup
     */
    stop(): Promise<void>;
    /**
     * Register an event handler
     */
    onEvent(handler: EventHandler): void;
    /**
     * Check if adapter is running
     */
    isRunning(): boolean;
}
/**
 * Persistence store interface
 */
export interface PersistenceStore {
    /**
     * Initialize the store
     */
    init(): Promise<void>;
    /**
     * Close the store
     */
    close(): Promise<void>;
    /**
     * Save an event
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
     * Get a single event by ID
     */
    getEventById(sessionId: string, eventId: string): Promise<MonitorEvent | null>;
    /**
     * Get all recent events across all sessions
     */
    getAllRecentEvents(limit?: number): Promise<MonitorEvent[]>;
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
     * Delete old sessions
     */
    pruneOldSessions(olderThan: number): Promise<number>;
}
/**
 * Claude hook payload structure (received from stdin)
 */
export interface ClaudeHookPayload {
    hook_type: ClaudeHookType;
    session_id?: string;
    /** Path to the transcript JSONL file */
    transcript_path?: string;
    /** Current working directory */
    cwd?: string;
    tool_name?: string;
    tool_input?: unknown;
    tool_output?: unknown;
    message?: string;
    error?: {
        code: string;
        message: string;
    };
    token_usage?: {
        input_tokens: number;
        output_tokens: number;
        cache_read_tokens?: number;
        cache_write_tokens?: number;
    };
    subagent?: {
        type: string;
        prompt: string;
    };
}
/**
 * Hook script response (output to stdout)
 */
export interface HookResponse {
    continue: boolean;
    reason?: string;
}
/**
 * Monitor directory paths
 */
export interface MonitorPaths {
    /** Base directory: ~/.contextuate/monitor */
    baseDir: string;
    /** Configuration file: ~/.contextuate/monitor/config.json */
    configFile: string;
    /** Raw events directory: ~/.contextuate/monitor/raw */
    rawDir: string;
    /** Processed events directory: ~/.contextuate/monitor/processed */
    processedDir: string;
    /** Sessions directory: ~/.contextuate/monitor/sessions */
    sessionsDir: string;
    /** Hooks directory: ~/.contextuate/monitor/hooks */
    hooksDir: string;
    /** Daemon PID file: ~/.contextuate/monitor/daemon.pid */
    daemonPidFile: string;
    /** Daemon log file: ~/.contextuate/monitor/daemon.log */
    daemonLogFile: string;
    /** Daemon state file: ~/.contextuate/monitor/daemon.state.json */
    daemonStateFile: string;
    /** Server PID file: ~/.contextuate/monitor/server.pid */
    serverPidFile: string;
    /** Server log file: ~/.contextuate/monitor/server.log */
    serverLogFile: string;
}
/**
 * Pending subagent spawn information
 */
export interface PendingSubagentSpawn {
    sessionId: string;
    agentType: string;
    timestamp: number;
    prompt: string;
}
/**
 * Active subagent in the stack
 */
export interface ActiveSubagent {
    sessionId: string;
    agentType: string;
    prompt: string;
    startTime: number;
}
/**
 * Daemon state
 */
export interface DaemonState {
    /** Last processed timestamp */
    lastProcessedTimestamp: number;
    /** Pending subagent spawns */
    pendingSubagentSpawns: PendingSubagentSpawn[];
    /** Active subagent stacks by parent session ID */
    activeSubagentStacks: Record<string, ActiveSubagent[]>;
}
/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: E;
};
/**
 * Event subscription
 */
export interface Subscription {
    sessionIds: Set<string>;
    allSessions: boolean;
}
/**
 * WebSocket client with subscription info
 */
export interface WSClient {
    id: string;
    subscription: Subscription;
    showHidden: boolean;
    send: (message: ServerMessage) => void;
}
