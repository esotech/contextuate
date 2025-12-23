/**
 * Notifier
 *
 * Sends notifications to the UI server via Unix socket and/or Redis.
 * Uses fire-and-forget pattern for resilience.
 */
import { MonitorEvent, MonitorConfig, SessionMeta } from '../../types/monitor.js';
export type BroadcastCallback = (data: any) => void;
export declare class Notifier {
    private config;
    private broadcast;
    constructor(config: MonitorConfig, broadcast: BroadcastCallback);
    /**
     * Notify UI server about a new event
     */
    notify(event: MonitorEvent): Promise<void>;
    /**
     * Notify UI server about a session update
     */
    notifySessionUpdate(session: SessionMeta): Promise<void>;
    /**
     * Send notification via Redis pub/sub
     */
    private notifyRedis;
}
