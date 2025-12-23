# SQL Schema Files for Contextuate Monitor

This directory contains production-ready SQL schemas for persistent storage of monitor sessions and events in MySQL and PostgreSQL databases.

## Files

- **`mysql-schema.sql`** - Complete MySQL 8.0+ schema with indexes and constraints
- **`postgresql-schema.sql`** - Complete PostgreSQL 12+ schema with JSONB, views, and functions

## Quick Start

### MySQL

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE contextuate_monitor;"

# Apply schema
mysql -u root -p contextuate_monitor < mysql-schema.sql

# Verify
mysql -u root -p contextuate_monitor -e "SHOW TABLES;"
```

### PostgreSQL

```bash
# Create database
psql -U postgres -c "CREATE DATABASE contextuate_monitor;"

# Apply schema
psql -U postgres -d contextuate_monitor -f postgresql-schema.sql

# Verify
psql -U postgres -d contextuate_monitor -c "\dt"
```

## Schema Overview

### Tables

#### `sessions`
Stores metadata for each Claude Code session:
- **Identification**: `session_id` (primary key)
- **Context**: `machine_id`, `working_directory`
- **Timing**: `start_time`, `end_time` (Unix timestamps in milliseconds)
- **Status**: `status` (active/completed/error)
- **Hierarchy**: `parent_session_id`, `manual_parent_session_id`, `child_session_ids`
- **Classification**: `agent_type`, `is_user_initiated`
- **UI State**: `is_pinned`, `hidden`, `label`
- **Metrics**: `token_usage_input`, `token_usage_output`

#### `events`
Stores all monitor events with full payloads:
- **Identification**: `id` (UUID)
- **Association**: `session_id` (foreign key)
- **Timing**: `timestamp` (Unix timestamp in milliseconds)
- **Classification**: `event_type`, `hook_type`
- **Context**: `parent_session_id`, `machine_id`, `working_directory`
- **Payload**: `data` (JSON/JSONB with full event details)

### Key Features

#### MySQL
- JSON column type for flexible event data
- InnoDB engine for ACID compliance
- Optimized indexes for session and event queries
- Foreign key constraints with CASCADE/SET NULL
- UTF-8 (utf8mb4) character set
- Optional partitioning guidance for high-volume deployments

#### PostgreSQL
- **JSONB** for efficient JSON indexing and queries
- **Custom ENUM types** for type safety (session_status, monitor_event_type, claude_hook_type)
- **Partial indexes** for common filters (active sessions, visible sessions, errors)
- **GIN indexes** for JSONB and array queries
- **Auto-updating triggers** for `updated_at` timestamp
- **Utility views**:
  - `active_sessions` - Visible sessions with computed metrics
  - `session_hierarchy` - Recursive session tree structure
- **Utility functions**:
  - `get_recent_events(limit)` - Cross-session recent events
  - `get_session_event_counts(session_id)` - Event counts by type
  - `prune_old_sessions(older_than_ms)` - Delete old completed sessions

## Index Strategy

Both schemas include optimized indexes for common query patterns:

### Sessions
- `idx_status` - Filter by status
- `idx_parent_session_id` - Navigate hierarchy
- `idx_start_time` - Chronological sorting
- `idx_hidden_status` - Filter visible sessions
- `idx_pinned` - Pinned sessions first
- PostgreSQL: Partial indexes for active/visible sessions

### Events
- `idx_session_timestamp` - **PRIMARY pattern** (95% of queries)
- `idx_timestamp` - Cross-session recent activity
- `idx_event_type` - Filter by event type
- `idx_machine_timestamp` - Machine-specific monitoring
- `idx_parent_session` - Session tree tracking
- PostgreSQL: GIN index for JSONB queries, partial indexes for errors/tool calls

## Data Types

### MySQL vs PostgreSQL

| Field | MySQL | PostgreSQL |
|-------|-------|------------|
| Session ID | VARCHAR(255) | VARCHAR(255) |
| Event ID | VARCHAR(36) | UUID |
| Timestamps | BIGINT (Unix ms) | BIGINT (Unix ms) |
| Event Data | JSON | JSONB |
| Child IDs | JSON array | JSONB array |
| Status | VARCHAR + CHECK | ENUM type |
| Event Type | VARCHAR + CHECK | ENUM type |
| Hook Type | VARCHAR + CHECK | ENUM type |

## Maintenance

### Regular Tasks

```sql
-- MySQL: Analyze tables
ANALYZE TABLE sessions;
ANALYZE TABLE events;

