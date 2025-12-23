/**
 * Notifier
 *
 * Sends notifications to the UI server via Unix socket and/or Redis.
 * Uses fire-and-forget pattern for resilience.
 */

import { MonitorEvent, MonitorConfig, SessionMeta } from '../../types/monitor.js';

export type BroadcastCallback = (data: any) => void;

export class Notifier {
  private config: MonitorConfig;
  private broadcast: BroadcastCallback;

  constructor(config: MonitorConfig, broadcast: BroadcastCallback) {
    this.config = config;
    this.broadcast = broadcast;
  }

  /**
   * Notify UI server about a new event
   */
  async notify(event: MonitorEvent): Promise<void> {
    // Broadcast to local UI clients via callback
    this.broadcast({ type: 'event', event });

    // If Redis mode, also publish for UI aggregation across machines
    if (this.config.mode === 'redis' && this.config.redis) {
      await this.notifyRedis({ type: 'event', event });
    }
  }

  /**
   * Notify UI server about a session update
   */
  async notifySessionUpdate(session: SessionMeta): Promise<void> {
    const notification = {
      type: 'session_update',
      session,
      timestamp: Date.now(),
    };

    // Broadcast to local UI clients via callback
    this.broadcast(notification);

    // If Redis mode, also publish for UI aggregation
    if (this.config.mode === 'redis' && this.config.redis) {
      await this.notifyRedis(notification);
    }
  }

  /**
   * Send notification via Redis pub/sub
   */
  private async notifyRedis(data: any): Promise<void> {
    // Redis notification for multi-machine UI aggregation
    try {
      const Redis = (await import('ioredis')).default;
      const client = new Redis({
        host: this.config.redis?.host || 'localhost',
        port: this.config.redis?.port || 6379,
        password: this.config.redis?.password || undefined,
        lazyConnect: true,
        maxRetriesPerRequest: 0,
      });

      await client.connect();
      await client.publish(
        this.config.redis?.channel || 'contextuate:ui',
        JSON.stringify(data)
      );
      await client.quit();
    } catch (err) {
      // Fire-and-forget, don't fail
    }
  }
}
