# Redis Multi-Source Event Setup

This guide explains how to configure Contextuate Monitor to use Redis for distributed event handling, allowing you to collect Claude events from multiple machines or processes.

## Overview

**Local Mode (default):**
- Events sent via Unix socket (`/tmp/contextuate-monitor.sock`)
- Only works on a single machine
- Fastest, no network overhead

**Redis Mode:**
- Events published to a Redis channel
- Multiple hook scripts (different machines) can publish to the same Redis
- Monitor server subscribes and receives all events
- Supports distributed/multi-machine monitoring

## Prerequisites

- Redis server running (local or remote)
- `ioredis` package installed (already in package.json)

## Configuration

### 1. Monitor Server Configuration

Edit `~/.contextuate/monitor.config.json`:

```json
{
  "mode": "redis",
  "server": {
    "host": "0.0.0.0",
    "port": 3847,
    "wsPort": 3848
  },
  "redis": {
    "host": "localhost",
    "port": 6379,
    "password": null,
    "channel": "contextuate:events"
  },
  "persistence": {
    "enabled": true,
    "type": "file"
  }
}
```

**Configuration Options:**

| Field | Description | Default |
|-------|-------------|---------|
| `mode` | `"local"` or `"redis"` | `"local"` |
| `redis.host` | Redis server hostname | `"localhost"` |
| `redis.port` | Redis server port | `6379` |
| `redis.password` | Redis password (if required) | `null` |
| `redis.channel` | Pub/sub channel name | `"contextuate:events"` |

### 2. Hook Script Behavior

The hook script (`~/.contextuate/hooks/emit-event.js`) automatically detects the mode:

- **Local mode**: Sends events to Unix socket
- **Redis mode**: Publishes events to Redis channel

No changes needed to hook scripts - they read the config file automatically.

## Multi-Machine Setup

### Scenario: Monitor events from multiple development machines

**Machine A (Monitor Server):**
```bash
# Start monitor server in Redis mode
contextuate monitor start

# Server connects to Redis and subscribes to events
```

**Machine B (Development Machine 1):**
```json
# ~/.contextuate/monitor.config.json
{
  "mode": "redis",
  "redis": {
    "host": "redis.example.com",  // Shared Redis server
    "port": 6379,
    "password": "your-password",
    "channel": "contextuate:events"
  }
}
```

**Machine C (Development Machine 2):**
```json
# ~/.contextuate/monitor.config.json
{
  "mode": "redis",
  "redis": {
    "host": "redis.example.com",  // Same Redis server
    "port": 6379,
    "password": "your-password",
    "channel": "contextuate:events"
  }
}
```

All Claude events from Machine B and C will appear in the monitor UI on Machine A.

## Event Flow

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  Machine A  │       │  Machine B  │       │  Machine C  │
│   (Claude)  │       │   (Claude)  │       │   (Claude)  │
└──────┬──────┘       └──────┬──────┘       └──────┬──────┘
       │                     │                     │
       │ Publish             │ Publish             │ Publish
       │ (emit-event.js)     │ (emit-event.js)     │ (emit-event.js)
       │                     │                     │
       └─────────────────────┼─────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  Redis Server  │
                    │  (Pub/Sub)     │
                    └────────┬───────┘
                             │
                             │ Subscribe
                             │
                    ┌────────▼───────┐
                    │ Monitor Server │
                    │  (Event Broker)│
                    └────────┬───────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  Web UI        │
                    │  (Dashboard)   │
                    └────────────────┘
```

## Machine Identification

Each event includes:
- `machineId`: Hostname of the machine that generated the event
- `sessionId`: Unique session identifier
- `workingDirectory`: Current working directory

This allows you to:
- Track which machine each session is running on
- Monitor multiple Claude instances simultaneously
- Correlate sub-agents across machines

## Performance Considerations

### Hook Script Performance

- **Timeout**: 1 second for Redis connections
- **No retries**: Hook scripts fail fast if Redis is unavailable
- **Async**: Events published asynchronously, doesn't block Claude

### Monitor Server Performance

- **Reconnection**: Automatic reconnection with exponential backoff
- **Max retries**: 10 attempts before giving up
- **Logging**: Verbose logging for debugging multi-source events

## Debugging

Enable debug logging in hook scripts:

```bash
export CONTEXTUATE_DEBUG=1
```

This will show:
- Event publishing success/failure
- Redis connection status
- Event routing information

Monitor server shows:
- Events received from each machine
- Connection status
- Subscriber count for published events

## Security

### Redis Authentication

If your Redis server requires authentication:

```json
{
  "redis": {
    "host": "redis.example.com",
    "port": 6379,
    "password": "your-secure-password",
    "channel": "contextuate:events"
  }
}
```

### Network Security

- Use Redis over TLS (configure in ioredis options if needed)
- Restrict Redis network access with firewall rules
- Use strong passwords for Redis AUTH

### Event Data

Events may contain:
- Tool inputs/outputs
- Code snippets
- File paths
- Error messages

Ensure your Redis server is:
- On a trusted network, or
- Properly secured with authentication and encryption

## Troubleshooting

### Hook script not publishing

1. Check config file exists: `~/.contextuate/monitor.config.json`
2. Verify mode is set to `"redis"`
3. Enable debug: `export CONTEXTUATE_DEBUG=1`
4. Check Redis server is accessible: `redis-cli -h <host> -p <port> ping`

### Monitor not receiving events

1. Check monitor server started with Redis mode
2. Verify Redis connection in server logs
3. Check channel name matches in config
4. Test Redis pub/sub manually:
   ```bash
   # Terminal 1: Subscribe
   redis-cli SUBSCRIBE contextuate:events

   # Terminal 2: Publish
   redis-cli PUBLISH contextuate:events '{"test":"message"}'
   ```

### Events from some machines missing

1. Verify all machines have same Redis config
2. Check network connectivity from each machine to Redis
3. Ensure Redis firewall allows connections from all machines
4. Check `machineId` in events to identify source

## Example: Team Monitoring Setup

### Central Redis Server

```bash
# Install Redis on shared server
sudo apt-get install redis-server

# Configure Redis to accept remote connections
# Edit /etc/redis/redis.conf:
bind 0.0.0.0
requirepass strong-password-here

# Restart Redis
sudo systemctl restart redis
```

### Each Developer Machine

```json
# ~/.contextuate/monitor.config.json
{
  "mode": "redis",
  "redis": {
    "host": "team-redis.example.com",
    "port": 6379,
    "password": "strong-password-here",
    "channel": "contextuate:team:events"
  }
}
```

### Monitor Dashboard (Team Lead)

```bash
# Start monitor server
contextuate monitor start

# Open browser
# http://localhost:3847

# View events from entire team in real-time
```

## Advanced: Multiple Monitor Instances

You can run multiple monitor servers subscribing to the same Redis:

```bash
# Machine A
contextuate monitor start

# Machine B
contextuate monitor start
```

Both will receive all events. Useful for:
- High availability
- Different team members monitoring
- Separate dashboards for different purposes

## Performance Benchmarks

**Hook Script (Redis mode):**
- Connection: ~50-100ms (cached connections)
- Publish: ~5-10ms
- Total overhead: ~60-110ms per event

**Monitor Server:**
- Event processing: ~1-5ms
- WebSocket broadcast: ~1-2ms per client
- Memory: ~50MB + event storage

**Redis:**
- Pub/Sub latency: <1ms (local network)
- Throughput: >100k events/second

Redis mode adds minimal overhead while enabling distributed monitoring.