-- MySQL: Optimize after deletions
OPTIMIZE TABLE events;

-- PostgreSQL: Analyze tables
ANALYZE sessions;
ANALYZE events;

-- PostgreSQL: Vacuum
VACUUM ANALYZE events;
```

### Archival

```sql
-- MySQL: Delete old events
DELETE FROM events WHERE timestamp < UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 90 DAY)) * 1000;

-- PostgreSQL: Use utility function
SELECT prune_old_sessions(EXTRACT(EPOCH FROM NOW() - INTERVAL '90 days')::BIGINT * 1000);
```

### Monitoring

```sql
-- MySQL: Check table sizes
SELECT
  table_name,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
FROM information_schema.tables
WHERE table_schema = 'contextuate_monitor';

-- PostgreSQL: Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public';
```

## Performance Tuning

### High-Volume Deployments (>10M events)

Both schemas include comments on table partitioning:

- **MySQL**: Range partitioning by `FLOOR(timestamp / 86400000)` (daily buckets)
- **PostgreSQL**: Native RANGE partitioning by `timestamp`

Consider partitioning when:
- Events table exceeds 10 million rows
- Query performance degrades on time-range queries
- Archive/purge operations become slow

### Connection Pooling

For production use, configure connection pooling:

- **MySQL**: Use connection pool size of 10-20 per application instance
- **PostgreSQL**: Use pgBouncer or built-in connection pooling (pool size: 10-25)

## Migration from File-based Storage

To migrate existing file-based monitor data to SQL:

1. Export sessions and events from file store
2. Transform data to match schema
3. Bulk insert using LOAD DATA (MySQL) or COPY (PostgreSQL)
4. Rebuild indexes if needed

Example migration script structure:
```typescript
// Pseudo-code
const fileStore = new FileStore();
const sqlStore = new SQLStore(config);

for (const session of await fileStore.getSessions()) {
  await sqlStore.saveSession(session);

  const events = await fileStore.getEvents(session.sessionId);
  for (const event of events) {
    await sqlStore.saveEvent(event);
  }
}
```

## Testing

To test the schemas:

```bash
# MySQL
docker run --name test-mysql -e MYSQL_ROOT_PASSWORD=test -p 3306:3306 -d mysql:8.0
mysql -h 127.0.0.1 -u root -ptest < mysql-schema.sql

# PostgreSQL
docker run --name test-postgres -e POSTGRES_PASSWORD=test -p 5432:5432 -d postgres:15
psql -h 127.0.0.1 -U postgres -f postgresql-schema.sql
```

## Configuration

Update your monitor configuration (`contextuate-monitor.json`) to use SQL persistence:

```json
{
  "persistence": {
    "enabled": true,
    "type": "mysql",  // or "postgresql"
    "database": {
      "host": "localhost",
      "port": 3306,     // or 5432 for PostgreSQL
      "database": "contextuate_monitor",
      "user": "monitor_user",
      "password": "secure_password"
    }
  }
}
```

## Security

### Production Recommendations

1. **Create dedicated database user** with limited permissions:
   ```sql
   -- MySQL
   CREATE USER 'monitor_user'@'localhost' IDENTIFIED BY 'secure_password';
   GRANT SELECT, INSERT, UPDATE, DELETE ON contextuate_monitor.* TO 'monitor_user'@'localhost';

   -- PostgreSQL
   CREATE USER monitor_user WITH PASSWORD 'secure_password';
   GRANT CONNECT ON DATABASE contextuate_monitor TO monitor_user;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO monitor_user;
   ```

2. **Use SSL/TLS** for database connections
3. **Enable binary logging** (MySQL) or WAL archiving (PostgreSQL) for point-in-time recovery
4. **Regular backups** with automated backup verification
5. **Rotate credentials** periodically

## Troubleshooting

### Common Issues

1. **Foreign key constraint failures**
   - Ensure parent sessions exist before creating child sessions
   - Check `parent_session_id` references valid `session_id`

2. **Slow queries**
   - Verify indexes exist: `SHOW INDEX FROM events;` (MySQL) or `\di` (PostgreSQL)
   - Check query plans: `EXPLAIN` your queries
   - Consider partitioning for large tables

3. **Connection timeouts**
   - Increase connection pool size
   - Check database server resource limits
   - Monitor active connections

## Support

For issues or questions:
- Check type definitions in `/home/geilt/environment/contextuate/src/types/monitor.ts`
- Review persistence interface in `/home/geilt/environment/contextuate/src/monitor/persistence/`
- File issues at project repository

## License

Part of the Contextuate project. See project root for license information.
