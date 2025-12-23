/**
 * Daemon State Management
 *
 * Manages persistent state for the monitor daemon including:
 * - Last processed timestamp (for crash recovery)
 * - Pending subagent spawns (for parent-child correlation)
 * - Active subagent stacks (for virtual session routing)
 */

import * as fs from 'fs';
import * as path from 'path';
import { DaemonState, getDefaultMonitorPaths } from '../../types/monitor.js';

const PATHS = getDefaultMonitorPaths();

/**
 * Pending subagent spawn tracking (adjusted to match broker.ts usage)
 */
interface PendingSubagentSpawn {
  parentSessionId: string;
  workingDirectory: string;
  timestamp: number;
  agentType?: string;
}

/**
 * Active subagent in the stack (adjusted to match broker.ts usage)
 */
interface ActiveSubagent {
  virtualSessionId: string;
  parentSessionId: string;
  agentType?: string;
  startTime: number;
}

/**
 * Internal daemon state structure
 */
interface InternalDaemonState {
  lastProcessedTimestamp: number;
  pendingSubagentSpawns: PendingSubagentSpawn[];
  activeSubagentStacks: Record<string, ActiveSubagent[]>;
}

export class StateManager {
  private state: InternalDaemonState;
  private saveInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.state = {
      lastProcessedTimestamp: 0,
      pendingSubagentSpawns: [],
      activeSubagentStacks: {},
    };
  }

  /**
   * Load state from disk
   */
  async load(): Promise<void> {
    try {
      const data = await fs.promises.readFile(PATHS.daemonStateFile, 'utf8');
      this.state = JSON.parse(data);
      console.log(`[State] Loaded state, last processed: ${new Date(this.state.lastProcessedTimestamp).toISOString()}`);
    } catch (err) {
      console.log('[State] No existing state file, starting fresh');
    }
  }

  /**
   * Save state to disk
   */
  async save(): Promise<void> {
    try {
      await fs.promises.mkdir(path.dirname(PATHS.daemonStateFile), { recursive: true });
      await fs.promises.writeFile(PATHS.daemonStateFile, JSON.stringify(this.state, null, 2));
    } catch (err) {
      console.error('[State] Failed to save state:', err);
    }
  }

  /**
   * Start periodic state saving
   */
  startPeriodicSave(intervalMs: number = 30000): void {
    this.saveInterval = setInterval(() => this.save(), intervalMs);
  }

  /**
   * Stop periodic state saving
   */
  stopPeriodicSave(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
  }

  /**
   * Get last processed timestamp
   */
  get lastProcessedTimestamp(): number {
    return this.state.lastProcessedTimestamp;
  }

  /**
   * Set last processed timestamp
   */
  set lastProcessedTimestamp(timestamp: number) {
    this.state.lastProcessedTimestamp = timestamp;
  }

  /**
   * Get pending subagent spawns
   */
  get pendingSubagentSpawns(): PendingSubagentSpawn[] {
    return this.state.pendingSubagentSpawns;
  }

  /**
   * Set pending subagent spawns
   */
  set pendingSubagentSpawns(spawns: PendingSubagentSpawn[]) {
    this.state.pendingSubagentSpawns = spawns;
  }

  /**
   * Get active subagent stack for a session
   */
  getActiveSubagentStack(sessionId: string): ActiveSubagent[] {
    return this.state.activeSubagentStacks[sessionId] || [];
  }

  /**
   * Set active subagent stack for a session
   */
  setActiveSubagentStack(sessionId: string, stack: ActiveSubagent[]): void {
    if (stack.length === 0) {
      delete this.state.activeSubagentStacks[sessionId];
    } else {
      this.state.activeSubagentStacks[sessionId] = stack;
    }
  }

  /**
   * Push a new subagent onto the stack for a session
   */
  pushActiveSubagent(sessionId: string, subagent: ActiveSubagent): void {
    if (!this.state.activeSubagentStacks[sessionId]) {
      this.state.activeSubagentStacks[sessionId] = [];
    }
    this.state.activeSubagentStacks[sessionId].push(subagent);
  }

  /**
   * Pop the top subagent from the stack for a session
   */
  popActiveSubagent(sessionId: string): ActiveSubagent | undefined {
    const stack = this.state.activeSubagentStacks[sessionId];
    if (!stack || stack.length === 0) return undefined;
    const subagent = stack.pop();
    if (stack.length === 0) {
      delete this.state.activeSubagentStacks[sessionId];
    }
    return subagent;
  }
}
