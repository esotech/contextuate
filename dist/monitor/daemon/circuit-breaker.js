"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = void 0;
const cron = __importStar(require("node-cron"));
const monitor_js_1 = require("../../types/monitor.js");
/**
 * Circuit Breaker class
 *
 * Monitors session health and takes action when stagnation is detected.
 */
class CircuitBreaker {
    constructor(config, wrapperManager, onAlert) {
        this.sessionHealth = new Map();
        this.cronJob = null;
        this.pendingKills = new Map();
        this.config = { ...monitor_js_1.DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
        this.wrapperManager = wrapperManager;
        this.onAlert = onAlert;
    }
    /**
     * Start the cron-based health monitoring
     */
    start() {
        if (!this.config.enabled) {
            console.log('[CircuitBreaker] Disabled by configuration');
            return;
        }
        console.log(`[CircuitBreaker] Starting health checks: ${this.config.healthCheckInterval}`);
        this.cronJob = cron.schedule(this.config.healthCheckInterval, () => {
            this.runHealthChecks();
        });
    }
    /**
     * Stop health monitoring
     */
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
            console.log('[CircuitBreaker] Stopped health checks');
        }
        // Clear any pending kill timers
        for (const [sessionId, timeout] of this.pendingKills) {
            clearTimeout(timeout);
        }
        this.pendingKills.clear();
    }
    /**
     * Update configuration at runtime
     */
    updateConfig(config) {
        const wasEnabled = this.config.enabled;
        this.config = { ...this.config, ...config };
        // Handle enable/disable changes
        if (!wasEnabled && this.config.enabled) {
            this.start();
        }
        else if (wasEnabled && !this.config.enabled) {
            this.stop();
        }
        // If cron schedule changed, restart
        if (this.cronJob && config.healthCheckInterval) {
            this.stop();
            this.start();
        }
        console.log('[CircuitBreaker] Configuration updated');
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Scheduled health check - runs on cron interval
     */
    runHealthChecks() {
        const now = Date.now();
        for (const [sessionId, health] of this.sessionHealth) {
            // Skip sessions that are already OPEN and have no wrapper
            if (health.state === 'OPEN' && !health.wrapperId)
                continue;
            // Skip sessions that haven't had any events yet
            if (health.totalEvents === 0)
                continue;
            const timeSinceEvent = (now - health.lastEventTime) / 1000;
            const timeSinceProgress = (now - health.lastProgressTime) / 1000;
            const sessionDuration = (now - health.sessionStartTime) / 1000;
            // Check 1: No events at all (process might be hung)
            if (timeSinceEvent > this.config.noEventTimeout) {
                this.transitionState(health, 'OPEN', 'no_events', {
                    message: `No events for ${Math.round(timeSinceEvent)}s`,
                    timeSinceEvent,
                });
                continue;
            }
            // Check 2: No progress (events happening but no file changes)
            if (timeSinceProgress > this.config.noProgressTimeout) {
                if (health.state === 'CLOSED') {
                    this.transitionState(health, 'HALF_OPEN', 'no_progress', {
                        message: `No file changes for ${Math.round(timeSinceProgress)}s`,
                        timeSinceProgress,
                    });
                }
                else if (health.state === 'HALF_OPEN' &&
                    timeSinceProgress > this.config.noProgressTimeout * 1.5) {
                    this.transitionState(health, 'OPEN', 'no_progress_extended', {
                        message: `Still no progress after warning`,
                        timeSinceProgress,
                    });
                }
                continue;
            }
            // Check 3: Session exceeded max duration
            if (sessionDuration > this.config.maxSessionDuration) {
                this.transitionState(health, 'OPEN', 'max_duration', {
                    message: `Session exceeded ${this.config.maxSessionDuration}s limit`,
                    sessionDuration,
                });
                continue;
            }
            // Check 4: Recovery detection - if we were warning but now have progress
            if (health.state === 'HALF_OPEN' &&
                timeSinceProgress < this.config.noProgressTimeout / 2) {
                this.transitionState(health, 'CLOSED', 'recovered', {
                    message: 'Progress detected, circuit recovered',
                });
            }
        }
    }
    /**
     * Process an incoming event (called by EventProcessor)
     */
    processEvent(event, wrapperId) {
        if (!this.config.enabled)
            return;
        const health = this.getOrCreateHealth(event.sessionId, wrapperId);
        const now = Date.now();
        // Update timestamps
        health.lastEventTime = now;
        health.totalEvents++;
        // Track errors
        if (event.eventType === 'tool_error') {
            health.consecutiveErrors++;
            health.totalErrors++;
            health.lastError = event.data.error?.message || 'Unknown error';
            // Immediate check for error threshold
            if (health.consecutiveErrors >= this.config.sameErrorThreshold) {
                this.transitionState(health, 'OPEN', 'error_threshold', {
                    message: `${health.consecutiveErrors} consecutive errors`,
                    lastError: health.lastError,
                });
            }
        }
        else {
            // Reset consecutive errors on successful operation
            health.consecutiveErrors = 0;
        }
        // Track progress (file modifications)
        if (this.isProgressEvent(event)) {
            health.lastProgressTime = now;
            health.loopsSinceProgress = 0;
            health.filesModified++;
            // Cancel any pending kill
            const pendingKill = this.pendingKills.get(event.sessionId);
            if (pendingKill) {
                clearTimeout(pendingKill);
                this.pendingKills.delete(event.sessionId);
            }
            // Auto-recover from HALF_OPEN on progress
            if (health.state === 'HALF_OPEN') {
                this.transitionState(health, 'CLOSED', 'progress_detected', {
                    message: 'File modification detected',
                });
            }
        }
        // Track loop boundaries (Stop events indicate end of a Claude response)
        if (event.hookType === 'Stop') {
            health.loopsSinceProgress++;
            // Loop-based threshold check
            if (health.loopsSinceProgress >= this.config.noProgressLoops) {
                const targetState = health.state === 'CLOSED' ? 'HALF_OPEN' : 'OPEN';
                this.transitionState(health, targetState, 'loop_threshold', {
                    message: `${health.loopsSinceProgress} loops without progress`,
                });
            }
        }
        // Update recommendation based on current state
        health.recommendation = this.getRecommendation(health);
    }
    /**
     * Handle state transitions and take action
     */
    transitionState(health, newState, reason, context) {
        const prevState = health.state;
        if (prevState === newState)
            return;
        console.log(`[CircuitBreaker] ${health.sessionId}: ${prevState} → ${newState} (${reason})`);
        health.state = newState;
        health.recommendation = this.getRecommendation(health);
        // Emit alert for UI
        const alert = {
            sessionId: health.sessionId,
            wrapperId: health.wrapperId,
            previousState: prevState,
            newState,
            reason,
            message: context.message || reason,
            timestamp: Date.now(),
            context,
        };
        this.onAlert(alert);
        // Take action on OPEN
        if (newState === 'OPEN') {
            this.takeAction(health, context);
        }
    }
    /**
     * Take intervention action
     */
    async takeAction(health, context) {
        if (!health.wrapperId) {
            console.log(`[CircuitBreaker] No wrapper for ${health.sessionId}, alert only`);
            return;
        }
        const wrapper = this.wrapperManager.get(health.wrapperId);
        if (!wrapper) {
            console.log(`[CircuitBreaker] Wrapper ${health.wrapperId} not found, alert only`);
            return;
        }
        // Build context-aware prompt
        if (this.config.autoInjectPrompt) {
            const prompt = this.buildInterventionPrompt(health, context);
            console.log(`[CircuitBreaker] Injecting prompt to ${health.wrapperId}`);
            this.wrapperManager.writeInput(health.wrapperId, prompt + '\n');
            // Emit intervention alert
            this.onAlert({
                sessionId: health.sessionId,
                wrapperId: health.wrapperId,
                previousState: health.state,
                newState: health.state,
                reason: 'intervention_sent',
                message: 'Intervention prompt injected',
                timestamp: Date.now(),
                context: { prompt },
            });
            // If autoKill is enabled, schedule a kill after grace period
            if (this.config.autoKill) {
                this.scheduleKill(health, wrapper);
            }
            return;
        }
        // Direct kill without prompt
        if (this.config.autoKill) {
            this.killAndMaybeRestart(health, wrapper);
        }
    }
    /**
     * Schedule a kill after the grace period
     */
    scheduleKill(health, wrapper) {
        // Cancel any existing pending kill
        const existing = this.pendingKills.get(health.sessionId);
        if (existing) {
            clearTimeout(existing);
        }
        console.log(`[CircuitBreaker] Scheduling kill for ${health.wrapperId} in ${this.config.gracePeriodMs}ms`);
        const timeout = setTimeout(() => {
            this.pendingKills.delete(health.sessionId);
            // Check if still in OPEN state (might have recovered)
            const currentHealth = this.sessionHealth.get(health.sessionId);
            if (currentHealth?.state === 'OPEN') {
                this.killAndMaybeRestart(currentHealth, wrapper);
            }
        }, this.config.gracePeriodMs);
        this.pendingKills.set(health.sessionId, timeout);
    }
    /**
     * Build a context-aware intervention prompt
     */
    buildInterventionPrompt(health, context) {
        const base = this.config.stuckPrompt;
        const reason = context.reason;
        // Add context-specific guidance
        if (reason === 'error_threshold') {
            return `${base}\n\nYou've encountered the same error ${health.consecutiveErrors} times: "${health.lastError}"\nConsider: checking your assumptions, trying an alternative method, or asking for clarification.`;
        }
        if (reason === 'no_progress' || reason === 'no_progress_extended') {
            const minutes = Math.round(context.timeSinceProgress / 60);
            return `${base}\n\nNo files have been modified in ${minutes} minutes.\nIf you're researching, that's fine. If you're stuck, please describe the blocker.`;
        }
        if (reason === 'loop_threshold') {
            return `${base}\n\nYou've completed ${health.loopsSinceProgress} iterations without making file changes.\nPlease either make progress on the task or explain what's blocking you.`;
        }
        if (reason === 'no_events') {
            return `${base}\n\nThe session appears to have stalled. Please respond to confirm you're still working.`;
        }
        if (reason === 'max_duration') {
            return `${base}\n\nThis session has been running for a long time. Please summarize your progress and consider wrapping up or continuing in a new session.`;
        }
        return base;
    }
    /**
     * Kill wrapper and optionally restart
     */
    async killAndMaybeRestart(health, wrapper) {
        if (!health.wrapperId)
            return;
        console.log(`[CircuitBreaker] Killing wrapper ${health.wrapperId}`);
        this.wrapperManager.kill(health.wrapperId);
        // Emit kill alert
        this.onAlert({
            sessionId: health.sessionId,
            wrapperId: health.wrapperId,
            previousState: health.state,
            newState: health.state,
            reason: 'session_killed',
            message: 'Session terminated due to stagnation',
            timestamp: Date.now(),
        });
        if (this.config.autoRestart) {
            setTimeout(async () => {
                console.log(`[CircuitBreaker] Restarting wrapper in ${wrapper.cwd}`);
                try {
                    const newId = await this.wrapperManager.spawn({
                        cwd: wrapper.cwd,
                        args: wrapper.args,
                        cols: wrapper.cols,
                        rows: wrapper.rows,
                    });
                    // Emit restart alert
                    this.onAlert({
                        sessionId: health.sessionId,
                        wrapperId: newId,
                        previousState: health.state,
                        newState: 'CLOSED',
                        reason: 'session_restarted',
                        message: `Session restarted with new wrapper ${newId}`,
                        timestamp: Date.now(),
                    });
                    console.log(`[CircuitBreaker] New wrapper: ${newId}`);
                }
                catch (err) {
                    console.error(`[CircuitBreaker] Failed to restart:`, err);
                }
            }, 2000);
        }
    }
    /**
     * Check if event indicates file modification progress
     */
    isProgressEvent(event) {
        if (event.eventType !== 'tool_result')
            return false;
        // File modification tools indicate progress
        const progressTools = [
            'Write',
            'Edit',
            'MultiEdit',
            'NotebookEdit',
            'Bash', // Bash can modify files too
        ];
        const toolName = event.data.toolName || '';
        // Direct match
        if (progressTools.includes(toolName)) {
            // For Bash, only count as progress if it looks like a write operation
            if (toolName === 'Bash') {
                const command = String(event.data.toolInput || '');
                const writePatterns = [
                    /\b(echo|cat|printf)\s+.*>/,
                    /\b(cp|mv|rm|mkdir|touch)\b/,
                    /\bgit\s+(commit|add|push)\b/,
                    /\bnpm\s+(install|update)\b/,
                ];
                return writePatterns.some((p) => p.test(command));
            }
            return true;
        }
        return false;
    }
    /**
     * Get recommendation based on current health state
     */
    getRecommendation(health) {
        switch (health.state) {
            case 'CLOSED':
                return 'continue';
            case 'HALF_OPEN':
                return 'warn';
            case 'OPEN':
                return 'intervene';
            default:
                return 'continue';
        }
    }
    /**
     * Get or create health tracking for a session
     */
    getOrCreateHealth(sessionId, wrapperId) {
        let health = this.sessionHealth.get(sessionId);
        if (!health) {
            const now = Date.now();
            health = {
                sessionId,
                wrapperId,
                state: 'CLOSED',
                lastEventTime: now,
                lastProgressTime: now,
                sessionStartTime: now,
                loopsSinceProgress: 0,
                consecutiveErrors: 0,
                lastError: null,
                totalEvents: 0,
                totalErrors: 0,
                filesModified: 0,
                recommendation: 'continue',
            };
            this.sessionHealth.set(sessionId, health);
        }
        // Update wrapper ID if provided and not set
        if (wrapperId && !health.wrapperId) {
            health.wrapperId = wrapperId;
        }
        return health;
    }
    /**
     * Get health status for all sessions (for UI)
     */
    getAllHealth() {
        return Array.from(this.sessionHealth.values());
    }
    /**
     * Get health for a specific session
     */
    getSessionHealth(sessionId) {
        return this.sessionHealth.get(sessionId);
    }
    /**
     * Reset circuit for a session (manual intervention)
     */
    resetCircuit(sessionId) {
        const health = this.sessionHealth.get(sessionId);
        if (health) {
            const now = Date.now();
            const prevState = health.state;
            health.state = 'CLOSED';
            health.lastProgressTime = now;
            health.loopsSinceProgress = 0;
            health.consecutiveErrors = 0;
            health.recommendation = 'continue';
            // Cancel any pending kill
            const pendingKill = this.pendingKills.get(sessionId);
            if (pendingKill) {
                clearTimeout(pendingKill);
                this.pendingKills.delete(sessionId);
            }
            this.onAlert({
                sessionId,
                wrapperId: health.wrapperId,
                previousState: prevState,
                newState: 'CLOSED',
                reason: 'manual_reset',
                message: 'Circuit manually reset by user',
                timestamp: now,
            });
            console.log(`[CircuitBreaker] Circuit reset for session ${sessionId}`);
        }
    }
    /**
     * Associate a wrapper with a session (called when correlation is detected)
     */
    associateWrapper(sessionId, wrapperId) {
        const health = this.sessionHealth.get(sessionId);
        if (health && !health.wrapperId) {
            health.wrapperId = wrapperId;
            console.log(`[CircuitBreaker] Associated session ${sessionId} with wrapper ${wrapperId}`);
        }
    }
    /**
     * Remove health tracking for a session (on session end)
     */
    removeSession(sessionId) {
        // Cancel any pending kill
        const pendingKill = this.pendingKills.get(sessionId);
        if (pendingKill) {
            clearTimeout(pendingKill);
            this.pendingKills.delete(sessionId);
        }
        this.sessionHealth.delete(sessionId);
    }
    /**
     * Check if circuit breaker is enabled
     */
    isEnabled() {
        return this.config.enabled;
    }
}
exports.CircuitBreaker = CircuitBreaker;
