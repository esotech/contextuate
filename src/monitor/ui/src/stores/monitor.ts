import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { MonitorEvent, SessionMeta, ServerMessage, ClientMessage, MonitorEventType, WrapperInfo, WrapperState } from '../../../../types/monitor';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface FilterState {
  eventTypes: MonitorEventType[];
  sessionIds: string[];
  searchQuery: string;
  timeRange: {
    start: number | null;
    end: number | null;
  };
}

export const useMonitorStore = defineStore('monitor', () => {
  // Connection state
  const connectionStatus = ref<ConnectionStatus>('disconnected');
  const ws = ref<WebSocket | null>(null);
  const reconnectAttempts = ref(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 2000;

  // Data state
  const sessions = ref<SessionMeta[]>([]);
  const events = ref<MonitorEvent[]>([]);
  const selectedSessionId = ref<string | null>(null);
  const mode = ref<'local' | 'redis'>('local');
  const autoScroll = ref(true);
  const showHidden = ref<boolean>(false);
  const showInactiveOnly = ref<boolean>(false);
  const ctrlPressed = ref<boolean>(false);
  const hiddenSessionIds = ref<Set<string>>(new Set());
  const eventDetails = ref<Map<string, MonitorEvent>>(new Map());
  const loadingDetails = ref<Set<string>>(new Set());

  // Wrapper state
  const wrappers = ref<WrapperInfo[]>([]);
  const selectedWrapperId = ref<string | null>(null);
  const wrapperOutputBuffers = ref<Map<string, string[]>>(new Map());
  const lastWrapperOutput = ref<{ wrapperId: string; data: string } | null>(null);

  // Filter state
  const filters = ref<FilterState>({
    eventTypes: [],
    sessionIds: [],
    searchQuery: '',
    timeRange: {
      start: null,
      end: null,
    },
  });

  // Computed
  const selectedSession = computed(() => {
    if (!selectedSessionId.value) return null;
    return sessions.value.find(s => s.sessionId === selectedSessionId.value) || null;
  });

  const filteredEvents = computed(() => {
    let result = [...events.value];

    // Filter by selected session
    if (selectedSessionId.value) {
      result = result.filter(e => e.sessionId === selectedSessionId.value);
    }

    // Filter by event types
    if (filters.value.eventTypes.length > 0) {
      result = result.filter(e => filters.value.eventTypes.includes(e.eventType));
    }

    // Filter by search query
    if (filters.value.searchQuery) {
      const query = filters.value.searchQuery.toLowerCase();
      result = result.filter(e => {
        const searchable = [
          e.eventType,
          e.data.toolName,
          e.data.message,
          JSON.stringify(e.data.toolInput),
        ].filter(Boolean).join(' ').toLowerCase();
        return searchable.includes(query);
      });
    }

    // Filter by time range
    if (filters.value.timeRange.start) {
      result = result.filter(e => e.timestamp >= filters.value.timeRange.start!);
    }
    if (filters.value.timeRange.end) {
      result = result.filter(e => e.timestamp <= filters.value.timeRange.end!);
    }

    // Sort by timestamp - oldest first for auto-scroll to work correctly
    return result.sort((a, b) => a.timestamp - b.timestamp);
  });

  const activeSessions = computed(() => {
    return sessions.value.filter(s => s.status === 'active');
  });

  // Helper to check if a session has active children (recursive)
  function hasActiveChildren(sessionId: string, allSessions: SessionMeta[]): boolean {
    const session = allSessions.find(s => s.sessionId === sessionId);
    if (!session) return false;

    for (const childId of session.childSessionIds) {
      const child = allSessions.find(s => s.sessionId === childId);
      if (child?.status === 'active') return true;
      if (hasActiveChildren(childId, allSessions)) return true;
    }
    return false;
  }

  const sessionHierarchy = computed(() => {
    // Filter sessions based on visibility settings
    let filteredSessions = sessions.value;

    // Filter hidden sessions
    if (!showHidden.value) {
      filteredSessions = filteredSessions.filter(s => !hiddenSessionIds.value.has(s.sessionId));
    }

    // Filter by active/inactive
    if (showInactiveOnly.value) {
      filteredSessions = filteredSessions.filter(s => s.status !== 'active');
    }

    // Build a set of all session IDs for quick lookup
    const sessionIds = new Set(filteredSessions.map(s => s.sessionId));

    // Build parent-child relationships
    // A session is a "root" if it has no parent OR its parent doesn't exist in our data (orphaned)
    const rootSessions = filteredSessions.filter(s =>
      !s.parentSessionId || !sessionIds.has(s.parentSessionId)
    );
    const childMap = new Map<string, SessionMeta[]>();

    filteredSessions.forEach(s => {
      // Only add to childMap if parent exists in our session list
      if (s.parentSessionId && sessionIds.has(s.parentSessionId)) {
        const children = childMap.get(s.parentSessionId) || [];
        children.push(s);
        childMap.set(s.parentSessionId, children);
      }
    });

    // Identify primary sessions: pinned, user-initiated, active, or has active children
    // For sessions without isUserInitiated set, treat root sessions as user-initiated by default
    const primarySessions = rootSessions.filter(s =>
      s.isPinned === true ||
      s.isUserInitiated === true ||
      (s.isUserInitiated === undefined && !s.parentSessionId) || // Legacy: root = user-initiated
      s.status === 'active' ||
      hasActiveChildren(s.sessionId, filteredSessions)
    );

    // Sort primary sessions: active first, then by start time
    primarySessions.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (b.status === 'active' && a.status !== 'active') return 1;
      return b.startTime - a.startTime;
    });

    // Other root sessions (not primary)
    const primaryIds = new Set(primarySessions.map(s => s.sessionId));
    const otherSessions = rootSessions.filter(s => !primaryIds.has(s.sessionId));

    return { rootSessions, primarySessions, otherSessions, childMap };
  });

  const toolEvents = computed(() => {
    return events.value.filter(e => e.eventType === 'tool_call' || e.eventType === 'tool_result');
  });

  const tokenTotals = computed(() => {
    const totals = {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
    };

    sessions.value.forEach(session => {
      totals.input += session.tokenUsage?.totalInput || 0;
      totals.output += session.tokenUsage?.totalOutput || 0;
      totals.cacheRead += session.tokenUsage?.totalCacheRead || 0;
      // totalCacheCreation maps to cacheWrite for display
      totals.cacheWrite += session.tokenUsage?.totalCacheCreation || 0;
    });

    return totals;
  });

  // Actions
  function connect() {
    if (ws.value?.readyState === WebSocket.OPEN) return;

    connectionStatus.value = 'connecting';

    const wsUrl = import.meta.env.DEV
      ? 'ws://localhost:3848'
      : `ws://${window.location.hostname}:3848`;

    ws.value = new WebSocket(wsUrl);

    ws.value.onopen = () => {
      connectionStatus.value = 'connected';
      reconnectAttempts.value = 0;

      // Subscribe to all sessions
      send({ type: 'subscribe' });
      send({ type: 'get_sessions' });
      // Load recent events from persistence
      send({ type: 'get_all_recent_events', limit: 200 });
      // Request current active wrappers
      send({ type: 'get_wrappers' });
    };

    ws.value.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        handleMessage(message);
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.value.onclose = () => {
      connectionStatus.value = 'disconnected';
      ws.value = null;

      // Attempt reconnection
      if (reconnectAttempts.value < maxReconnectAttempts) {
        reconnectAttempts.value++;
        setTimeout(connect, reconnectDelay * reconnectAttempts.value);
      }
    };

    ws.value.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
  }

  function disconnect() {
    if (ws.value) {
      ws.value.close();
      ws.value = null;
    }
    connectionStatus.value = 'disconnected';
  }

  function send(message: ClientMessage) {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(message));
    }
  }

  function handleMessage(message: ServerMessage) {
    switch (message.type) {
      case 'sessions':
        sessions.value = message.sessions;
        break;

      case 'session_update':
        const idx = sessions.value.findIndex(s => s.sessionId === message.session.sessionId);
        if (idx >= 0) {
          sessions.value[idx] = message.session;
        } else {
          sessions.value.push(message.session);
        }
        break;

      case 'event':
        console.log(`[Monitor] Received real-time event: ${message.event.eventType} (session: ${message.event.sessionId})`);
        events.value.push(message.event);
        // Keep only last 1000 events to prevent memory issues
        if (events.value.length > 1000) {
          events.value = events.value.slice(-1000);
        }
        break;

      case 'events':
        // Merge events, avoiding duplicates
        const existingIds = new Set(events.value.map(e => e.id));
        const newEvents = message.events.filter(e => !existingIds.has(e.id));
        events.value = [...events.value, ...newEvents].sort((a, b) => a.timestamp - b.timestamp);
        break;

      case 'all_events':
        // Merge all recent events from persistence, avoiding duplicates
        console.log(`[Monitor] Received ${message.events.length} events from get_all_recent_events`);
        const existingEventIds = new Set(events.value.map(e => e.id));
        const loadedEvents = message.events.filter(e => !existingEventIds.has(e.id));
        events.value = [...events.value, ...loadedEvents].sort((a, b) => a.timestamp - b.timestamp);
        console.log(`[Monitor] Total events now: ${events.value.length}`);
        break;

      case 'event_detail':
        eventDetails.value.set(message.event.id, message.event);
        loadingDetails.value.delete(message.event.id);
        break;

      case 'sessions_updated':
        // Replace entire sessions list (for bulk operations like hide all/delete all)
        sessions.value = message.sessions;
        break;

      case 'error':
        console.error('Server error:', message.message);
        break;

      // Wrapper messages
      case 'wrappers':
        wrappers.value = message.wrappers;
        break;

      case 'wrapper_connected':
        console.log(`[Monitor] Wrapper connected: ${message.wrapperId}`);
        wrappers.value.push({
          wrapperId: message.wrapperId,
          state: message.state,
          claudeSessionId: null,
        });
        // Initialize output buffer
        wrapperOutputBuffers.value.set(message.wrapperId, []);
        break;

      case 'wrapper_disconnected':
        console.log(`[Monitor] Wrapper disconnected: ${message.wrapperId}`);
        wrappers.value = wrappers.value.filter(w => w.wrapperId !== message.wrapperId);
        wrapperOutputBuffers.value.delete(message.wrapperId);
        if (selectedWrapperId.value === message.wrapperId) {
          selectedWrapperId.value = null;
        }
        break;

      case 'wrapper_state':
        console.log(`[Monitor] Wrapper ${message.wrapperId} state: ${message.state}`);
        const wrapperIdx = wrappers.value.findIndex(w => w.wrapperId === message.wrapperId);
        if (wrapperIdx >= 0) {
          wrappers.value[wrapperIdx].state = message.state;
          if (message.claudeSessionId) {
            wrappers.value[wrapperIdx].claudeSessionId = message.claudeSessionId;
          }
        }
        break;

      case 'wrapper_output':
        // Handle terminal output - store raw data for xterm.js
        const buffer = wrapperOutputBuffers.value.get(message.wrapperId);
        if (buffer) {
          const data = message.data;
          buffer.push(data);

          // Keep buffer size reasonable
          if (buffer.length > 500) {
            buffer.splice(0, buffer.length - 500);
          }

          // Update lastWrapperOutput for reactive watching
          lastWrapperOutput.value = { wrapperId: message.wrapperId, data };
        }
        break;

      case 'wrapper_spawned':
        console.log(`[Monitor] Wrapper spawn result:`, message);
        if (message.success && message.wrapperId) {
          // The wrapper_connected event will add it to the list
          // Auto-select the newly spawned wrapper
          selectedWrapperId.value = message.wrapperId;
        } else if (message.error) {
          console.error(`[Monitor] Failed to spawn wrapper: ${message.error}`);
        }
        break;
    }
  }

  function selectSession(sessionId: string | null) {
    selectedSessionId.value = sessionId;

    if (sessionId) {
      // Request historical events for this session
      send({ type: 'get_events', sessionId, limit: 500 });
    }
  }

  function setFilter(key: keyof FilterState, value: FilterState[keyof FilterState]) {
    (filters.value as Record<string, unknown>)[key] = value;
  }

  function toggleEventTypeFilter(eventType: MonitorEventType) {
    const idx = filters.value.eventTypes.indexOf(eventType);
    if (idx >= 0) {
      filters.value.eventTypes.splice(idx, 1);
    } else {
      filters.value.eventTypes.push(eventType);
    }
  }

  function clearFilters() {
    filters.value = {
      eventTypes: [],
      sessionIds: [],
      searchQuery: '',
      timeRange: { start: null, end: null },
    };
  }

  function setAutoScroll(value: boolean) {
    autoScroll.value = value;
  }

  function clearEvents() {
    events.value = [];
  }

  function hideSession(sessionId: string) {
    hiddenSessionIds.value.add(sessionId);
    send({ type: 'hide_session', sessionId } as ClientMessage);
  }

  function deleteSession(sessionId: string) {
    // Remove from local state
    sessions.value = sessions.value.filter(s => s.sessionId !== sessionId);
    events.value = events.value.filter(e => e.sessionId !== sessionId);
    hiddenSessionIds.value.delete(sessionId);

    // If this was the selected session, clear selection
    if (selectedSessionId.value === sessionId) {
      selectedSessionId.value = null;
    }

    send({ type: 'delete_session', sessionId } as ClientMessage);
  }

  function hideAllSessions() {
    const visibleSessionIds = sessionHierarchy.value.rootSessions.map(s => s.sessionId);
    visibleSessionIds.forEach(id => hiddenSessionIds.value.add(id));
    send({ type: 'hide_all_sessions' } as ClientMessage);
  }

  function deleteAllSessions() {
    const visibleSessionIds = sessionHierarchy.value.rootSessions.map(s => s.sessionId);
    sessions.value = sessions.value.filter(s => !visibleSessionIds.includes(s.sessionId));
    events.value = events.value.filter(e => !visibleSessionIds.includes(e.sessionId));
    visibleSessionIds.forEach(id => hiddenSessionIds.value.delete(id));
    selectedSessionId.value = null;
    send({ type: 'delete_all_sessions' } as ClientMessage);
  }

  function unhideSession(sessionId: string) {
    hiddenSessionIds.value.delete(sessionId);
    send({ type: 'unhide_session', sessionId } as ClientMessage);
  }

  function toggleShowHidden() {
    showHidden.value = !showHidden.value;
  }

  function toggleShowInactive() {
    showInactiveOnly.value = !showInactiveOnly.value;
  }

  function setCtrlPressed(pressed: boolean) {
    ctrlPressed.value = pressed;
  }

  // Manual grouping actions
  function setSessionParent(sessionId: string, parentSessionId: string | null) {
    send({ type: 'set_parent', sessionId, parentSessionId });
  }

  function toggleSessionPin(sessionId: string) {
    send({ type: 'toggle_pin', sessionId });
  }

  function setUserInitiated(sessionId: string, isUserInitiated: boolean) {
    send({ type: 'set_user_initiated', sessionId, isUserInitiated });
  }

  function renameSession(sessionId: string, label: string) {
    send({ type: 'rename_session', sessionId, label });
  }

  // Drag state for drag-and-drop grouping
  const draggedSessionId = ref<string | null>(null);

  function setDraggedSession(sessionId: string | null) {
    draggedSessionId.value = sessionId;
  }

  function requestEventDetail(sessionId: string, eventId: string) {
    if (eventDetails.value.has(eventId)) return; // Already loaded
    if (loadingDetails.value.has(eventId)) return; // Already loading

    loadingDetails.value.add(eventId);
    send({ type: 'get_event_detail', sessionId, eventId });
  }

  function getEventDetail(eventId: string): MonitorEvent | undefined {
    return eventDetails.value.get(eventId);
  }

  // Wrapper actions
  function selectWrapper(wrapperId: string | null) {
    selectedWrapperId.value = wrapperId;
  }

  function injectInput(wrapperId: string, input: string) {
    // Direct passthrough - send input immediately without state checks
    // This allows typing directly into the terminal at any time
    send({ type: 'inject_input', wrapperId, input });
  }

  function resizeWrapper(wrapperId: string, cols: number, rows: number) {
    // Notify daemon to resize the PTY
    send({ type: 'resize_wrapper', wrapperId, cols, rows } as any);
  }

  function getWrapperOutput(wrapperId: string): string {
    const buffer = wrapperOutputBuffers.value.get(wrapperId);
    return buffer ? buffer.join('') : '';
  }

  function getRawWrapperOutput(wrapperId: string): string {
    const buffer = wrapperOutputBuffers.value.get(wrapperId);
    return buffer ? buffer.join('') : '';
  }

  function getWrapperOutputChunks(wrapperId: string): string[] {
    const buffer = wrapperOutputBuffers.value.get(wrapperId);
    return buffer ? [...buffer] : [];
  }

  function spawnWrapper(options: { cwd?: string; args?: string[]; cols?: number; rows?: number } = {}) {
    send({
      type: 'spawn_wrapper',
      cwd: options.cwd,
      args: options.args,
      cols: options.cols,
      rows: options.rows,
    } as ClientMessage);
  }

  function killWrapper(wrapperId: string) {
    send({ type: 'kill_wrapper', wrapperId } as ClientMessage);
  }

  // Computed for selected wrapper
  const selectedWrapper = computed(() => {
    if (!selectedWrapperId.value) return null;
    return wrappers.value.find(w => w.wrapperId === selectedWrapperId.value) || null;
  });

  // Active wrappers (not ended)
  const activeWrappers = computed(() => {
    return wrappers.value.filter(w => w.state !== 'ended');
  });

  // Wrappers waiting for input
  const wrappersWaitingInput = computed(() => {
    return wrappers.value.filter(w => w.state === 'waiting_input');
  });

  return {
    // State
    connectionStatus,
    sessions,
    events,
    selectedSessionId,
    mode,
    autoScroll,
    filters,
    showHidden,
    showInactiveOnly,
    ctrlPressed,
    hiddenSessionIds,
    draggedSessionId,
    eventDetails,
    loadingDetails,
    wrappers,
    selectedWrapperId,
    wrapperOutputBuffers,

    // Computed
    selectedSession,
    filteredEvents,
    activeSessions,
    sessionHierarchy,
    toolEvents,
    tokenTotals,
    selectedWrapper,
    activeWrappers,
    wrappersWaitingInput,

    // Actions
    connect,
    disconnect,
    send,
    selectSession,
    setFilter,
    toggleEventTypeFilter,
    clearFilters,
    setAutoScroll,
    clearEvents,
    hideSession,
    deleteSession,
    hideAllSessions,
    deleteAllSessions,
    unhideSession,
    toggleShowHidden,
    toggleShowInactive,
    setCtrlPressed,
    setSessionParent,
    toggleSessionPin,
    setUserInitiated,
    renameSession,
    setDraggedSession,
    requestEventDetail,
    getEventDetail,
    selectWrapper,
    injectInput,
    resizeWrapper,
    getWrapperOutput,
    getRawWrapperOutput,
    getWrapperOutputChunks,
    lastWrapperOutput,
    spawnWrapper,
    killWrapper,
  };
});
