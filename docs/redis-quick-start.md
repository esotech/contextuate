# Redis Mode Quick Start

## 5-Minute Setup

### Prerequisites

```bash
# Install Redis (if not already installed)
# Ubuntu/Debian:
sudo apt-get install redis-server

# macOS:
brew install redis

# Start Redis
redis-server
```

### Enable Redis Mode

1. **Create config file** `~/.contextuate/monitor.config.json`:

```json
{
  "mode": "redis",
  "redis": {
    "host": "localhost",
    "port": 6379,
    "password": null,
    "channel": "contextuate:events"
  }
}
```

2. **Start monitor server:**

```bash
contextuate monitor start
```

3. **Done!** Events from all Claude instances will appear in the dashboard.

## Multi-Machine Setup

### Shared Redis Server

**Option 1: Use Redis Cloud (free tier)**
- Sign up at https://redis.io/cloud/
- Get connection details
- Update config on all machines:

```json
{
  "mode": "redis",
  "redis": {
    "host": "redis-12345.cloud.redislabs.com",
    "port": 12345,
    "password": "your-password",
    "channel": "contextuate:events"
  }
}
```

**Option 2: Self-hosted Redis**

On server machine:
```bash
# Install Redis
sudo apt-get install redis-server

# Edit /etc/redis/redis.conf
bind 0.0.0.0
requirepass your-secure-password

# Restart
sudo systemctl restart redis
```

On all dev machines:
```json
{
  "mode": "redis",
  "redis": {
    "host": "your-server-ip",
    "port": 6379,
    "password": "your-secure-password",
    "channel": "contextuate:events"
  }
}
```

## Verify Setup

### Test Redis Connection

```bash
redis-cli -h HOST -p PORT -a PASSWORD ping
# Should respond: PONG
```

### Monitor Redis Channel

```bash
redis-cli -h HOST -p PORT -a PASSWORD
SUBSCRIBE contextuate:events
```

Then use Claude in another terminal. Events will appear in real-time.

### Debug Hook Script

```bash
export CONTEXTUATE_DEBUG=1
# Run Claude commands
# Check for debug output in stderr
```

## Common Issues

### Hook script not sending events

```bash
# Check config exists
cat ~/.contextuate/monitor.config.json

# Verify mode is "redis"
grep mode ~/.contextuate/monitor.config.json

# Test Redis connectivity
redis-cli -h localhost -p 6379 ping
```

### Monitor not receiving events

```bash
# Check monitor server logs for connection errors

# Verify channel name matches
grep channel ~/.contextuate/monitor.config.json

# Test pub/sub manually:
# Terminal 1:
redis-cli SUBSCRIBE contextuate:events

# Terminal 2:
redis-cli PUBLISH contextuate:events '{"test":"message"}'
```

### Network issues

```bash
# Check firewall allows Redis port
sudo ufw allow 6379

# Test connection from remote machine
telnet REDIS_HOST 6379
```

## Switch Back to Local Mode

Edit `~/.contextuate/monitor.config.json`:

```json
{
  "mode": "local",
  "socketPath": "/tmp/contextuate-monitor.sock"
}
```

Restart monitor server.

## Performance Tips

### Hook Script Optimization

- Keep Redis server close (low latency)
- Use localhost Redis for single machine
- Hook timeout is 1 second (fails fast)

### Monitor Server Optimization

- Run monitor on same machine as Redis (best performance)
- Use SSD for file persistence
- Limit concurrent WebSocket clients

## Security Checklist

- [ ] Redis password enabled
- [ ] Redis bind address restricted (not 0.0.0.0 on public networks)
- [ ] Firewall rules in place
- [ ] Config file permissions (chmod 600 ~/.contextuate/monitor.config.json)
- [ ] TLS enabled for production (if needed)

## Example Configurations

### Local Development (Single Machine)

```json
{
  "mode": "local",
  "socketPath": "/tmp/contextuate-monitor.sock"
}
```

### Local Development (Multiple Processes)

```json
{
  "mode": "redis",
  "redis": {
    "host": "localhost",
    "port": 6379,
    "password": null,
    "channel": "contextuate:events"
  }
}
```

### Team Monitoring (Multiple Machines)

```json
{
  "mode": "redis",
  "redis": {
    "host": "team-redis.company.com",
    "port": 6379,
    "password": "team-password",
    "channel": "contextuate:team"
  }
}
```

### Development + Production Isolation

Development machines:
```json
{
  "mode": "redis",
  "redis": {
    "channel": "contextuate:dev"
  }
}
```

Production machines:
```json
{
  "mode": "redis",
  "redis": {
    "channel": "contextuate:prod"
  }
}
```

Separate channels = separate event streams.

## Getting Help

- Full documentation: `docs/monitor-redis-setup.md`
- Integration test: `node test/redis-integration-test.js`
- Debug logs: `export CONTEXTUATE_DEBUG=1`

## Next Steps

Once Redis mode is working:

1. **Explore multi-machine monitoring** - Connect multiple dev machines
2. **Set up team dashboard** - Shared monitor for team collaboration
3. **Configure persistence** - Save events to database
4. **Customize filtering** - Filter by machine, session, or event type

Happy monitoring! 🚀
