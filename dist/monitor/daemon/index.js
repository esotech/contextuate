"use strict";
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
exports.MonitorDaemon = void 0;
exports.startDaemon = startDaemon;
const fs = __importStar(require("fs"));
const net = __importStar(require("net"));
const monitor_js_1 = require("../../types/monitor.js");
const state_js_1 = require("./state.js");
const watcher_js_1 = require("./watcher.js");
const processor_js_1 = require("./processor.js");
const notifier_js_1 = require("./notifier.js");
const PATHS = (0, monitor_js_1.getDefaultMonitorPaths)();
class MonitorDaemon {
    constructor(config) {
        this.socketServer = null;
        this.uiClients = new Set();
        this.running = false;
        this.config = config;
        this.state = new state_js_1.StateManager();
        this.notifier = new notifier_js_1.Notifier(config, (data) => this.broadcastToClients(data));
        this.processor = new processor_js_1.EventProcessor(this.state, this.notifier);
        this.watcher = new watcher_js_1.FileWatcher();
    }
    /**
     * Broadcast data to all connected UI clients
     */
    broadcastToClients(data) {
        const message = JSON.stringify(data) + '\n';
        for (const client of this.uiClients) {
            try {
                client.write(message);
            }
            catch (err) {
                // Client disconnected, will be cleaned up
            }
        }
    }
    /**
     * Start the daemon
     */
    async start() {
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
    async stop() {
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
    isRunning() {
        return this.running;
    }
    /**
     * Start Unix socket server for hook notifications and UI clients
     */
    async startSocketServer() {
        const socketPath = '/tmp/contextuate-daemon.sock';
        // Remove existing socket file
        try {
            await fs.promises.unlink(socketPath);
        }
        catch (err) {
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
                        }
                        catch (err) {
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
exports.MonitorDaemon = MonitorDaemon;
/**
 * Start the daemon (exported for CLI)
 */
async function startDaemon(config) {
    const daemon = new MonitorDaemon(config);
    await daemon.start();
    return daemon;
}
