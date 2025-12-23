"use strict";
/**
 * Redis Adapter
 *
 * Uses Redis pub/sub for distributed event handling.
 * Allows multiple monitor instances and remote hook scripts.
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
exports.RedisAdapter = void 0;
exports.publishEventToRedis = publishEventToRedis;
// Dynamic import for ioredis to make it optional
let Redis;
class RedisAdapter {
    constructor(options) {
        this.subscriber = null;
        this.publisher = null;
        this.handlers = new Set();
        this.running = false;
        this.config = options.config;
    }
    async start() {
        if (this.running) {
            return;
        }
        // Dynamically import ioredis
        try {
            const ioredis = await Promise.resolve().then(() => __importStar(require('ioredis')));
            Redis = ioredis.default;
        }
        catch (err) {
            throw new Error('Redis adapter requires ioredis package. Install with: npm install ioredis');
        }
        const redisOptions = {
            host: this.config.host,
            port: this.config.port,
            password: this.config.password || undefined,
            retryStrategy: (times) => {
                const delay = Math.min(times * 100, 3000);
                console.log(`[Redis] Reconnecting in ${delay}ms (attempt ${times}/10)...`);
                if (times > 10) {
                    console.error('[Redis] Max reconnection attempts reached');
                    return null; // Stop retrying
                }
                return delay;
            },
            lazyConnect: true, // Don't auto-connect, we'll do it manually
        };
        // Create subscriber connection
        this.subscriber = new Redis(redisOptions);
        this.publisher = new Redis(redisOptions);
        // Set up error handlers before connecting
        this.subscriber.on('error', (err) => {
            console.error('[Redis Subscriber] Connection error:', err.message);
        });
        this.publisher.on('error', (err) => {
            console.error('[Redis Publisher] Connection error:', err.message);
        });
        this.subscriber.on('reconnecting', () => {
            console.log('[Redis Subscriber] Reconnecting...');
        });
        this.publisher.on('reconnecting', () => {
            console.log('[Redis Publisher] Reconnecting...');
        });
        // Connect both clients
        try {
            await Promise.all([
                this.subscriber.connect(),
                this.publisher.connect(),
            ]);
        }
        catch (err) {
            // Clean up on connection failure
            this.subscriber.disconnect();
            this.publisher.disconnect();
            throw new Error(`Failed to connect to Redis: ${err instanceof Error ? err.message : String(err)}`);
        }
        // Subscribe to the channel
        await this.subscriber.subscribe(this.config.channel);
        // Handle incoming messages
        this.subscriber.on('message', (channel, message) => {
            if (channel === this.config.channel) {
                try {
                    const event = JSON.parse(message);
                    console.log(`[Redis] Received event from ${event.machineId}/${event.sessionId}: ${event.eventType}`);
                    this.emitEvent(event);
                }
                catch (err) {
                    console.error('[Redis] Failed to parse event:', err);
                }
            }
        });
        this.running = true;
        console.log(`[Redis] Connected to ${this.config.host}:${this.config.port}, channel: ${this.config.channel}`);
        console.log('[Redis] Listening for events from multiple sources...');
    }
    async stop() {
        if (!this.running) {
            return;
        }
        if (this.subscriber) {
            await this.subscriber.unsubscribe(this.config.channel);
            this.subscriber.disconnect();
            this.subscriber = null;
        }
        if (this.publisher) {
            this.publisher.disconnect();
            this.publisher = null;
        }
        this.running = false;
        console.log('[Redis] Disconnected');
    }
    onEvent(handler) {
        this.handlers.add(handler);
    }
    offEvent(handler) {
        this.handlers.delete(handler);
    }
    isRunning() {
        return this.running;
    }
    emitEvent(event) {
        for (const handler of this.handlers) {
            try {
                const result = handler(event);
                if (result instanceof Promise) {
                    result.catch((err) => {
                        console.error('[Redis] Event handler error:', err);
                    });
                }
            }
            catch (err) {
                console.error('[Redis] Event handler error:', err);
            }
        }
    }
    /**
     * Publish an event to the Redis channel
     * This is used by hook scripts in Redis mode
     */
    async publishEvent(event) {
        if (!this.publisher) {
            throw new Error('Redis adapter not started');
        }
        const message = JSON.stringify(event);
        const subscriberCount = await this.publisher.publish(this.config.channel, message);
        console.log(`[Redis] Published event ${event.eventType} from ${event.machineId}/${event.sessionId} (${subscriberCount} subscribers)`);
    }
    /**
     * Get the Redis configuration for clients
     */
    getConfig() {
        return this.config;
    }
}
exports.RedisAdapter = RedisAdapter;
/**
 * Create a standalone publisher for hook scripts
 * This doesn't subscribe, just publishes events
 */
async function publishEventToRedis(config, event) {
    let RedisClient;
    try {
        const ioredis = await Promise.resolve().then(() => __importStar(require('ioredis')));
        RedisClient = ioredis.default;
    }
    catch (err) {
        throw new Error('Redis requires ioredis package');
    }
    const client = new RedisClient({
        host: config.host,
        port: config.port,
        password: config.password || undefined,
    });
    try {
        await client.publish(config.channel, JSON.stringify(event));
    }
    finally {
        client.disconnect();
    }
}
