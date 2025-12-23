# MySQL vs PostgreSQL Schema Comparison

## Quick Reference: Key Differences

### Data Types

| Feature | MySQL | PostgreSQL |
|---------|-------|------------|
| **Event ID** | `VARCHAR(36)` (manual UUID) | `UUID` with `gen_random_uuid()` |
| **JSON Storage** | `JSON` | `JSONB` (binary, indexable) |
| **Status/Types** | `VARCHAR` + `CHECK` constraint | Native `ENUM` types |
| **Timestamps** | `TIMESTAMP` | `TIMESTAMP WITH TIME ZONE` |
| **Boolean** | `BOOLEAN` (stored as TINYINT) | Native `BOOLEAN` |
| **Array Default** | `JSON_ARRAY()` | `'[]'::jsonb` |

### Schema Features

| Feature | MySQL | PostgreSQL |
|---------|-------|------------|
| **Type Safety** | CHECK constraints | Native ENUM types (session_status, monitor_event_type, claude_hook_type) |
| **JSON Indexing** | Basic JSON support | GIN indexes on JSONB for fast queries |
| **Partial Indexes** | No | Yes (active sessions, visible sessions, errors, tool calls) |
| **Auto-update Trigger** | `ON UPDATE CURRENT_TIMESTAMP` | Custom trigger function |
| **Comments** | Inline in CREATE TABLE | Separate COMMENT ON statements |
| **Views** | Not included | 2 views (active_sessions, session_hierarchy) |
| **Functions** | Not included | 3 utility functions |

### Advanced Features (PostgreSQL Only)

#### Custom Types
```sql
CREATE TYPE session_status AS ENUM ('active', 'completed', 'error');
CREATE TYPE monitor_event_type AS ENUM (...);
CREATE TYPE claude_hook_type AS ENUM (...);
```

#### Partial Indexes
```sql
-- Only index active sessions
CREATE INDEX idx_sessions_active ON sessions(start_time DESC) WHERE status = 'active';

-- Only index visible sessions
CREATE INDEX idx_sessions_visible ON sessions(start_time DESC) WHERE hidden = FALSE;

-- Only index error events
CREATE INDEX idx_events_errors ON events(timestamp DESC) WHERE event_type = 'error';
```

#### Utility Views

**active_sessions** - Computed metrics:
```sql
SELECT
  session_id,
  token_usage_input + token_usage_output AS token_usage_total,
  jsonb_array_length(child_session_ids) AS child_count,
  CASE WHEN end_time IS NULL THEN NULL ELSE end_time - start_time END AS duration_ms
FROM sessions
WHERE hidden = FALSE;
```

**session_hierarchy** - Recursive CTE:
```sql
WITH RECURSIVE session_tree AS (
  -- Root sessions
  SELECT session_id, parent_session_id, 0 AS depth, ARRAY[session_id] AS path
  FROM sessions WHERE parent_session_id IS NULL
  UNION ALL
  -- Child sessions
  SELECT s.session_id, s.parent_session_id, st.depth + 1, st.path || s.session_id
  FROM sessions s
  INNER JOIN session_tree st ON s.parent_session_id = st.session_id
)
SELECT * FROM session_tree ORDER BY path;
```

#### Utility Functions

**get_recent_events(limit)**:
```sql
SELECT get_recent_events(100); -- Get 100 most recent events across all sessions
```

**get_session_event_counts(session_id)**:
```sql
SELECT * FROM get_session_event_counts('session-123'); -- Event counts by type
```

**prune_old_sessions(older_than_ms)**:
```sql
SELECT prune_old_sessions(EXTRACT(EPOCH FROM NOW() - INTERVAL '90 days')::BIGINT * 1000);
```

### JSON Query Syntax

| Operation | MySQL | PostgreSQL |
|-----------|-------|------------|
| **Extract string** | `JSON_EXTRACT(data, '$.toolName')` | `data->>'toolName'` |
| **Extract object** | `JSON_EXTRACT(data, '$.error')` | `data->'error'` |
| **Array length** | `JSON_LENGTH(child_session_ids)` | `jsonb_array_length(child_session_ids)` |
| **Contains** | `JSON_CONTAINS(data, '"value"', '$.field')` | `data @> '{"field": "value"}'` |
| **Exists** | `JSON_EXTRACT(data, '$.field') IS NOT NULL` | `data ? 'field'` |

### Performance Characteristics

| Aspect | MySQL | PostgreSQL |
|--------|-------|------------|
| **JSON Performance** | Slower (text-based) | Faster (binary JSONB with GIN indexes) |
| **Partial Indexes** | No (full index overhead) | Yes (reduced index size and maintenance) |
| **Complex Queries** | Good | Better (CTEs, window functions, better optimizer) |
| **Write Performance** | Very fast | Fast (slightly slower due to MVCC) |
| **Read Performance** | Fast | Very fast (especially JSONB queries) |
| **Concurrent Reads** | Good | Excellent (MVCC, no read locks) |

### Index Strategy Comparison

