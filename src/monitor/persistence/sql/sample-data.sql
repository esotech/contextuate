-- ============================================================================
-- Contextuate Monitor - Sample Data for Testing
-- ============================================================================
--
-- This file provides sample data for testing the monitor schemas.
-- Use this to verify your database setup and test queries.
--
-- WARNING: This will delete existing data! Only use in test environments.
--
-- ============================================================================

-- Clean existing data
DELETE FROM events;
DELETE FROM sessions;

-- ============================================================================
-- Sample Sessions
-- ============================================================================

-- Root session (user-initiated)
INSERT INTO sessions (
  session_id,
  machine_id,
  working_directory,
  start_time,
  end_time,
  status,
  parent_session_id,
  manual_parent_session_id,
  child_session_ids,
  agent_type,
  is_user_initiated,
  is_pinned,
  hidden,
  label,
  token_usage_input,
  token_usage_output
) VALUES (
  'session-root-001',
  'dev-machine-01',
  '/home/user/project',
  1703001600000,  -- 2023-12-19 12:00:00 UTC
  1703005200000,  -- 2023-12-19 13:00:00 UTC
  'completed',
  NULL,
  NULL,
  -- MySQL: JSON_ARRAY('session-child-001', 'session-child-002')
  -- PostgreSQL: '["session-child-001", "session-child-002"]'::jsonb
  '["session-child-001", "session-child-002"]',
  NULL,
  TRUE,
  TRUE,
  FALSE,
  'Main Development Session',
  15000,
  8000
);

-- Child session 1 (Nexus agent)
INSERT INTO sessions (
  session_id,
  machine_id,
  working_directory,
  start_time,
  end_time,
  status,
  parent_session_id,
  manual_parent_session_id,
  child_session_ids,
  agent_type,
  is_user_initiated,
  is_pinned,
  hidden,
  label,
  token_usage_input,
  token_usage_output
) VALUES (
  'session-child-001',
  'dev-machine-01',
  '/home/user/project',
  1703001700000,
  1703003400000,
  'completed',
  'session-root-001',
  NULL,
  '[]',
  'nexus',
  FALSE,
  FALSE,
  FALSE,
  NULL,
  5000,
  3000
);

-- Child session 2 (Canvas agent)
INSERT INTO sessions (
  session_id,
  machine_id,
  working_directory,
  start_time,
  end_time,
  status,
  parent_session_id,
  manual_parent_session_id,
  child_session_ids,
  agent_type,
  is_user_initiated,
  is_pinned,
  hidden,
  label,
  token_usage_input,
  token_usage_output
) VALUES (
  'session-child-002',
  'dev-machine-01',
  '/home/user/project',
  1703003500000,
  NULL,
  'active',
  'session-root-001',
  NULL,
  '[]',
  'canvas',
  FALSE,
  FALSE,
  FALSE,
  NULL,
  3000,
  2000
);

-- Hidden session (for testing filters)
INSERT INTO sessions (
  session_id,
  machine_id,
  working_directory,
  start_time,
  end_time,
  status,
  parent_session_id,
  manual_parent_session_id,
  child_session_ids,
  agent_type,
  is_user_initiated,
  is_pinned,
  hidden,
  label,
  token_usage_input,
  token_usage_output
) VALUES (
  'session-hidden-001',
  'dev-machine-01',
  '/home/user/project',
  1702995000000,
  1702998600000,
  'completed',
  NULL,
  NULL,
  '[]',
  NULL,
  TRUE,
  FALSE,
  TRUE,
  'Hidden Test Session',
  1000,
  500
);

-- ============================================================================
-- Sample Events
-- ============================================================================

-- Session start event (root)
-- Note: Use gen_random_uuid() for PostgreSQL, or specify UUID for MySQL
INSERT INTO events (
  id,
  session_id,
  timestamp,
  event_type,
  hook_type,
  parent_session_id,
  machine_id,
  working_directory,
  data
) VALUES (
  -- MySQL: '550e8400-e29b-41d4-a716-446655440001'
  -- PostgreSQL: gen_random_uuid() or '550e8400-e29b-41d4-a716-446655440001'::uuid
  '550e8400-e29b-41d4-a716-446655440001',
  'session-root-001',
  1703001600000,
  'session_start',
  'Notification',
  NULL,
  'dev-machine-01',
  '/home/user/project',
  -- MySQL: JSON_OBJECT('message', 'Session started', 'thinking', 'Starting new development session')
  -- PostgreSQL: '{"message": "Session started", "thinking": "Starting new development session"}'::jsonb
  '{"message": "Session started", "thinking": "Starting new development session"}'
);

