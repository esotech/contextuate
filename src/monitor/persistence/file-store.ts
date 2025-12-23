/**
 * File-based Persistence Store
 *
 * Stores session data and events in JSON files.
 * Uses JSON Lines format for event logs (one JSON object per line).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import type {
  PersistenceStore,
  MonitorEvent,
  SessionMeta,
  SessionStatus,
  MonitorPaths,
} from '../../types/monitor';
import { getDefaultMonitorPaths } from '../../types/monitor.js';

export interface FileStoreOptions {
  baseDir?: string;
}

export class FileStore implements PersistenceStore {
  private paths: MonitorPaths;
  private baseDir: string;
  private sessionsDir: string;
  private processedDir: string;

  constructor(options?: FileStoreOptions) {
    this.paths = getDefaultMonitorPaths();
    this.baseDir = options?.baseDir || this.paths.baseDir;
    this.sessionsDir = path.join(this.baseDir, 'sessions');
    this.processedDir = path.join(this.baseDir, 'processed');
  }

  /**
   * Initialize the store - create directories if needed
   */
  async init(): Promise<void> {
    await fs.promises.mkdir(this.sessionsDir, { recursive: true });
    await fs.promises.mkdir(this.processedDir, { recursive: true });
    console.log(`[FileStore] Initialized at ${this.baseDir}`);
  }

  /**
   * Close the store (no-op for file store)
   */
  async close(): Promise<void> {
    // Nothing to clean up
  }

  /**
   * Save an event to the session's event log
   */
  async saveEvent(event: MonitorEvent): Promise<void> {
    const sessionDir = path.join(this.sessionsDir, event.sessionId);
    await fs.promises.mkdir(sessionDir, { recursive: true });

    const eventsFile = path.join(sessionDir, 'events.jsonl');
    const line = JSON.stringify(event) + '\n';

    await fs.promises.appendFile(eventsFile, line);
  }

  /**
   * Get events for a session
   */
  async getEvents(
    sessionId: string,
    options?: {
      limit?: number;
      before?: number;
      after?: number;
    }
  ): Promise<MonitorEvent[]> {
    const eventsFile = path.join(this.sessionsDir, sessionId, 'events.jsonl');

    if (!fs.existsSync(eventsFile)) {
      return [];
    }

    const events: MonitorEvent[] = [];
    const limit = options?.limit || 1000;

    const fileStream = fs.createReadStream(eventsFile);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (!line.trim()) continue;

      try {
        const event: MonitorEvent = JSON.parse(line);

        // Apply filters
        if (options?.before && event.timestamp >= options.before) continue;
        if (options?.after && event.timestamp <= options.after) continue;

        events.push(event);
      } catch (err) {
        console.error('[FileStore] Failed to parse event line:', err);
      }
    }

    // Sort by timestamp and limit
    events.sort((a, b) => a.timestamp - b.timestamp);

    if (events.length > limit) {
      return events.slice(-limit);
    }

    return events;
  }

  /**
   * Save session metadata
   */
  async saveSession(session: SessionMeta): Promise<void> {
    const sessionDir = path.join(this.sessionsDir, session.sessionId);
    await fs.promises.mkdir(sessionDir, { recursive: true });

    const metaFile = path.join(sessionDir, 'meta.json');
    await fs.promises.writeFile(metaFile, JSON.stringify(session, null, 2));
  }

  /**
   * Get session metadata
   */
  async getSession(sessionId: string): Promise<SessionMeta | null> {
    const metaFile = path.join(this.sessionsDir, sessionId, 'meta.json');

    if (!fs.existsSync(metaFile)) {
      return null;
    }

    try {
      const content = await fs.promises.readFile(metaFile, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      console.error('[FileStore] Failed to read session:', err);
      return null;
    }
  }

  /**
   * Get all sessions
   */
  async getSessions(options?: {
    status?: SessionStatus;
    limit?: number;
  }): Promise<SessionMeta[]> {
    if (!fs.existsSync(this.sessionsDir)) {
      return [];
    }

    const sessions: SessionMeta[] = [];
    const entries = await fs.promises.readdir(this.sessionsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const session = await this.getSession(entry.name);
      if (!session) continue;

      // Apply status filter
      if (options?.status && session.status !== options.status) continue;

      sessions.push(session);
    }

    // Sort by start time (newest first)
    sessions.sort((a, b) => b.startTime - a.startTime);

    // Apply limit
    if (options?.limit && sessions.length > options.limit) {
      return sessions.slice(0, options.limit);
    }

    return sessions;
  }

  /**
   * Update session metadata
   */
  async updateSession(sessionId: string, updates: Partial<SessionMeta>): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const updated = { ...session, ...updates };
    await this.saveSession(updated);
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const sessionDir = path.join(this.sessionsDir, sessionId);

    if (!fs.existsSync(sessionDir)) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    try {
      await fs.promises.rm(sessionDir, { recursive: true });
      console.log(`[FileStore] Deleted session: ${sessionId}`);
    } catch (err) {
      console.error(`[FileStore] Failed to delete session ${sessionId}:`, err);
      throw err;
    }
  }

  /**
   * Delete all sessions
   */
  async deleteAllSessions(): Promise<void> {
    if (!fs.existsSync(this.sessionsDir)) {
      return;
    }

    try {
      const entries = await fs.promises.readdir(this.sessionsDir, { withFileTypes: true });
      let deleted = 0;

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const sessionDir = path.join(this.sessionsDir, entry.name);
        try {
          await fs.promises.rm(sessionDir, { recursive: true });
          deleted++;
        } catch (err) {
          console.error(`[FileStore] Failed to delete session ${entry.name}:`, err);
        }
      }

      console.log(`[FileStore] Deleted all sessions (${deleted} total)`);
    } catch (err) {
      console.error('[FileStore] Failed to delete all sessions:', err);
      throw err;
    }
  }

  /**
   * Get all recent events across all sessions
   */
  async getAllRecentEvents(limit: number = 200): Promise<MonitorEvent[]> {
    if (!fs.existsSync(this.sessionsDir)) {
      return [];
    }

    const allEvents: MonitorEvent[] = [];
    const entries = await fs.promises.readdir(this.sessionsDir, { withFileTypes: true });

    // Read events from all sessions
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const sessionEvents = await this.getEvents(entry.name, { limit: 100 });
      allEvents.push(...sessionEvents);
    }

    // Sort by timestamp (newest first) and limit
    allEvents.sort((a, b) => b.timestamp - a.timestamp);

    return allEvents.slice(0, limit);
  }

  /**
   * Delete old sessions
   */
  async pruneOldSessions(olderThan: number): Promise<number> {
    const sessions = await this.getSessions();
    let pruned = 0;

    for (const session of sessions) {
      const endTime = session.endTime || session.startTime;
      if (endTime < olderThan) {
        const sessionDir = path.join(this.sessionsDir, session.sessionId);
        try {
          await fs.promises.rm(sessionDir, { recursive: true });
          pruned++;
        } catch (err) {
          console.error(`[FileStore] Failed to prune session ${session.sessionId}:`, err);
        }
      }
    }

    if (pruned > 0) {
      console.log(`[FileStore] Pruned ${pruned} old sessions`);
    }

    return pruned;
  }

  /**
   * Get event count for a session
   */
  async getEventCount(sessionId: string): Promise<number> {
    const eventsFile = path.join(this.sessionsDir, sessionId, 'events.jsonl');

    if (!fs.existsSync(eventsFile)) {
      return 0;
    }

    let count = 0;
    const fileStream = fs.createReadStream(eventsFile);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (line.trim()) count++;
    }

    return count;
  }

  /**
   * Get the base directory path
   */
  getBaseDir(): string {
    return this.baseDir;
  }

  /**
   * Get list of processed event files (for recovery)
   */
  async getProcessedFiles(): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(this.processedDir);
      return files.filter(f => f.endsWith('.json')).sort();
    } catch {
      return [];
    }
  }
}
