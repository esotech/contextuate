"use strict";
/**
 * Notifier
 *
 * Sends notifications to the UI server via Unix socket and/or Redis.
 * Uses fire-and-forget pattern for resilience.
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
exports.Notifier = void 0;
class Notifier {
    constructor(config, broadcast) {
        this.config = config;
        this.broadcast = broadcast;
    }
    /**
     * Notify UI server about a new event
     */
    async notify(event) {
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
    async notifySessionUpdate(session) {
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
    async notifyRedis(data) {
        // Redis notification for multi-machine UI aggregation
        try {
            const Redis = (await Promise.resolve().then(() => __importStar(require('ioredis')))).default;
            const client = new Redis({
                host: this.config.redis?.host || 'localhost',
                port: this.config.redis?.port || 6379,
                password: this.config.redis?.password || undefined,
                lazyConnect: true,
                maxRetriesPerRequest: 0,
            });
            await client.connect();
            await client.publish(this.config.redis?.channel || 'contextuate:ui', JSON.stringify(data));
            await client.quit();
        }
        catch (err) {
            // Fire-and-forget, don't fail
        }
    }
}
exports.Notifier = Notifier;