-- Tool call event
INSERT INTO events (
  id,
  session_id,
  timestamp,
  event_type,
  hook_type,
  parent_session_id,
  machine_id,
  working_directory,
  data
) VALUES (
  '550e8400-e29b-41d4-a716-446655440002',
  'session-root-001',
  1703001650000,
  'tool_call',
  'PreToolUse',
  NULL,
  'dev-machine-01',
  '/home/user/project',
  '{"toolName": "Read", "toolInput": {"file_path": "/home/user/project/src/index.ts"}}'
);

-- Tool result event
INSERT INTO events (
  id,
  session_id,
  timestamp,
  event_type,
  hook_type,
  parent_session_id,
  machine_id,
  working_directory,
  data
) VALUES (
  '550e8400-e29b-41d4-a716-446655440003',
  'session-root-001',
  1703001651000,
  'tool_result',
  'PostToolUse',
  NULL,
  'dev-machine-01',
  '/home/user/project',
  '{"toolName": "Read", "toolOutput": "File contents here...", "tokenUsage": {"input": 150, "output": 50}}'
);

-- Agent spawn event
INSERT INTO events (
  id,
  session_id,
  timestamp,
  event_type,
  hook_type,
  parent_session_id,
  machine_id,
  working_directory,
  data
) VALUES (
  '550e8400-e29b-41d4-a716-446655440004',
  'session-root-001',
  1703001700000,
  'agent_spawn',
  'Notification',
  NULL,
  'dev-machine-01',
  '/home/user/project',
  '{"subagent": {"type": "nexus", "prompt": "Analyze the codebase structure"}}'
);

-- Child session event
INSERT INTO events (
  id,
  session_id,
  timestamp,
  event_type,
  hook_type,
  parent_session_id,
  machine_id,
  working_directory,
  data
) VALUES (
  '550e8400-e29b-41d4-a716-446655440005',
  'session-child-001',
  1703001750000,
  'tool_call',
  'PreToolUse',
  'session-root-001',
  'dev-machine-01',
  '/home/user/project',
  '{"toolName": "Glob", "toolInput": {"pattern": "**/*.ts"}}'
);

-- Error event
INSERT INTO events (
  id,
  session_id,
  timestamp,
  event_type,
  hook_type,
  parent_session_id,
  machine_id,
  working_directory,
  data
) VALUES (
  '550e8400-e29b-41d4-a716-446655440006',
  'session-child-001',
  1703002000000,
  'error',
  'Notification',
  'session-root-001',
  'dev-machine-01',
  '/home/user/project',
  '{"error": {"code": "ENOENT", "message": "File not found: /nonexistent/file.ts"}}'
);

-- Session end event
INSERT INTO events (
  id,
  session_id,
  timestamp,
  event_type,
  hook_type,
  parent_session_id,
  machine_id,
  working_directory,
  data
) VALUES (
  '550e8400-e29b-41d4-a716-446655440007',
  'session-root-001',
  1703005200000,
  'session_end',
  'Stop',
  NULL,
  'dev-machine-01',
  '/home/user/project',
  '{"message": "Session completed", "tokenUsage": {"input": 15000, "output": 8000}}'
);

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Count sessions
-- SELECT COUNT(*) AS session_count FROM sessions;

-- Count events
-- SELECT COUNT(*) AS event_count FROM events;

-- Get all sessions with child count
-- SELECT
--   session_id,
--   label,
--   status,
--   agent_type,
--   -- MySQL: JSON_LENGTH(child_session_ids)
--   -- PostgreSQL: jsonb_array_length(child_session_ids)
--   token_usage_input + token_usage_output AS total_tokens
-- FROM sessions
-- ORDER BY start_time DESC;

-- Get events for root session
-- SELECT
--   timestamp,
--   event_type,
--   hook_type,
--   -- MySQL: JSON_EXTRACT(data, '$.toolName')
--   -- PostgreSQL: data->>'toolName'
--   data
-- FROM events
-- WHERE session_id = 'session-root-001'
-- ORDER BY timestamp ASC;

-- Get session hierarchy
-- PostgreSQL only (use session_hierarchy view):
-- SELECT * FROM session_hierarchy;

-- Get recent errors
-- SELECT
--   session_id,
--   timestamp,
--   -- MySQL: JSON_EXTRACT(data, '$.error.message')
--   -- PostgreSQL: data->'error'->>'message'
--   data
-- FROM events
-- WHERE event_type = 'error'
-- ORDER BY timestamp DESC;
