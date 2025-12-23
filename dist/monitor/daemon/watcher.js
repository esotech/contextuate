"use strict";
/**
 * File Watcher
 *
 * Watches the raw/ directory for new event files and processes them in order.
 * Handles both existing unprocessed files and newly created files.
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
exports.FileWatcher = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const monitor_js_1 = require("../../types/monitor.js");
const PATHS = (0, monitor_js_1.getDefaultMonitorPaths)();
class FileWatcher {
    constructor() {
        this.watcher = null;
        this.processing = false;
        this.queue = [];
        this.handler = null;
        this.lastProcessedTimestamp = 0;
    }
    /**
     * Set the event handler callback
     */
    setHandler(handler) {
        this.handler = handler;
    }
    /**
     * Set the last processed timestamp for checkpoint recovery
     */
    setLastProcessedTimestamp(timestamp) {
        this.lastProcessedTimestamp = timestamp;
    }
    /**
     * Start watching the raw directory
     */
    async start() {
        // Ensure raw directory exists
        await fs.promises.mkdir(PATHS.rawDir, { recursive: true });
        // Process any existing unprocessed files first
        await this.processExistingFiles();
        // Start watching for new files
        this.watcher = fs.watch(PATHS.rawDir, (eventType, filename) => {
            if (eventType === 'rename' && filename && filename.endsWith('.json')) {
                const filepath = path.join(PATHS.rawDir, filename);
                this.enqueue(filepath);
            }
        });
        console.log(`[Watcher] Watching ${PATHS.rawDir} for new events`);
    }
    /**
     * Stop watching
     */
    async stop() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
    }
    /**
     * Process existing files that may not have been processed yet
     */
    async processExistingFiles() {
        try {
            const files = await fs.promises.readdir(PATHS.rawDir);
            const jsonFiles = files
                .filter(f => f.endsWith('.json'))
                .sort(); // Sort by timestamp (filename starts with timestamp)
            let processedCount = 0;
            for (const file of jsonFiles) {
                const filepath = path.join(PATHS.rawDir, file);
                // Extract timestamp from filename: {timestamp}-{sessionId}-{eventId}.json
                const timestamp = parseInt(file.split('-')[0], 10);
                // Skip if already processed (based on checkpoint)
                if (timestamp <= this.lastProcessedTimestamp) {
                    continue;
                }
                await this.processFile(filepath);
                processedCount++;
            }
            if (processedCount > 0) {
                console.log(`[Watcher] Processed ${processedCount} existing events`);
            }
        }
        catch (err) {
            console.error('[Watcher] Error processing existing files:', err);
        }
    }
    /**
     * Add file to processing queue
     */
    enqueue(filepath) {
        this.queue.push(filepath);
        this.processQueue();
    }
    /**
     * Process all files in the queue
     */
    async processQueue() {
        if (this.processing || this.queue.length === 0)
            return;
        this.processing = true;
        while (this.queue.length > 0) {
            const filepath = this.queue.shift();
            try {
                // Small delay to ensure file is fully written
                await new Promise(resolve => setTimeout(resolve, 50));
                await this.processFile(filepath);
            }
            catch (err) {
                console.error(`[Watcher] Error processing ${filepath}:`, err);
            }
        }
        this.processing = false;
    }
    /**
     * Process a single file
     */
    async processFile(filepath) {
        try {
            // Check if file still exists (might have been processed already)
            await fs.promises.access(filepath);
            const content = await fs.promises.readFile(filepath, 'utf8');
            const event = JSON.parse(content);
            if (this.handler) {
                await this.handler(event, filepath);
            }
        }
        catch (err) {
            if (err.code === 'ENOENT') {
                // File already processed/moved, skip
                return;
            }
            throw err;
        }
    }
}
exports.FileWatcher = FileWatcher;
