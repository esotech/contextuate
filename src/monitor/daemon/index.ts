/**
 * Monitor Daemon
 *
 * Background daemon process that:
 * - Watches raw/ directory for new events
 * - Processes events (correlates sessions, tracks subagents)
 * - Persists data to sessions/
 * - Notifies UI server via Unix socket/Redis
 *
 * This is Layer 2 of the 3-layer architecture:
 * Layer 1: Hooks (write to raw/)
 * Layer 2: Daemon (process raw/ -> sessions/)
 * Layer 3: UI Server (read from sessions/, serve WebSocket)
 */

import * as fs from 'fs';
import * as net from 'net';
import { MonitorConfig, getDefaultMonitorPaths } from '../../types/monitor.js';
import { StateManager } from './state.js';
import { FileWatcher } from './watcher.js';
import { EventProcessor } from './processor.js';
import { Notifier } from './notifier.js';

const PATHS = getDefaultMonitorPaths();

export class MonitorDaemon {
  private config: MonitorConfig;
  private state: StateManager;
  private watcher: FileWatcher;
  private processor: EventProcessor;
  private notifier: Notifier;
  private socketServer: net.Server | null = null;
  private uiClients: Set<net.Socket> = new Set();
  private running = false;

  constructor(config: MonitorConfig) {
    this.config = config;
    this.state = new StateManager();
    this.notifier = new Notifier(config, (data) => this.broadcastToClients(data));
    this.processor = new EventProcessor(this.state, this.notifier);
    this.watcher = new FileWatcher();
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

    // Set up file watcher
    this.watcher.setLastProcessedTimestamp(this.state.lastProcessedTimestamp);
    this.watcher.setHandler((event, filepath) => this.processor.processEvent(event, filepath));
    await this.watcher.start();

    // Start periodic state saving (every 30 seconds)
    this.state.startPeriodicSave(30000);

    // Start socket server for UI connections
    await this.startSocketServer();

    this.running = true;
    console.log('[Daemon] Monitor daemon started');
  }

  /**
   * Stop the daemon
   */
  async stop(): Promise<void> {
    console.log('[Daemon] Stopping monitor daemon...');

    this.running = false;

    // Stop file watcher
    await this.watcher.stop();

    // Stop periodic save and save final state
    this.state.stopPeriodicSave();
    await this.state.save();

    // Close socket server
    if (this.socketServer) {
      this.socketServer.close();
      this.socketServer = null;
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

      // Handle incoming data (from hooks or UI commands)
      let buffer = '';
      socket.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.trim()) {
            try {
              const message = JSON.parse(line);
              // Hook notifications just log (event already in raw/)
              if (message.id && message.hookType) {
                console.log(`[Daemon] Hook notification: ${message.id}`);
              }
            } catch (err) {
              // Ignore parse errors
            }
          }
        }
      });

      socket.on('close', () => {
        this.uiClients.delete(socket);
        console.log(`[Daemon] Client disconnected (${this.uiClients.size} remaining)`);
      });

      socket.on('error', () => {
        this.uiClients.delete(socket);
      });
    });

    this.socketServer.listen(socketPath, () => {
      console.log(`[Daemon] Socket server listening on ${socketPath}`);
    });
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
