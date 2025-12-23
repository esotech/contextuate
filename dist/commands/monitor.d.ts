/**
 * Monitor Command
 *
 * CLI commands for the Contextuate Monitor feature.
 * - contextuate monitor init: Interactive setup
 * - contextuate monitor [start]: Start the monitor server
 * - contextuate monitor status: Show server status
 */
/**
 * Initialize monitor command
 */
export declare function monitorInitCommand(): Promise<void>;
/**
 * Start monitor server command
 */
export declare function monitorStartCommand(options: {
    port?: number;
    wsPort?: number;
    noOpen?: boolean;
}): Promise<void>;
/**
 * Stop monitor server command
 */
export declare function monitorStopCommand(options: {
    all?: boolean;
}): Promise<void>;
/**
 * Show monitor status command
 */
export declare function monitorStatusCommand(): Promise<void>;
/**
 * Start daemon command
 */
export declare function monitorDaemonStartCommand(options: {
    detach?: boolean;
}): Promise<void>;
/**
 * Stop daemon command
 */
export declare function monitorDaemonStopCommand(): Promise<void>;
/**
 * Show daemon status command
 */
export declare function monitorDaemonStatusCommand(): Promise<void>;
/**
 * View daemon logs command
 */
export declare function monitorDaemonLogsCommand(options: {
    follow?: boolean;
    lines?: number;
}): Promise<void>;
