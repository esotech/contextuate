<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useMonitorStore } from '../stores/monitor';
import type { MonitorEvent } from '../../../../types/monitor';

const store = useMonitorStore();
const eventListRef = ref<HTMLElement | null>(null);

const events = computed(() => store.filteredEvents);
const autoScroll = computed(() => store.autoScroll);

const expandedEvents = ref<Set<string>>(new Set());

function toggleExpand(event: MonitorEvent) {
  if (expandedEvents.value.has(event.id)) {
    expandedEvents.value.delete(event.id);
  } else {
    expandedEvents.value.add(event.id);
    // Request full details if not already loaded
    store.requestEventDetail(event.sessionId, event.id);
  }
}

// Helper to get full event with details
function getFullEvent(eventId: string): MonitorEvent | undefined {
  return store.getEventDetail(eventId) || events.value.find(e => e.id === eventId);
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${time}.${ms}`;
}

function getEventIcon(eventType: string): string {
  const icons: Record<string, string> = {
    session_start: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z',
    session_end: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10h6v4H9v-4z',
    tool_call: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    tool_result: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    message: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    notification: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    thinking: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
    error: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    agent_spawn: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    agent_complete: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
    subagent_start: 'M13 10V3L4 14h7v7l9-11h-7z',
    subagent_stop: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  };
  return icons[eventType] || icons.message;
}

function getToolBadgeClass(toolName: string): string {
  const name = toolName.toLowerCase();
  if (name.includes('read')) return 'tool-badge-read';
  if (name.includes('write')) return 'tool-badge-write';
  if (name.includes('bash')) return 'tool-badge-bash';
  if (name.includes('edit')) return 'tool-badge-edit';
  return 'tool-badge-other';
}

function formatJson(obj: unknown): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

function getAgentName(event: MonitorEvent): string | null {
  let agentType: string | null = null;

  // Direct subagent info from event data
  if (event.data.subagent?.type) {
    agentType = event.data.subagent.type;
  }
  // For Task tool calls, extract from toolInput
  else if (event.data.toolName === 'Task') {
    const input = event.data.toolInput as Record<string, unknown> | undefined;
    if (input?.subagent_type) {
      agentType = String(input.subagent_type);
    }
  }
  // Fallback: try to get from session metadata
  else {
    const session = store.sessions.find(s => s.sessionId === event.sessionId);
    if (session?.agentType) {
      agentType = session.agentType;
    }
  }

  // Normalize to lowercase for consistent display
  return agentType ? agentType.toLowerCase() : null;
}

function getToolDetail(event: MonitorEvent): string {
  const input = event.data.toolInput as Record<string, unknown> | undefined;
  if (!input) return '';

  const toolName = event.data.toolName?.toLowerCase() || '';

  // Read tool - show file path
  if (toolName === 'read' && input.file_path) {
    const filePath = String(input.file_path);
    // Truncate path if too long, keeping the filename visible
    const parts = filePath.split('/');
    if (parts.length > 3) {
      return `.../${parts.slice(-2).join('/')}`;
    }
    return filePath;
  }

  // Write tool - show file path
  if (toolName === 'write' && input.file_path) {
    const filePath = String(input.file_path);
    const parts = filePath.split('/');
    if (parts.length > 3) {
      return `.../${parts.slice(-2).join('/')}`;
    }
    return filePath;
  }

  // Edit tool - show file path
  if (toolName === 'edit' && input.file_path) {
    const filePath = String(input.file_path);
    const parts = filePath.split('/');
    if (parts.length > 3) {
      return `.../${parts.slice(-2).join('/')}`;
    }
    return filePath;
  }

  // Bash tool - show command (truncated)
  if (toolName === 'bash' && input.command) {
    const cmd = String(input.command);
    return cmd.length > 60 ? cmd.slice(0, 60) + '...' : cmd;
  }

  // Grep tool - show pattern
  if (toolName === 'grep' && input.pattern) {
    return `"${input.pattern}"`;
  }

  // Glob tool - show pattern
  if (toolName === 'glob' && input.pattern) {
    return `"${input.pattern}"`;
  }

  // Task tool - show subagent type
  if (toolName === 'task' && input.subagent_type) {
    return String(input.subagent_type);
  }

  return '';
}

function getEventSummary(event: MonitorEvent): string {
  const toolDetail = getToolDetail(event);

  switch (event.eventType) {
    case 'tool_call':
      return toolDetail ? `${event.data.toolName}: ${toolDetail}` : `Calling ${event.data.toolName}`;
    case 'tool_result':
      return toolDetail ? `${event.data.toolName}: ${toolDetail}` : `${event.data.toolName} completed`;
    case 'session_start':
      return 'Session started';
    case 'session_end':
      return 'Session ended';
    case 'message':
      return event.data.message?.slice(0, 100) || 'Message';
    case 'notification':
      return event.data.message || 'Notification';
    case 'thinking':
      return 'Thinking...';
    case 'error':
      return event.data.error?.message || 'Error occurred';
    case 'agent_spawn':
      return `Spawned ${event.data.subagent?.type?.toLowerCase() || 'subagent'}`;
    case 'agent_complete':
      return 'subagent completed';
    case 'subagent_start':
      return `${event.data.subagent?.type?.toLowerCase() || 'subagent'} started`;
    case 'subagent_stop':
      return `${event.data.subagent?.type?.toLowerCase() || 'subagent'} completed`;
    default:
      return event.eventType;
  }
}

function navigateToSpawnedSession(event: MonitorEvent) {
  const subagentType = event.data.subagent?.type?.toLowerCase();
  const eventTime = event.timestamp;

  // Find child session spawned by this Task event
  const childSession = store.sessions.find(s =>
    s.parentSessionId === event.sessionId &&
    s.agentType?.toLowerCase() === subagentType &&
    Math.abs(s.startTime - eventTime) < 5000
  );

  if (childSession) {
    store.selectSession(childSession.sessionId);
  }
}

// Auto-scroll when new events arrive
watch(events, async () => {
  if (autoScroll.value && eventListRef.value) {
    await nextTick();
    eventListRef.value.scrollTop = eventListRef.value.scrollHeight;
  }
});
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <div class="p-3 border-b border-slate-700 flex items-center justify-between">
      <h2 class="text-sm font-medium text-monitor-text-secondary uppercase tracking-wide">
        Event Stream
        <span class="text-monitor-text-muted ml-2">({{ events.length }})</span>
      </h2>
      <div class="flex items-center space-x-3">
        <button
          class="text-xs px-2 py-1 rounded"
          :class="autoScroll ? 'bg-monitor-accent-cyan text-white' : 'bg-slate-700 text-monitor-text-secondary'"
          @click="store.setAutoScroll(!autoScroll)"
        >
          Auto-scroll
        </button>
        <button
          class="text-xs px-2 py-1 rounded bg-slate-700 text-monitor-text-secondary hover:bg-slate-600"
          @click="store.clearEvents()"
        >
          Clear
        </button>
      </div>
    </div>

    <!-- Event List -->
    <div
      ref="eventListRef"
      class="flex-1 overflow-y-auto p-2 space-y-1"
    >
      <div
        v-if="events.length === 0"
        class="text-monitor-text-muted text-sm p-4 text-center"
      >
        Waiting for events...
      </div>

      <div
        v-for="event in events"
        :key="event.id"
        class="group rounded-lg bg-monitor-bg-secondary hover:bg-slate-700/70 transition-colors animate-fade-in"
      >
        <!-- Event Header (always visible) -->
        <div
          class="flex items-center px-3 py-2 cursor-pointer"
          @click="toggleExpand(event)"
        >
          <!-- Timestamp -->
          <span class="text-xs text-monitor-text-muted font-mono w-24 flex-shrink-0">
            {{ formatTime(event.timestamp) }}
          </span>

          <!-- Event Icon -->
          <svg
            class="w-4 h-4 mr-2 flex-shrink-0"
            :class="`event-${event.eventType}`"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              :d="getEventIcon(event.eventType)"
            />
          </svg>

          <!-- Event Type Badge -->
          <span
            class="text-xs px-1.5 py-0.5 rounded mr-2 flex-shrink-0"
            :class="`event-${event.eventType} bg-slate-800`"
          >
            {{ event.eventType }}
          </span>

          <!-- Agent Name Badge -->
          <span
            v-if="getAgentName(event)"
            class="px-1.5 py-0.5 text-xs rounded bg-purple-500/20 text-purple-400 mr-2 flex-shrink-0"
          >
            {{ getAgentName(event) }}
          </span>

          <!-- Tool Name (if applicable) -->
          <span
            v-if="event.data.toolName"
            class="tool-badge mr-2"
            :class="getToolBadgeClass(event.data.toolName)"
          >
            {{ event.data.toolName }}
          </span>

          <!-- Summary -->
          <span class="text-sm text-monitor-text-primary truncate flex-1">
            {{ getEventSummary(event) }}
          </span>

          <!-- Expand indicator -->
          <svg
            class="w-4 h-4 text-monitor-text-muted transition-transform"
            :class="{ 'rotate-180': expandedEvents.has(event.id) }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        <!-- Expanded Details -->
        <div
          v-if="expandedEvents.has(event.id)"
          class="px-3 pb-3 border-t border-slate-700"
        >
          <!-- Session Info -->
          <div class="text-xs text-monitor-text-muted py-2 flex items-center space-x-4">
            <span>Session: {{ event.sessionId.slice(0, 8) }}</span>
            <span>Machine: {{ event.machineId }}</span>
            <span>{{ event.workingDirectory }}</span>
          </div>

          <!-- Tool Input -->
          <div v-if="event.data.toolInput" class="mt-2">
            <div class="text-xs text-monitor-text-secondary mb-1">Input:</div>
            <pre class="code-block text-xs overflow-y-auto overflow-x-hidden whitespace-pre-wrap word-wrap-break max-h-48 max-w-full">{{ formatJson(event.data.toolInput) }}</pre>
          </div>

          <!-- Tool Output -->
          <div v-if="event.data.toolOutput" class="mt-2">
            <div class="text-xs text-monitor-text-secondary mb-1">Output:</div>
            <pre class="code-block text-xs overflow-y-auto overflow-x-hidden whitespace-pre-wrap word-wrap-break max-h-48 max-w-full">{{ formatJson(event.data.toolOutput) }}</pre>
          </div>

          <!-- Message -->
          <div v-if="event.data.message" class="mt-2">
            <div class="text-xs text-monitor-text-secondary mb-1">Message:</div>
            <pre class="code-block text-xs overflow-y-auto overflow-x-hidden whitespace-pre-wrap word-wrap-break max-w-full">{{ event.data.message }}</pre>
          </div>

          <!-- Error -->
          <div v-if="event.data.error" class="mt-2">
            <div class="text-xs text-red-400 mb-1">Error:</div>
            <pre class="code-block text-xs text-red-300 overflow-y-auto overflow-x-hidden whitespace-pre-wrap word-wrap-break max-w-full">{{ event.data.error.message }}
{{ event.data.error.stack }}</pre>
          </div>

          <!-- Token Usage -->
          <div v-if="event.data.tokenUsage" class="mt-2 flex items-center space-x-4 text-xs">
            <span class="text-monitor-text-secondary">Tokens:</span>
            <span class="text-green-400">+{{ event.data.tokenUsage.input }} in</span>
            <span class="text-blue-400">+{{ event.data.tokenUsage.output }} out</span>
            <span v-if="event.data.tokenUsage.cacheRead" class="text-purple-400">
              {{ event.data.tokenUsage.cacheRead }} cache read
            </span>
          </div>

          <!-- Loading Indicator -->
          <div v-if="store.loadingDetails.has(event.id)" class="mt-3 flex items-center text-xs text-monitor-text-secondary">
            <svg class="animate-spin h-3 w-3 mr-2" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading full event details...
          </div>

          <!-- Thinking Blocks Section -->
          <div v-if="getFullEvent(event.id)?.data?.thinkingBlocks?.length" class="mt-3">
            <div class="text-xs text-monitor-text-secondary mb-1 flex items-center">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
              Chain of Thought ({{ getFullEvent(event.id)?.data?.thinkingBlocks?.length || 0 }})
            </div>
            <div class="space-y-2 max-h-64 overflow-y-auto">
              <div
                v-for="(block, idx) in getFullEvent(event.id)?.data?.thinkingBlocks || []"
                :key="idx"
                class="code-block text-xs bg-purple-900/20 border-l-2 border-purple-500 p-2"
              >
                <pre class="whitespace-pre-wrap text-purple-200">{{ block.content }}</pre>
              </div>
            </div>
          </div>

          <!-- Spawned Subagent Link for Task tool -->
          <div v-if="event.data.toolName === 'Task' && event.data.subagent" class="mt-3">
            <button
              @click="navigateToSpawnedSession(event)"
              class="flex items-center text-xs text-purple-400 hover:text-cyan-400 transition-colors"
            >
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              View {{ event.data.subagent.type || 'subagent' }} session →
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
