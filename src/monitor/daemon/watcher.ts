/**
 * File Watcher
 *
 * Watches the raw/ directory for new event files and processes them in order.
 * Handles both existing unprocessed files and newly created files.
 */

import * as fs from 'fs';
import * as path from 'path';
import { MonitorEvent, getDefaultMonitorPaths } from '../../types/monitor.js';

const PATHS = getDefaultMonitorPaths();

export type EventHandler = (event: MonitorEvent, filepath: string) => Promise<void>;

export class FileWatcher {
  private watcher: fs.FSWatcher | null = null;
  private processing = false;
  private queue: string[] = [];
  private handler: EventHandler | null = null;
  private lastProcessedTimestamp: number = 0;

  /**
   * Set the event handler callback
   */
  setHandler(handler: EventHandler): void {
    this.handler = handler;
  }

  /**
   * Set the last processed timestamp for checkpoint recovery
   */
  setLastProcessedTimestamp(timestamp: number): void {
    this.lastProcessedTimestamp = timestamp;
  }

  /**
   * Start watching the raw directory
   */
  async start(): Promise<void> {
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
  async stop(): Promise<void> {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  /**
   * Process existing files that may not have been processed yet
   */
  private async processExistingFiles(): Promise<void> {
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
    } catch (err) {
      console.error('[Watcher] Error processing existing files:', err);
    }
  }

  /**
   * Add file to processing queue
   */
  private enqueue(filepath: string): void {
    this.queue.push(filepath);
    this.processQueue();
  }

  /**
   * Process all files in the queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const filepath = this.queue.shift()!;
      try {
        // Small delay to ensure file is fully written
        await new Promise(resolve => setTimeout(resolve, 50));
        await this.processFile(filepath);
      } catch (err) {
        console.error(`[Watcher] Error processing ${filepath}:`, err);
      }
    }

    this.processing = false;
  }

  /**
   * Process a single file
   */
  private async processFile(filepath: string): Promise<void> {
    try {
      // Check if file still exists (might have been processed already)
      await fs.promises.access(filepath);

      const content = await fs.promises.readFile(filepath, 'utf8');
      const event: MonitorEvent = JSON.parse(content);

      if (this.handler) {
        await this.handler(event, filepath);
      }
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        // File already processed/moved, skip
        return;
      }
      throw err;
    }
  }
}