#### MySQL (6 indexes on sessions, 5 on events)
```sql
-- sessions
INDEX idx_status
INDEX idx_parent_session_id
INDEX idx_start_time
INDEX idx_machine_id
INDEX idx_hidden_status (composite)
INDEX idx_pinned

-- events
INDEX idx_session_timestamp (composite)
INDEX idx_timestamp
INDEX idx_event_type
INDEX idx_machine_timestamp (composite)
INDEX idx_parent_session
```

#### PostgreSQL (10 indexes on sessions, 8 on events)
```sql
-- sessions (includes 2 partial indexes)
INDEX idx_sessions_status
INDEX idx_sessions_parent_session_id
INDEX idx_sessions_start_time
INDEX idx_sessions_machine_id
INDEX idx_sessions_hidden_status (composite)
INDEX idx_sessions_pinned
INDEX idx_sessions_child_ids (GIN on JSONB)
INDEX idx_sessions_active (PARTIAL: status = 'active')
INDEX idx_sessions_visible (PARTIAL: hidden = FALSE)

-- events (includes 3 partial indexes + GIN)
INDEX idx_events_session_timestamp (composite)
INDEX idx_events_timestamp
INDEX idx_events_event_type
INDEX idx_events_machine_timestamp (composite)
INDEX idx_events_parent_session (PARTIAL: parent_session_id IS NOT NULL)
INDEX idx_events_data (GIN on JSONB)
INDEX idx_events_errors (PARTIAL: event_type = 'error')
INDEX idx_events_tool_calls (PARTIAL: event_type IN ('tool_call', 'tool_result'))
```

## When to Use Which Database

### Use MySQL When:
- You need maximum write throughput
- Your team is more familiar with MySQL
- You have existing MySQL infrastructure
- JSON queries are simple (basic extraction)
- You prefer simpler schema management
- You're using MySQL replication

### Use PostgreSQL When:
- You need complex JSON queries
- You want partial indexes for optimization
- You need advanced query features (CTEs, window functions)
- You want utility views and functions
- You prefer stronger type safety (ENUMs)
- You need better concurrent read performance
- You want built-in full-text search on events

## Migration Path

### From MySQL to PostgreSQL
1. Export data: `mysqldump --no-create-info`
2. Transform JSON strings to JSONB
3. Convert UUIDs from VARCHAR to UUID type
4. Import using `COPY` or `\i`
5. Rebuild indexes

### From PostgreSQL to MySQL
1. Export data: `pg_dump --data-only`
2. Convert JSONB to JSON strings
3. Convert UUID to VARCHAR
4. Convert ENUMs to strings
5. Import using `LOAD DATA` or `source`

## Performance Tuning

### MySQL Configuration
```ini
[mysqld]
innodb_buffer_pool_size = 2G
innodb_log_file_size = 512M
innodb_flush_log_at_trx_commit = 2
max_connections = 200
query_cache_type = 0  # Disabled in MySQL 8.0+
```

### PostgreSQL Configuration
```ini
shared_buffers = 2GB
effective_cache_size = 6GB
work_mem = 16MB
maintenance_work_mem = 512MB
max_connections = 200
random_page_cost = 1.1  # For SSD
```

## Monitoring Queries

### MySQL
```sql
-- Table sizes
SELECT
  table_name,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
FROM information_schema.tables
WHERE table_schema = 'contextuate_monitor';

-- Index usage (requires query logging)
SHOW INDEX FROM events;
```

### PostgreSQL
```sql
-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public';

-- Index usage stats
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Cache hit ratio
SELECT
  sum(heap_blks_read) as heap_read,
  sum(heap_blks_hit)  as heap_hit,
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
FROM pg_statio_user_tables;
```

## Backup Strategies

### MySQL
```bash
# Logical backup
mysqldump --single-transaction --routines --triggers contextuate_monitor > backup.sql

# Point-in-time recovery (requires binary logging)
mysqlbinlog --start-datetime="2024-01-01 00:00:00" binlog.000001 > recovery.sql
```

### PostgreSQL
```bash
# Logical backup
pg_dump -Fc contextuate_monitor > backup.dump

# Point-in-time recovery (requires WAL archiving)
pg_basebackup -D /backup/base
# Configure recovery.conf with restore_command
```

## Testing Checklist

- [ ] Apply schema to fresh database
- [ ] Insert sample data
- [ ] Verify foreign key constraints
- [ ] Test session hierarchy queries
- [ ] Test event filtering by type
- [ ] Test JSON extraction queries
- [ ] Verify indexes are used (EXPLAIN)
- [ ] Test concurrent writes
- [ ] Benchmark query performance
- [ ] Test backup and restore
- [ ] Verify partitioning (if enabled)

## Support Matrix

| Version | MySQL | PostgreSQL |
|---------|-------|------------|
| **Minimum** | 8.0 | 12 |
| **Recommended** | 8.0.32+ | 15+ |
| **Tested** | 8.0.35, 8.1 | 15.5, 16.1 |

## References

- MySQL JSON: https://dev.mysql.com/doc/refman/8.0/en/json.html
- PostgreSQL JSONB: https://www.postgresql.org/docs/current/datatype-json.html
- PostgreSQL Partial Indexes: https://www.postgresql.org/docs/current/indexes-partial.html
- Type Definitions: `/home/geilt/environment/contextuate/src/types/monitor.ts`
