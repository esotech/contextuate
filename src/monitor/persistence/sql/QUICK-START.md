# Quick Start Guide - SQL Persistence

Fast setup guide for Contextuate Monitor SQL persistence.

## TL;DR - Get Running in 60 Seconds

### MySQL (Docker)
```bash
cd src/monitor/persistence/sql
./setup.sh docker-mysql
```

### PostgreSQL (Docker)
```bash
cd src/monitor/persistence/sql
./setup.sh docker-postgres
```

### Existing Database
```bash
cd src/monitor/persistence/sql
./setup.sh mysql       # or postgres
```

## Configuration

Update your monitor config (`contextuate-monitor.json`):

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
      "password": "your_password"
    }
  }
}
```

## Manual Setup

### MySQL
```bash
# Create database
mysql -u root -p -e "CREATE DATABASE contextuate_monitor;"

# Apply schema
mysql -u root -p contextuate_monitor < mysql-schema.sql

# Optional: Add sample data
mysql -u root -p contextuate_monitor < sample-data.sql
```

### PostgreSQL
```bash
# Create database
psql -U postgres -c "CREATE DATABASE contextuate_monitor;"

# Apply schema
psql -U postgres -d contextuate_monitor -f postgresql-schema.sql

# Optional: Add sample data
psql -U postgres -d contextuate_monitor -f sample-data.sql
```

## Common Queries

### Get All Sessions
```sql
-- MySQL
SELECT session_id, label, status, agent_type,
       token_usage_input + token_usage_output AS total_tokens
FROM sessions
WHERE hidden = FALSE
ORDER BY start_time DESC;

-- PostgreSQL (use view)
SELECT * FROM active_sessions;
```

### Get Events for a Session
```sql
SELECT timestamp, event_type, hook_type, data
FROM events
WHERE session_id = 'your-session-id'
ORDER BY timestamp ASC;
```

### Get Recent Errors
```sql
-- MySQL
SELECT session_id, timestamp,
       JSON_EXTRACT(data, '$.error.message') AS error_message
FROM events
WHERE event_type = 'error'
ORDER BY timestamp DESC
LIMIT 10;

-- PostgreSQL
SELECT session_id, timestamp,
       data->'error'->>'message' AS error_message
FROM events
WHERE event_type = 'error'
ORDER BY timestamp DESC
LIMIT 10;
```

### Get Session Hierarchy
```sql
-- PostgreSQL only
SELECT * FROM session_hierarchy;
```

### Count Events by Type
```sql
-- MySQL
SELECT event_type, COUNT(*) as count
FROM events
WHERE session_id = 'your-session-id'
GROUP BY event_type;

-- PostgreSQL (use function)
SELECT * FROM get_session_event_counts('your-session-id');
```

## Maintenance

### Archive Old Sessions
```sql
-- MySQL (manual)
DELETE FROM events WHERE timestamp < UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 90 DAY)) * 1000;
DELETE FROM sessions WHERE end_time < UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 90 DAY)) * 1000 AND is_pinned = FALSE;

-- PostgreSQL (use function)
SELECT prune_old_sessions(EXTRACT(EPOCH FROM NOW() - INTERVAL '90 days')::BIGINT * 1000);
```

### Optimize Tables
```sql
-- MySQL
OPTIMIZE TABLE sessions, events;

-- PostgreSQL
VACUUM ANALYZE sessions, events;
```

### Check Database Size
```sql
-- MySQL
SELECT
  table_name,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
FROM information_schema.tables
WHERE table_schema = 'contextuate_monitor';

