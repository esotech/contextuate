/**
 * File Watcher
 *
 * Watches the raw/ directory for new event files and processes them in order.
 * Handles both existing unprocessed files and newly created files.
 */
import { MonitorEvent } from '../../types/monitor.js';
export type EventHandler = (event: MonitorEvent, filepath: string) => Promise<void>;
export declare class FileWatcher {
    private watcher;
    private processing;
    private queue;
    private handler;
    private lastProcessedTimestamp;
    /**
     * Set the event handler callback
     */
    setHandler(handler: EventHandler): void;
    /**
     * Set the last processed timestamp for checkpoint recovery
     */
    setLastProcessedTimestamp(timestamp: number): void;
    /**
     * Start watching the raw directory
     */
    start(): Promise<void>;
    /**
     * Stop watching
     */
    stop(): Promise<void>;
    /**
     * Process existing files that may not have been processed yet
     */
    private processExistingFiles;
    /**
     * Add file to processing queue
     */
    private enqueue;
    /**
     * Process all files in the queue
     */
    private processQueue;
    /**
     * Process a single file
     */
    private processFile;
}
