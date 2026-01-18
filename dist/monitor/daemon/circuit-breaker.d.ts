/**
 * Circuit Breaker
 *
 * Monitors Claude Code sessions for stagnation and takes corrective action.
 * Inspired by Michael Nygard's "Release It!" circuit breaker pattern.
 *
 * States:
 * - CLOSED: Normal operation, progress being made
 * - HALF_OPEN: Warning state, monitoring for recovery
 * - OPEN: Stagnation detected, intervention required
 *
 * Detection methods:
 * - Time-based: No events for X seconds, no progress for Y seconds
 * - Loop-based: N loops without file changes, M consecutive errors
 *
 * Actions:
 * - Alert: Notify UI of state change
 * - Inject prompt: Send "you're stuck" message to Claude
 * - Kill: Terminate the session
 * - Restart: Kill and spawn new session
 */
import type { WrapperManager } from './wrapper-manager.js';
import type { MonitorEvent, CircuitBreakerConfig, SessionHealth, CircuitAlert } from '../../types/monitor.js';
/**
 * Callback for circuit alerts
 */
export type CircuitAlertCallback = (alert: CircuitAlert) => void;
/**
 * Circuit Breaker class
 *
 * Monitors session health and takes action when stagnation is detected.
 */
export declare class CircuitBreaker {
    private config;
    private wrapperManager;
    private sessionHealth;
    private cronJob;
    private onAlert;
    private pendingKills;
    constructor(config: Partial<CircuitBreakerConfig>, wrapperManager: WrapperManager, onAlert: CircuitAlertCallback);
    /**
     * Start the cron-based health monitoring
     */
    start(): void;
    /**
     * Stop health monitoring
     */
    stop(): void;
    /**
     * Update configuration at runtime
     */
    updateConfig(config: Partial<CircuitBreakerConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): CircuitBreakerConfig;
    /**
     * Scheduled health check - runs on cron interval
     */
    private runHealthChecks;
    /**
     * Process an incoming event (called by EventProcessor)
     */
    processEvent(event: MonitorEvent, wrapperId: string | null): void;
    /**
     * Handle state transitions and take action
     */
    private transitionState;
    /**
     * Take intervention action
     */
    private takeAction;
    /**
     * Schedule a kill after the grace period
     */
    private scheduleKill;
    /**
     * Build a context-aware intervention prompt
     */
    private buildInterventionPrompt;
    /**
     * Kill wrapper and optionally restart
     */
    private killAndMaybeRestart;
    /**
     * Check if event indicates file modification progress
     */
    private isProgressEvent;
    /**
     * Get recommendation based on current health state
     */
    private getRecommendation;
    /**
     * Get or create health tracking for a session
     */
    private getOrCreateHealth;
    /**
     * Get health status for all sessions (for UI)
     */
    getAllHealth(): SessionHealth[];
    /**
     * Get health for a specific session
     */
    getSessionHealth(sessionId: string): SessionHealth | undefined;
    /**
     * Reset circuit for a session (manual intervention)
     */
    resetCircuit(sessionId: string): void;
    /**
     * Associate a wrapper with a session (called when correlation is detected)
     */
    associateWrapper(sessionId: string, wrapperId: string): void;
    /**
     * Remove health tracking for a session (on session end)
     */
    removeSession(sessionId: string): void;
    /**
     * Check if circuit breaker is enabled
     */
    isEnabled(): boolean;
}
