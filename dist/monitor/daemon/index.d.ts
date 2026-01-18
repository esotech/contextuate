/**
 * Monitor Daemon
 *
 * Background daemon process that:
 * - Watches raw/ directory for new events
 * - Processes events (correlates sessions, tracks subagents)
 * - Persists data to sessions/
 * - Notifies UI server via Unix socket/Redis
 * - Manages Claude wrapper sessions with PTY
 *
 * This is Layer 2 of the 3-layer architecture:
 * Layer 1: Hooks (write to raw/)
 * Layer 2: Daemon (process raw/ -> sessions/)
 * Layer 3: UI Server (read from sessions/, serve WebSocket)
 */
import { MonitorConfig, CircuitBreakerConfig } from '../../types/monitor.js';
import { CircuitBreaker } from './circuit-breaker.js';
export declare class MonitorDaemon {
    private config;
    private state;
    private watcher;
    private processor;
    private notifier;
    private socketServer;
    private uiClients;
    private legacyWrapperSessions;
    private wrapperManager;
    private circuitBreaker;
    private running;
    constructor(config: MonitorConfig, circuitBreakerConfig?: Partial<CircuitBreakerConfig>);
    /**
     * Handle circuit breaker alerts
     */
    private handleCircuitAlert;
    /**
     * Handle events from WrapperManager
     */
    private handleWrapperManagerEvent;
    /**
     * Broadcast data to all connected UI clients
     */
    private broadcastToClients;
    /**
     * Start the daemon
     */
    start(): Promise<void>;
    /**
     * Stop the daemon
     */
    stop(): Promise<void>;
    /**
     * Check if daemon is running
     */
    isRunning(): boolean;
    /**
     * Start Unix socket server for hook notifications and UI clients
     */
    private startSocketServer;
    /**
     * Handle wrapper registration (legacy external wrapper process)
     */
    private handleWrapperRegister;
    /**
     * Handle wrapper started notification (legacy)
     */
    private handleWrapperStarted;
    /**
     * Handle wrapper ended notification (legacy)
     */
    private handleWrapperEnded;
    /**
     * Handle wrapper state change (legacy)
     */
    private handleWrapperStateChange;
    /**
     * Handle wrapper output (for legacy external wrappers)
     */
    private handleWrapperOutput;
    /**
     * Handle input injection request from UI
     */
    private handleInputInjection;
    /**
     * Handle resize request from UI
     */
    private handleWrapperResize;
    /**
     * Handle spawn wrapper request
     */
    private handleSpawnWrapper;
    /**
     * Handle kill wrapper request
     */
    private handleKillWrapper;
    /**
     * Handle get wrappers request
     */
    private handleGetWrappers;
    /**
     * Check if a hook event indicates waiting for input
     * and notify relevant wrapper
     */
    private checkAndNotifyWrapperState;
    /**
     * Handle get circuit health request
     */
    private handleGetCircuitHealth;
    /**
     * Handle get session health request
     */
    private handleGetSessionHealth;
    /**
     * Handle reset circuit request
     */
    private handleResetCircuit;
    /**
     * Handle update circuit config request
     */
    private handleUpdateCircuitConfig;
    /**
     * Get the circuit breaker instance (for external access)
     */
    getCircuitBreaker(): CircuitBreaker;
    /**
     * Get list of active wrapper sessions (for UI)
     */
    getWrapperSessions(): Array<{
        wrapperId: string;
        state: string;
        claudeSessionId: string | null;
        managed: boolean;
    }>;
}
/**
 * Start the daemon (exported for CLI)
 */
export declare function startDaemon(config: MonitorConfig): Promise<MonitorDaemon>;
