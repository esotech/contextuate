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

import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';
import {
  MonitorConfig,
  getDefaultMonitorPaths,
  CircuitBreakerConfig,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from '../../types/monitor.js';
import { StateManager } from './state.js';
import { FileWatcher } from './watcher.js';
import { EventProcessor } from './processor.js';
import { Notifier } from './notifier.js';
import { WrapperManager } from './wrapper-manager.js';
import { CircuitBreaker } from './circuit-breaker.js';

const PATHS = getDefaultMonitorPaths();

// Legacy wrapper session info (for external wrapper processes)
interface LegacyWrapperSession {
  wrapperId: string;
  socket: net.Socket;
  pid: number;
  claudeSessionId: string | null;
  state: 'starting' | 'processing' | 'waiting_input' | 'ended';
  cwd: string;
  startTime: number;
}

export class MonitorDaemon {
  private config: MonitorConfig;
  private state: StateManager;
  private watcher: FileWatcher;
  private processor: EventProcessor;
  private notifier: Notifier;
  private socketServer: net.Server | null = null;
  private uiClients: Set<net.Socket> = new Set();
  private legacyWrapperSessions: Map<string, LegacyWrapperSession> = new Map();
  private wrapperManager: WrapperManager;
  private circuitBreaker: CircuitBreaker;
  private running = false;

  constructor(config: MonitorConfig, circuitBreakerConfig?: Partial<CircuitBreakerConfig>) {
    this.config = config;
    this.state = new StateManager();
    this.notifier = new Notifier(config, (data) => this.broadcastToClients(data));
    this.processor = new EventProcessor(this.state, this.notifier);
    this.watcher = new FileWatcher();

    // Initialize wrapper manager
    const wrapperPersistPath = path.join(PATHS.baseDir, 'wrappers.json');
    this.wrapperManager = new WrapperManager(wrapperPersistPath, (event) => {
      this.handleWrapperManagerEvent(event);
    });

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker(
      circuitBreakerConfig || {},
      this.wrapperManager,
      (alert) => this.handleCircuitAlert(alert)
    );

    // Connect event processor to circuit breaker
    this.processor.setCircuitBreaker(this.circuitBreaker);
  }

  /**
   * Handle circuit breaker alerts
   */
  private handleCircuitAlert(alert: any): void {
    console.log(`[Daemon] Circuit alert: ${alert.sessionId} ${alert.previousState} → ${alert.newState} (${alert.reason})`);
    this.broadcastToClients({
      type: 'circuit_alert',
      alert,
    });
  }

  /**
   * Handle events from WrapperManager
   */
  private handleWrapperManagerEvent(event: {
    type: 'output' | 'state_changed' | 'started' | 'ended';
    wrapperId: string;
    data?: string;
    state?: string;
    claudeSessionId?: string;
    exitCode?: number;
  }): void {
    switch (event.type) {
      case 'output':
        this.broadcastToClients({
          type: 'wrapper_output',
          wrapperId: event.wrapperId,
          data: event.data,
          timestamp: Date.now(),
        });
        break;

      case 'state_changed':
        this.broadcastToClients({
          type: 'wrapper_state',
          wrapperId: event.wrapperId,
          state: event.state,
          claudeSessionId: event.claudeSessionId,
        });
        break;

      case 'started':
        this.broadcastToClients({
          type: 'wrapper_connected',
          wrapperId: event.wrapperId,
          state: event.state || 'starting',
        });
        break;

      case 'ended':
        this.broadcastToClients({
          type: 'wrapper_disconnected',
          wrapperId: event.wrapperId,
          exitCode: event.exitCode,
        });
        break;
    }
  }

  /**
   * Broadcast data to all connected UI clients
   */
  private broadcastToClients(data: any): void {
    const message = JSON.stringify(data) + '\n';
    for (const client of this.uiClients) {
      try {
        client.write(message);
      } catch (err) {
        // Client disconnected, will be cleaned up
      }
    }
  }

  /**
   * Start the daemon
   */
  async start(): Promise<void> {
    console.log('[Daemon] Starting monitor daemon...');

    // Load state from disk
    await this.state.load();

    // Load existing sessions
    await this.processor.loadSessions();

    // Initialize wrapper manager (loads persisted wrappers, cleans up dead ones)
    await this.wrapperManager.initialize();

    // Set up file watcher
    this.watcher.setLastProcessedTimestamp(this.state.lastProcessedTimestamp);
    this.watcher.setHandler((event, filepath) => this.processor.processEvent(event, filepath));
    await this.watcher.start();

    // Start periodic state saving (every 30 seconds)
    this.state.startPeriodicSave(30000);

    // Start socket server for UI connections
    await this.startSocketServer();

    // Start circuit breaker health monitoring
    this.circuitBreaker.start();

    this.running = true;
    console.log('[Daemon] Monitor daemon started');
  }

  /**
   * Stop the daemon
   */
  async stop(): Promise<void> {
    console.log('[Daemon] Stopping monitor daemon...');

    this.running = false;

    // Stop circuit breaker health monitoring
    this.circuitBreaker.stop();

    // Shutdown wrapper manager (kills all wrappers, persists state)
    await this.wrapperManager.shutdown();

    // Stop file watcher
    await this.watcher.stop();

    // Stop periodic save and save final state
    this.state.stopPeriodicSave();
    await this.state.save();

    // Close socket server
    if (this.socketServer) {
      // Forcefully disconnect all UI clients
      for (const client of this.uiClients) {
        try {
          client.write(JSON.stringify({ type: 'error', message: 'Daemon shutting down' }) + '\n');
          client.destroy(); // Force close the connection
        } catch (err) {
          // Ignore errors during shutdown
        }
      }

      await new Promise<void>((resolve) => {
        // Add timeout to force resolve if close takes too long
        const timeout = setTimeout(() => {
          console.log('[Daemon] Socket server close timeout, forcing shutdown');
          this.socketServer = null;
          this.uiClients.clear();
          // Clean up socket file
          try {
            fs.unlinkSync('/tmp/contextuate-daemon.sock');
          } catch (err) {
            // Ignore if already removed
          }
          resolve();
        }, 3000);

        this.socketServer!.close(() => {
          clearTimeout(timeout);
          this.socketServer = null;
          this.uiClients.clear();
          console.log('[Daemon] Socket server stopped');
          // Clean up socket file
          try {
            fs.unlinkSync('/tmp/contextuate-daemon.sock');
          } catch (err) {
            // Ignore if already removed
          }
          resolve();
        });
      });
    }

    console.log('[Daemon] Monitor daemon stopped');
  }

  /**
   * Check if daemon is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Start Unix socket server for hook notifications and UI clients
   */
  private async startSocketServer(): Promise<void> {
    const socketPath = '/tmp/contextuate-daemon.sock';

    // Remove existing socket file
    try {
      await fs.promises.unlink(socketPath);
    } catch (err) {
      // Ignore if doesn't exist
    }

    this.socketServer = net.createServer((socket) => {
      // Track this as a UI client for broadcasting
      this.uiClients.add(socket);
      console.log(`[Daemon] Client connected (${this.uiClients.size} total)`);

      // Handle incoming data (from hooks, wrappers, or UI commands)
      let buffer = '';
      let isWrapper = false;
      let wrapperId: string | null = null;

      socket.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.trim()) {
            try {
              const message = JSON.parse(line);

              // Handle wrapper registration
              if (message.type === 'wrapper_register') {
                isWrapper = true;
                wrapperId = message.wrapperId;
                this.handleWrapperRegister(socket, message);
                continue;
              }

              // Handle wrapper messages
              if (message.type === 'wrapper_started') {
                this.handleWrapperStarted(message);
                continue;
              }

              if (message.type === 'wrapper_ended') {
                this.handleWrapperEnded(message);
                continue;
              }

              if (message.type === 'state_changed') {
                this.handleWrapperStateChange(message);
                continue;
              }

              if (message.type === 'output') {
                this.handleWrapperOutput(message);
                continue;
              }

              // Handle input injection request from UI
              if (message.type === 'inject_input') {
                this.handleInputInjection(message);
                continue;
              }

              // Handle resize request from UI
              if (message.type === 'resize_wrapper') {
                this.handleWrapperResize(message);
                continue;
              }

              // Handle spawn wrapper request
              if (message.type === 'spawn_wrapper') {
                this.handleSpawnWrapper(socket, message);
                continue;
              }

              // Handle kill wrapper request
              if (message.type === 'kill_wrapper') {
                this.handleKillWrapper(message);
                continue;
              }

              // Handle get wrappers request
              if (message.type === 'get_wrappers') {
                this.handleGetWrappers(socket);
                continue;
              }

              // Circuit breaker messages
              if (message.type === 'get_circuit_health') {
                this.handleGetCircuitHealth(socket);
                continue;
              }

              if (message.type === 'get_session_health') {
                this.handleGetSessionHealth(socket, message);
                continue;
              }

              if (message.type === 'reset_circuit') {
                this.handleResetCircuit(message);
                continue;
              }

              if (message.type === 'update_circuit_config') {
                this.handleUpdateCircuitConfig(socket, message);
                continue;
              }

              // Process hook events immediately for instant updates
              if (message.id && message.eventType) {
                // This is an event from a hook - process it instantly
                this.processor.processEvent(message, null).catch(err => {
                  console.error('[Daemon] Error processing socket event:', err);
                });

                // Check if this event indicates waiting for input
                // and notify relevant wrapper
                this.checkAndNotifyWrapperState(message);
              }
            } catch (err) {
              // Ignore parse errors
            }
          }
        }
      });

      socket.on('close', () => {
        this.uiClients.delete(socket);

        // Clean up legacy wrapper session if this was an external wrapper
        if (isWrapper && wrapperId) {
          this.legacyWrapperSessions.delete(wrapperId);
          console.log(`[Daemon] Legacy wrapper ${wrapperId} disconnected (${this.legacyWrapperSessions.size} legacy wrappers remaining)`);
        } else {
          console.log(`[Daemon] Client disconnected (${this.uiClients.size} remaining)`);
        }
      });

      socket.on('error', () => {
        this.uiClients.delete(socket);
        if (isWrapper && wrapperId) {
          this.legacyWrapperSessions.delete(wrapperId);
        }
      });
    });

    this.socketServer.listen(socketPath, () => {
      console.log(`[Daemon] Socket server listening on ${socketPath}`);
    });
  }

  /**
   * Handle wrapper registration (legacy external wrapper process)
   */
  private handleWrapperRegister(socket: net.Socket, message: any): void {
    const session: LegacyWrapperSession = {
      wrapperId: message.wrapperId,
      socket,
      pid: message.pid,
      claudeSessionId: null,
      state: 'starting',
      cwd: '',
      startTime: Date.now(),
    };

    this.legacyWrapperSessions.set(message.wrapperId, session);
    console.log(`[Daemon] Legacy wrapper registered: ${message.wrapperId} (PID: ${message.pid})`);

    // Acknowledge registration
    socket.write(JSON.stringify({ type: 'registered', wrapperId: message.wrapperId }) + '\n');

    // Notify UI clients about new wrapper
    this.broadcastToClients({
      type: 'wrapper_connected',
      wrapperId: message.wrapperId,
      state: 'starting',
    });
  }

  /**
   * Handle wrapper started notification (legacy)
   */
  private handleWrapperStarted(message: any): void {
    const session = this.legacyWrapperSessions.get(message.wrapperId);
    if (session) {
      session.cwd = message.cwd || '';
      console.log(`[Daemon] Legacy wrapper ${message.wrapperId} started Claude in ${session.cwd}`);
    }
  }

  /**
   * Handle wrapper ended notification (legacy)
   */
  private handleWrapperEnded(message: any): void {
    const session = this.legacyWrapperSessions.get(message.wrapperId);
    if (session) {
      session.state = 'ended';
      console.log(`[Daemon] Legacy wrapper ${message.wrapperId} ended (exit: ${message.exitCode})`);

      // Notify UI clients
      this.broadcastToClients({
        type: 'wrapper_disconnected',
        wrapperId: message.wrapperId,
        exitCode: message.exitCode,
      });
    }
  }

  /**
   * Handle wrapper state change (legacy)
   */
  private handleWrapperStateChange(message: any): void {
    const session = this.legacyWrapperSessions.get(message.wrapperId);
    if (session) {
      session.state = message.state;
      console.log(`[Daemon] Legacy wrapper ${message.wrapperId} state: ${message.state}`);

      // Notify UI clients about state change
      this.broadcastToClients({
        type: 'wrapper_state',
        wrapperId: message.wrapperId,
        state: message.state,
      });
    }
  }

  /**
   * Handle wrapper output (for legacy external wrappers)
   */
  private handleWrapperOutput(message: any): void {
    // Forward output to UI clients for session log view
    this.broadcastToClients({
      type: 'wrapper_output',
      wrapperId: message.wrapperId,
      data: message.data,
      timestamp: message.timestamp,
    });
  }

  /**
   * Handle input injection request from UI
   */
  private handleInputInjection(message: any): void {
    const { wrapperId, input } = message;

    // Try managed wrapper first
    if (this.wrapperManager.writeInput(wrapperId, input)) {
      return;
    }

    // Fall back to legacy wrapper
    const session = this.legacyWrapperSessions.get(wrapperId);
    if (session) {
      session.socket.write(JSON.stringify({
        type: 'inject_input',
        input,
      }) + '\n');
    }
  }

  /**
   * Handle resize request from UI
   */
  private handleWrapperResize(message: any): void {
    const { wrapperId, cols, rows } = message;

    // Try managed wrapper first
    if (this.wrapperManager.resize(wrapperId, cols, rows)) {
      return;
    }

    // Fall back to legacy wrapper
    const session = this.legacyWrapperSessions.get(wrapperId);
    if (session) {
      session.socket.write(JSON.stringify({
        type: 'resize',
        cols,
        rows,
      }) + '\n');
    }
  }

  /**
   * Handle spawn wrapper request
   */
  private async handleSpawnWrapper(socket: net.Socket, message: any): Promise<void> {
    try {
      const wrapperId = await this.wrapperManager.spawn({
        cwd: message.cwd || process.cwd(),
        args: message.args || [],
        cols: message.cols || 120,
        rows: message.rows || 40,
      });

      // Send response with wrapper ID
      socket.write(JSON.stringify({
        type: 'wrapper_spawned',
        wrapperId,
        success: true,
      }) + '\n');

      console.log(`[Daemon] Spawned wrapper ${wrapperId}`);
    } catch (err) {
      const error = err as Error;
      socket.write(JSON.stringify({
        type: 'wrapper_spawned',
        success: false,
        error: error.message,
      }) + '\n');
      console.error(`[Daemon] Failed to spawn wrapper:`, error.message);
    }
  }

  /**
   * Handle kill wrapper request
   */
  private handleKillWrapper(message: any): void {
    const { wrapperId } = message;
    if (this.wrapperManager.kill(wrapperId)) {
      console.log(`[Daemon] Killed wrapper ${wrapperId}`);
    }
  }

  /**
   * Handle get wrappers request
   */
  private handleGetWrappers(socket: net.Socket): void {
    const managedWrappers = this.wrapperManager.getAll().map(w => ({
      wrapperId: w.wrapperId,
      pid: w.pid,
      state: w.state,
      claudeSessionId: w.claudeSessionId,
      cwd: w.cwd,
      startTime: w.startTime,
      managed: true,
    }));

    const legacyWrappers = Array.from(this.legacyWrapperSessions.values()).map(w => ({
      wrapperId: w.wrapperId,
      pid: w.pid,
      state: w.state,
      claudeSessionId: w.claudeSessionId,
      cwd: w.cwd,
      startTime: w.startTime,
      managed: false,
    }));

    socket.write(JSON.stringify({
      type: 'wrappers_list',
      wrappers: [...managedWrappers, ...legacyWrappers],
    }) + '\n');
  }

  /**
   * Check if a hook event indicates waiting for input
   * and notify relevant wrapper
   */
  private checkAndNotifyWrapperState(event: any): void {
    // Stop events typically indicate Claude is waiting for input
    if (event.hookType === 'Stop' || event.hookType === 'Notification') {
      // Try managed wrappers first
      for (const wrapper of this.wrapperManager.getAll()) {
        if (wrapper.claudeSessionId === event.sessionId) {
          this.wrapperManager.updateState(wrapper.wrapperId, 'waiting_input');
          return;
        }
        // Try to match by working directory
        if (!wrapper.claudeSessionId && event.workingDirectory === wrapper.cwd) {
          this.wrapperManager.updateState(wrapper.wrapperId, 'waiting_input', event.sessionId);
          console.log(`[Daemon] Associated managed wrapper ${wrapper.wrapperId} with Claude session ${event.sessionId}`);
          return;
        }
      }

      // Try legacy wrappers
      for (const [wrapperId, session] of this.legacyWrapperSessions) {
        // Match by Claude session ID if we have it
        if (session.claudeSessionId === event.sessionId) {
          session.state = 'waiting_input';
          session.socket.write(JSON.stringify({
            type: 'state_update',
            state: 'waiting_input',
          }) + '\n');

          this.broadcastToClients({
            type: 'wrapper_state',
            wrapperId,
            state: 'waiting_input',
          });
          return;
        }

        // Try to match by working directory
        if (!session.claudeSessionId && event.workingDirectory === session.cwd) {
          // Associate this Claude session with the wrapper
          session.claudeSessionId = event.sessionId;
          session.state = 'waiting_input';
          console.log(`[Daemon] Associated legacy wrapper ${wrapperId} with Claude session ${event.sessionId}`);

          session.socket.write(JSON.stringify({
            type: 'state_update',
            state: 'waiting_input',
          }) + '\n');

          this.broadcastToClients({
            type: 'wrapper_state',
            wrapperId,
            state: 'waiting_input',
            claudeSessionId: event.sessionId,
          });
          return;
        }
      }
    }
  }

  // =============================================================================
  // Circuit Breaker Handlers
  // =============================================================================

  /**
   * Handle get circuit health request
   */
  private handleGetCircuitHealth(socket: net.Socket): void {
    const health = this.circuitBreaker.getAllHealth();
    socket.write(JSON.stringify({
      type: 'circuit_health',
      health,
    }) + '\n');
  }

  /**
   * Handle get session health request
   */
  private handleGetSessionHealth(socket: net.Socket, message: any): void {
    const { sessionId } = message;
    const health = this.circuitBreaker.getSessionHealth(sessionId);
    if (health) {
      socket.write(JSON.stringify({
        type: 'session_health',
        health,
      }) + '\n');
    } else {
      socket.write(JSON.stringify({
        type: 'error',
        message: `No health data for session ${sessionId}`,
      }) + '\n');
    }
  }

  /**
   * Handle reset circuit request
   */
  private handleResetCircuit(message: any): void {
    const { sessionId } = message;
    this.circuitBreaker.resetCircuit(sessionId);
    console.log(`[Daemon] Circuit reset for session ${sessionId}`);
  }

  /**
   * Handle update circuit config request
   */
  private handleUpdateCircuitConfig(socket: net.Socket, message: any): void {
    const { config } = message;
    this.circuitBreaker.updateConfig(config);

    // Broadcast updated config to all clients
    this.broadcastToClients({
      type: 'circuit_config',
      config: this.circuitBreaker.getConfig(),
    });

    socket.write(JSON.stringify({
      type: 'circuit_config',
      config: this.circuitBreaker.getConfig(),
    }) + '\n');
  }

  /**
   * Get the circuit breaker instance (for external access)
   */
  getCircuitBreaker(): CircuitBreaker {
    return this.circuitBreaker;
  }

  /**
   * Get list of active wrapper sessions (for UI)
   */
  getWrapperSessions(): Array<{ wrapperId: string; state: string; claudeSessionId: string | null; managed: boolean }> {
    const managed = this.wrapperManager.getAll().map(s => ({
      wrapperId: s.wrapperId,
      state: s.state,
      claudeSessionId: s.claudeSessionId,
      managed: true,
    }));

    const legacy = Array.from(this.legacyWrapperSessions.values()).map(s => ({
      wrapperId: s.wrapperId,
      state: s.state,
      claudeSessionId: s.claudeSessionId,
      managed: false,
    }));

    return [...managed, ...legacy];
  }
}

/**
 * Start the daemon (exported for CLI)
 */
export async function startDaemon(config: MonitorConfig): Promise<MonitorDaemon> {
  const daemon = new MonitorDaemon(config);
  await daemon.start();
  return daemon;
}