-- PostgreSQL
SELECT pg_size_pretty(pg_database_size('contextuate_monitor'));
```

## Troubleshooting

### Connection Failed
1. Check database is running: `mysql`/`psql`
2. Verify credentials in config
3. Test connection: `mysql -h HOST -u USER -p` or `psql -h HOST -U USER`
4. Check firewall/network settings

### Slow Queries
1. Check indexes exist: `SHOW INDEX FROM events;` (MySQL) or `\di` (PostgreSQL)
2. Analyze query plan: `EXPLAIN SELECT ...`
3. Update statistics: `ANALYZE TABLE` (MySQL) or `ANALYZE` (PostgreSQL)
4. Consider partitioning for large tables (see schema comments)

### Foreign Key Errors
- Ensure parent sessions exist before creating child sessions
- Check `parent_session_id` references valid `session_id`
- For bulk imports, disable foreign key checks temporarily (MySQL only):
  ```sql
  SET foreign_key_checks = 0;
  -- import data
  SET foreign_key_checks = 1;
  ```

### Disk Space Issues
1. Archive old data (see Maintenance section)
2. Drop unused indexes (check `pg_stat_user_indexes` or `SHOW INDEX`)
3. Enable compression (PostgreSQL: `ALTER TABLE events SET (toast_compression = 'lz4');`)

## Performance Tips

### MySQL
- Use connection pooling (10-20 connections)
- Set `innodb_buffer_pool_size = 50-70%` of RAM
- Enable slow query log to identify bottlenecks
- Consider partitioning events table by date

### PostgreSQL
- Use connection pooling with pgBouncer (10-25 connections)
- Set `shared_buffers = 25%` of RAM
- Set `effective_cache_size = 50-75%` of RAM
- Enable `pg_stat_statements` extension
- Use JSONB GIN indexes for complex JSON queries
- Consider native partitioning for events table

## Security Checklist

- [ ] Create dedicated database user with minimal privileges
- [ ] Use strong passwords (20+ characters)
- [ ] Enable SSL/TLS for database connections
- [ ] Restrict network access (bind to localhost or use firewall)
- [ ] Regular automated backups
- [ ] Test restore process
- [ ] Rotate credentials periodically
- [ ] Monitor access logs
- [ ] Keep database software updated

## Docker Commands

### Start Containers
```bash
# MySQL
docker run -d --name contextuate-mysql \
  -e MYSQL_ROOT_PASSWORD=contextuate \
  -e MYSQL_DATABASE=contextuate_monitor \
  -p 3306:3306 mysql:8.0

# PostgreSQL
docker run -d --name contextuate-postgres \
  -e POSTGRES_PASSWORD=contextuate \
  -e POSTGRES_DB=contextuate_monitor \
  -p 5432:5432 postgres:15
```

### Stop Containers
```bash
docker stop contextuate-mysql contextuate-postgres
```

### Remove Containers
```bash
docker rm contextuate-mysql contextuate-postgres
```

### Access Database Shell
```bash
# MySQL
docker exec -it contextuate-mysql mysql -u root -pcontextuate contextuate_monitor

# PostgreSQL
docker exec -it contextuate-postgres psql -U postgres -d contextuate_monitor
```

## Files in This Directory

- **`mysql-schema.sql`** - Complete MySQL schema (226 lines)
- **`postgresql-schema.sql`** - Complete PostgreSQL schema with views/functions (438 lines)
- **`sample-data.sql`** - Test data for both databases (387 lines)
- **`setup.sh`** - Automated setup script (supports both databases + Docker)
- **`README.md`** - Comprehensive documentation (298 lines)
- **`COMPARISON.md`** - MySQL vs PostgreSQL feature comparison
- **`QUICK-START.md`** - This file

## Next Steps

1. Choose your database (MySQL or PostgreSQL)
2. Run setup: `./setup.sh mysql` or `./setup.sh postgres`
3. Update monitor config with database credentials
4. Start monitor: `npx contextuate monitor start`
5. Verify persistence: Check sessions/events tables

## Support

- Schema documentation: `README.md`
- Feature comparison: `COMPARISON.md`
- Type definitions: `/home/geilt/environment/contextuate/src/types/monitor.ts`
- Persistence interface: `/home/geilt/environment/contextuate/src/monitor/persistence/`

---

**Need help?** Read `README.md` for detailed documentation or `COMPARISON.md` for MySQL vs PostgreSQL differences.
