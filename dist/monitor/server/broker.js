"use strict";
/**
 * Event Broker
 *
 * Central event routing and distribution system.
 * Receives events from IPC adapters and forwards to:
 * - Persistence layer for storage
 * - WebSocket server for real-time clients
 * - Session manager for state tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBroker = void 0;
const unix_socket_1 = require("./adapters/unix-socket");
const redis_1 = require("./adapters/redis");
// Time window for correlating sub-agent spawns (30 seconds for better reliability)
const SUBAGENT_CORRELATION_WINDOW_MS = 30000;
class EventBroker {
    constructor(config) {
        this.adapter = null;
        this.persistence = null;
        this.handlers = new Set();
        this.sessions = new Map();
        // Track pending sub-agent spawns for correlation
        this.pendingSubagentSpawns = [];
        // Track active subagents per session (stack to handle nested subagents)
        // Key: original sessionId from Claude, Value: stack of active subagent contexts
        this.activeSubagentStack = new Map();
        this.config = config;
    }
    /**
     * Start the event broker with the configured adapter
     */
    async start() {
        // Create appropriate adapter based on mode
        if (this.config.mode === 'redis') {
            this.adapter = new redis_1.RedisAdapter({ config: this.config.redis });
        }
        else {
            this.adapter = new unix_socket_1.UnixSocketAdapter({ socketPath: this.config.socketPath });
        }
        // Register event handler
        this.adapter.onEvent((event) => this.handleEvent(event));
        // Start the adapter
        await this.adapter.start();
        console.log(`[Broker] Started in ${this.config.mode} mode`);
    }
    /**
     * Stop the event broker
     */
    async stop() {
        if (this.adapter) {
            await this.adapter.stop();
            this.adapter = null;
        }
        console.log('[Broker] Stopped');
    }
    /**
     * Set the persistence store
     */
    setPersistence(store) {
        this.persistence = store;
    }
    /**
     * Register an event handler
     */
    onEvent(handler) {
        this.handlers.add(handler);
        return () => this.handlers.delete(handler);
    }
    /**
     * Get all active sessions
     */
    getSessions(includeHidden = true) {
        const sessions = Array.from(this.sessions.values());
        if (includeHidden) {
            return sessions;
        }
        return sessions.filter(session => !session.hidden);
    }
    /**
     * Get a specific session
     */
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    /**
     * Generate a short unique ID for virtual sessions
     */
    generateVirtualSessionId() {
        const chars = 'abcdef0123456789';
        let id = '';
        for (let i = 0; i < 8; i++) {
            id += chars[Math.floor(Math.random() * chars.length)];
        }
        return id;
    }
    /**
     * Handle an incoming event
     */
    async handleEvent(event) {
        const originalSessionId = event.sessionId;
        // Handle subagent lifecycle events
        if (event.hookType === 'PreToolUse' && event.data.toolName === 'Task') {
            // Task tool call - start tracking a new subagent
            this.startSubagentContext(event);
        }
        else if (event.hookType === 'SubagentStop') {
            // Subagent finished - end the virtual child session
            this.endSubagentContext(event);
        }
        else if (event.hookType !== 'PostToolUse' || event.data.toolName !== 'Task') {
            // Regular event - check if we should route to active subagent
            // (Exclude PostToolUse Task as that belongs to the parent)
            const activeSubagent = this.getActiveSubagent(originalSessionId);
            if (activeSubagent) {
                // Route this event to the virtual child session
                // Set parentSessionId to link it back to the original parent
                event = {
                    ...event,
                    sessionId: activeSubagent.virtualSessionId,
                    parentSessionId: activeSubagent.parentSessionId,
                };
            }
        }
        // Track pending spawns for external session correlation (different CLI instances)
        this.trackSubagentSpawn(event);
        // Update session state
        await this.updateSession(event);
        // Persist the event
        if (this.persistence) {
            try {
                await this.persistence.saveEvent(event);
            }
            catch (err) {
                console.error('[Broker] Failed to persist event:', err);
            }
        }
        // Emit to handlers (WebSocket, etc.)
        this.emit('event', event);
    }
    /**
     * Start tracking a subagent context when Task tool is called
     */
    startSubagentContext(event) {
        const toolInput = event.data.toolInput;
        const agentType = toolInput?.subagent_type;
        // Create a virtual session ID for this subagent
        const virtualSessionId = this.generateVirtualSessionId();
        // Get or create the stack for this session
        let stack = this.activeSubagentStack.get(event.sessionId);
        if (!stack) {
            stack = [];
            this.activeSubagentStack.set(event.sessionId, stack);
        }
        // Push the new subagent context
        stack.push({
            virtualSessionId,
            parentSessionId: event.sessionId,
            agentType,
            startTime: event.timestamp,
        });
        console.log(`[Broker] Subagent started: ${virtualSessionId} (type: ${agentType || 'unknown'}) under ${event.sessionId}`);
    }
    /**
     * End the current subagent context
     */
    endSubagentContext(event) {
        const stack = this.activeSubagentStack.get(event.sessionId);
        if (stack && stack.length > 0) {
            const ended = stack.pop();
            if (ended) {
                // Mark the virtual session as completed
                const session = this.sessions.get(ended.virtualSessionId);
                if (session) {
                    session.status = 'completed';
                    session.endTime = event.timestamp;
                    this.emit('session_updated', session);
                    // Persist the update
                    if (this.persistence) {
                        this.persistence.saveSession(session).catch(err => {
                            console.error('[Broker] Failed to persist session update:', err);
                        });
                    }
                }
                console.log(`[Broker] Subagent ended: ${ended.virtualSessionId}`);
            }
            // Clean up empty stack
            if (stack.length === 0) {
                this.activeSubagentStack.delete(event.sessionId);
            }
        }
    }
    /**
     * Get the currently active subagent for a session (top of stack)
     */
    getActiveSubagent(sessionId) {
        const stack = this.activeSubagentStack.get(sessionId);
        if (stack && stack.length > 0) {
            return stack[stack.length - 1];
        }
        return undefined;
    }
    /**
     * Track potential sub-agent spawns from Task tool calls (for external session correlation)
     */
    trackSubagentSpawn(event) {
        // Detect Task tool PreToolUse events
        if (event.hookType === 'PreToolUse' &&
            event.data.toolName === 'Task') {
            const toolInput = event.data.toolInput;
            this.pendingSubagentSpawns.push({
                parentSessionId: event.sessionId,
                workingDirectory: event.workingDirectory,
                timestamp: event.timestamp,
                agentType: toolInput?.subagent_type,
            });
            // Clean up old pending spawns (older than correlation window)
            this.cleanupPendingSpawns();
        }
    }
    /**
     * Check if two working directories share a common project root
     * Handles git worktrees and different path variations
     */
    directoriesShareProject(dir1, dir2) {
        // Normalize paths
        const norm1 = dir1.replace(/\\/g, '/').replace(/\/+$/, '');
        const norm2 = dir2.replace(/\\/g, '/').replace(/\/+$/, '');
        // Exact match
        if (norm1 === norm2)
            return true;
        // Check if one is parent of the other
        if (norm1.startsWith(norm2 + '/') || norm2.startsWith(norm1 + '/'))
            return true;
        // Check for common parent (worktree scenario)
        const parent1 = norm1.split('/').slice(0, -1).join('/');
        const parent2 = norm2.split('/').slice(0, -1).join('/');
        if (parent1 === parent2)
            return true;
        // Check for shared ancestor up to 3 levels up
        const parts1 = norm1.split('/');
        const parts2 = norm2.split('/');
        const minLength = Math.min(parts1.length, parts2.length);
        // Find common prefix depth (at least 3 levels like /home/user/project)
        for (let i = Math.min(minLength, parts1.length - 3); i >= 3; i--) {
            const prefix1 = parts1.slice(0, i).join('/');
            const prefix2 = parts2.slice(0, i).join('/');
            if (prefix1 === prefix2)
                return true;
        }
        return false;
    }
    /**
     * Try to correlate a new session with a pending sub-agent spawn
     * Returns both parent session ID and agent type if found
     */
    correlateSubagentSpawn(newSessionId, workingDirectory, timestamp) {
        // Clean up old entries first
        this.cleanupPendingSpawns();
        // Find a matching pending spawn using fuzzy directory matching
        const matchIndex = this.pendingSubagentSpawns.findIndex((spawn) => {
            // Use fuzzy directory matching (handles worktrees, symlinks, etc.)
            if (!this.directoriesShareProject(spawn.workingDirectory, workingDirectory))
                return false;
            // Must be within the correlation window
            if (timestamp - spawn.timestamp > SUBAGENT_CORRELATION_WINDOW_MS)
                return false;
            // Must not already be the same session
            if (spawn.parentSessionId === newSessionId)
                return false;
            return true;
        });
        if (matchIndex >= 0) {
            const spawn = this.pendingSubagentSpawns[matchIndex];
            // Remove the matched spawn
            this.pendingSubagentSpawns.splice(matchIndex, 1);
            return {
                parentSessionId: spawn.parentSessionId,
                agentType: spawn.agentType,
            };
        }
        return undefined;
    }
    /**
     * Remove stale pending spawns
     */
    cleanupPendingSpawns() {
        const now = Date.now();
        this.pendingSubagentSpawns = this.pendingSubagentSpawns.filter((spawn) => now - spawn.timestamp < SUBAGENT_CORRELATION_WINDOW_MS * 2);
    }
    /**
     * Update session state based on event
     */
    async updateSession(event) {
        let session = this.sessions.get(event.sessionId);
        let isNew = false;
        if (!session) {
            // Create new session
            isNew = true;
            // Try to determine parent session and agent type
            // 1. Check if this is a virtual session from active subagent tracking
            // 2. Use explicit parentSessionId from event if available
            // 3. Otherwise, try to correlate with recent Task tool calls
            let parentSessionId = event.parentSessionId;
            let agentType;
            // Check if this session ID matches an active subagent (virtual session)
            for (const [origSessionId, stack] of this.activeSubagentStack.entries()) {
                const activeSubagent = stack.find(s => s.virtualSessionId === event.sessionId);
                if (activeSubagent) {
                    parentSessionId = activeSubagent.parentSessionId;
                    agentType = activeSubagent.agentType;
                    break;
                }
            }
            if (!parentSessionId) {
                const correlation = this.correlateSubagentSpawn(event.sessionId, event.workingDirectory, event.timestamp);
                if (correlation) {
                    parentSessionId = correlation.parentSessionId;
                    agentType = correlation.agentType;
                }
            }
            // Session is user-initiated if it has no parent (not spawned by Task tool)
            const isUserInitiated = !parentSessionId;
            session = {
                sessionId: event.sessionId,
                machineId: event.machineId,
                workingDirectory: event.workingDirectory,
                startTime: event.timestamp,
                status: 'active',
                parentSessionId: parentSessionId,
                agentType: agentType,
                childSessionIds: [],
                tokenUsage: {
                    totalInput: 0,
                    totalOutput: 0,
                },
                isUserInitiated: isUserInitiated,
                isPinned: isUserInitiated, // Auto-pin user-initiated sessions
            };
            // Add to parent's child list if applicable
            if (parentSessionId) {
                const parent = this.sessions.get(parentSessionId);
                if (parent && !parent.childSessionIds.includes(event.sessionId)) {
                    parent.childSessionIds.push(event.sessionId);
                    await this.persistSession(parent);
                    this.emit('session_updated', parent);
                    console.log(`[Broker] Linked session ${event.sessionId.slice(0, 8)} as child of ${parentSessionId.slice(0, 8)}`);
                }
            }
            this.sessions.set(event.sessionId, session);
        }
        // Update session based on event type
        switch (event.eventType) {
            case 'session_start':
                session.status = 'active';
                break;
            case 'session_end':
            case 'agent_complete':
                session.status = 'completed';
                session.endTime = event.timestamp;
                // Use session token usage from transcript parsing (most accurate)
                if (event.data.sessionTokenUsage) {
                    session.tokenUsage = {
                        totalInput: event.data.sessionTokenUsage.input || 0,
                        totalOutput: event.data.sessionTokenUsage.output || 0,
                        totalCacheRead: event.data.sessionTokenUsage.cacheRead || 0,
                        totalCacheCreation: (event.data.sessionTokenUsage.cacheCreation5m || 0) +
                            (event.data.sessionTokenUsage.cacheCreation1h || 0),
                    };
                }
                // Store model and transcript path
                if (event.data.model) {
                    session.model = event.data.model;
                }
                if (event.data.transcriptPath) {
                    session.transcriptPath = event.data.transcriptPath;
                }
                break;
            case 'error':
                if (event.data.error) {
                    session.status = 'error';
                }
                break;
            case 'agent_spawn':
                // Parent session spawned a child
                if (event.data.subagent) {
                    // Child session will be created when it starts sending events
                }
                break;
            default:
                // Update activity timestamp
                break;
        }
        // Update token usage
        if (event.data.tokenUsage) {
            session.tokenUsage.totalInput += event.data.tokenUsage.input || 0;
            session.tokenUsage.totalOutput += event.data.tokenUsage.output || 0;
        }
        // Persist session
        await this.persistSession(session);
        // Emit appropriate event
        if (isNew) {
            this.emit('session_created', session);
        }
        else {
            this.emit('session_updated', session);
        }
    }
    /**
     * Persist session to storage
     */
    async persistSession(session) {
        if (this.persistence) {
            try {
                await this.persistence.saveSession(session);
            }
            catch (err) {
                console.error('[Broker] Failed to persist session:', err);
            }
        }
    }
    /**
     * Emit event to all handlers
     */
    emit(type, data) {
        for (const handler of this.handlers) {
            try {
                const result = handler(type, data);
                if (result instanceof Promise) {
                    result.catch((err) => {
                        console.error('[Broker] Handler error:', err);
                    });
                }
            }
            catch (err) {
                console.error('[Broker] Handler error:', err);
            }
        }
    }
    /**
     * Load existing sessions from persistence
     */
    async loadSessions() {
        if (!this.persistence) {
            return;
        }
        try {
            const sessions = await this.persistence.getSessions();
            for (const session of sessions) {
                this.sessions.set(session.sessionId, session);
            }
            console.log(`[Broker] Loaded ${sessions.length} sessions from persistence`);
        }
        catch (err) {
            console.error('[Broker] Failed to load sessions:', err);
        }
    }
    /**
     * Get the IPC adapter
     */
    getAdapter() {
        return this.adapter;
    }
    /**
     * Get configuration
     */
    getConfig() {
        return this.config;
    }
    /**
     * Hide a session (soft-hide, preserves data)
     */
    async hideSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        session.hidden = true;
        await this.persistSession(session);
        this.emit('session_updated', session);
        console.log(`[Broker] Session hidden: ${sessionId.slice(0, 8)}`);
    }
    /**
     * Unhide a session
     */
    async unhideSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        session.hidden = false;
        await this.persistSession(session);
        this.emit('session_updated', session);
        console.log(`[Broker] Session unhidden: ${sessionId.slice(0, 8)}`);
    }
    /**
     * Delete a session (permanent removal)
     */
    async deleteSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        // Remove from parent's child list if applicable
        if (session.parentSessionId) {
            const parent = this.sessions.get(session.parentSessionId);
            if (parent) {
                parent.childSessionIds = parent.childSessionIds.filter(id => id !== sessionId);
                await this.persistSession(parent);
                this.emit('session_updated', parent);
            }
        }
        // Remove from memory
        this.sessions.delete(sessionId);
        // Remove from persistence
        if (this.persistence) {
            try {
                await this.persistence.deleteSession(sessionId);
            }
            catch (err) {
                console.error('[Broker] Failed to delete session from persistence:', err);
            }
        }
        console.log(`[Broker] Session deleted: ${sessionId.slice(0, 8)}`);
    }
    /**
     * Hide all sessions
     */
    async hideAllSessions() {
        const sessions = Array.from(this.sessions.values());
        for (const session of sessions) {
            session.hidden = true;
            await this.persistSession(session);
        }
        console.log(`[Broker] All sessions hidden (${sessions.length} total)`);
    }
    /**
     * Delete all sessions
     */
    async deleteAllSessions() {
        const sessionIds = Array.from(this.sessions.keys());
        // Clear memory
        this.sessions.clear();
        // Clear persistence
        if (this.persistence) {
            try {
                await this.persistence.deleteAllSessions();
            }
            catch (err) {
                console.error('[Broker] Failed to delete all sessions from persistence:', err);
            }
        }
        console.log(`[Broker] All sessions deleted (${sessionIds.length} total)`);
    }
    /**
     * Manually set parent session (user override for grouping)
     */
    async setParentSession(sessionId, parentSessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        // Remove from old parent's child list
        if (session.parentSessionId) {
            const oldParent = this.sessions.get(session.parentSessionId);
            if (oldParent) {
                oldParent.childSessionIds = oldParent.childSessionIds.filter(id => id !== sessionId);
                await this.persistSession(oldParent);
                this.emit('session_updated', oldParent);
            }
        }
        // Update session's parent
        session.parentSessionId = parentSessionId || undefined;
        session.manualParentSessionId = parentSessionId || undefined;
        session.isUserInitiated = !parentSessionId; // No parent = user-initiated
        // Add to new parent's child list
        if (parentSessionId) {
            const newParent = this.sessions.get(parentSessionId);
            if (newParent && !newParent.childSessionIds.includes(sessionId)) {
                newParent.childSessionIds.push(sessionId);
                await this.persistSession(newParent);
                this.emit('session_updated', newParent);
            }
        }
        await this.persistSession(session);
        this.emit('session_updated', session);
        console.log(`[Broker] Session ${sessionId.slice(0, 8)} parent set to ${parentSessionId?.slice(0, 8) || 'none'}`);
    }
    /**
     * Toggle session pinned state
     */
    async togglePin(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        session.isPinned = !session.isPinned;
        await this.persistSession(session);
        this.emit('session_updated', session);
        console.log(`[Broker] Session ${sessionId.slice(0, 8)} ${session.isPinned ? 'pinned' : 'unpinned'}`);
    }
    /**
     * Set whether a session is user-initiated
     */
    async setUserInitiated(sessionId, isUserInitiated) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        session.isUserInitiated = isUserInitiated;
        await this.persistSession(session);
        this.emit('session_updated', session);
        console.log(`[Broker] Session ${sessionId.slice(0, 8)} marked as ${isUserInitiated ? 'user-initiated' : 'sub-agent'}`);
    }
    /**
     * Rename a session (set custom label)
     */
    async renameSession(sessionId, label) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        // Empty string clears the label
        session.label = label.trim() || undefined;
        await this.persistSession(session);
        this.emit('session_updated', session);
        console.log(`[Broker] Session ${sessionId.slice(0, 8)} renamed to "${session.label || '(cleared)'}"`);
    }
}
exports.EventBroker = EventBroker;
