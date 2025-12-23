# Broker Refactor Summary

## Overview

The broker (`src/monitor/server/broker.ts`) has been refactored to work with the new 3-layer architecture where the daemon handles event processing.

## Changes Made

### Removed (Now Handled by Daemon)

1. **Event Processing Logic**
   - Removed `pendingSubagentSpawns` tracking
   - Removed `activeSubagentStack` and related methods
   - Removed `handleEvent()` processing logic
   - Removed `updateSession()` complex correlation logic
   - Removed `trackSubagentSpawn()`, `startSubagentContext()`, `endSubagentContext()`
   - Removed `correlateWithPendingSpawn()`, `directoriesShareProject()`
   - Removed `generateVirtualSessionId()`, `getActiveSubagent()`, `cleanupPendingSpawns()`

2. **IPC Adapter Management**
   - Removed Unix socket and Redis adapter initialization
   - No longer starts IPC adapters (daemon handles that)
   - Removed `adapter` property and related code

### Kept (Session Management)

1. **Session Management Methods**
   - `loadSessions()` - Load from disk on startup
   - `renameSession()` - Rename/label a session
   - `togglePin()` - Pin/unpin session
   - `setUserInitiated()` - Mark as primary/sub-agent
   - `setParentSession()` - Manually set parent
   - `hideSession()` / `unhideSession()` - Hide/show session
   - `deleteSession()` - Delete session
   - `hideAllSessions()` / `deleteAllSessions()` - Bulk operations
   - `persistSession()` - Save session to disk

2. **Session Access Methods**
   - `getSessions()` - Get all sessions (with optional hidden filter)
   - `getSession()` - Get specific session by ID
   - `getConfig()` - Get broker configuration

3. **Handler Management**
   - `onEvent()` - Register event handlers for WebSocket broadcasting
   - `emit()` - Emit events to registered handlers

### Added (Daemon Integration)

1. **Daemon Socket Connection**
   - `connectToDaemon()` - Connect to daemon Unix socket
   - `handleDaemonMessage()` - Handle messages from daemon
   - `scheduleDaemonReconnect()` - Auto-reconnect on disconnect

2. **Properties**
   - `daemonSocket` - Connection to daemon
   - `reconnectTimeout` - Reconnection timer

## New Architecture Flow

### Old Flow (Removed)
```
Hook Script → Unix Socket → Broker (processes) → Persistence + WebSocket
```

### New Flow
```
Hook Script → Daemon (processes) → Broker (manages sessions) → WebSocket
                                  ↓
                             Persistence
```

## How It Works Now

1. **Startup**
   - Broker loads sessions from disk via persistence layer
   - Attempts to connect to daemon socket at `/tmp/contextuate-daemon.sock`
   - If daemon not running, logs error and retries every 5 seconds

2. **Runtime**
   - Daemon sends processed events and session updates via socket
   - Broker updates local session cache
   - Broker broadcasts to WebSocket clients
   - All event processing (correlation, parent linking, etc.) is in daemon

3. **Session Management**
   - UI actions (rename, pin, hide, delete, set parent) update broker state
   - Changes persisted to disk
   - Updates broadcast to WebSocket clients

## Benefits

1. **Separation of Concerns**
   - Broker focuses on session management and UI communication
   - Daemon handles complex event processing
   - Clearer responsibilities

2. **Resilience**
   - Broker can start without daemon running
   - Auto-reconnects when daemon becomes available
   - Can work offline with cached sessions

3. **Simpler Code**
   - Removed ~400 lines of complex correlation logic
   - Easier to understand and maintain
   - Session management methods are cleaner

## Migration Notes

- No changes needed to existing session management API
- WebSocket protocol remains the same
- Persistence layer interface unchanged
- UI will work with or without daemon running (just won't get new events without daemon)
