<script lang="ts">
import { defineComponent, computed, ref, PropType, h } from 'vue';
import { useMonitorStore } from '../stores/monitor';
import ContextMenu from './ContextMenu.vue';
import type { SessionMeta } from '../../../../types/monitor';

// Recursive child component for nested sessions
const SessionChild = defineComponent({
  name: 'SessionChild',
  props: {
    session: {
      type: Object as PropType<SessionMeta>,
      required: true,
    },
    depth: {
      type: Number,
      required: true,
    },
    getChildSessions: {
      type: Function as PropType<(id: string) => SessionMeta[]>,
      required: true,
    },
    getTotalChildCount: {
      type: Function as PropType<(id: string) => number>,
      required: true,
    },
    isExpanded: {
      type: Function as PropType<(id: string) => boolean>,
      required: true,
    },
    toggleExpand: {
      type: Function as PropType<(id: string, e: Event) => void>,
      required: true,
    },
    selectSession: {
      type: Function as PropType<(id: string) => void>,
      required: true,
    },
    selectedId: {
      type: String as PropType<string | null>,
      default: null,
    },
    formatDuration: {
      type: Function as PropType<(start: number, end?: number) => string>,
      required: true,
    },
    onContextMenu: {
      type: Function as PropType<(session: SessionMeta, e: MouseEvent) => void>,
      required: true,
    },
  },
  render() {
    const {
      session,
      depth,
      getChildSessions,
      getTotalChildCount,
      isExpanded,
      toggleExpand,
      selectSession,
      selectedId,
      formatDuration,
      onContextMenu,
    } = this;

    const childCount = getTotalChildCount(session.sessionId);
    const children = getChildSessions(session.sessionId);
    const expanded = isExpanded(session.sessionId);
    const store = useMonitorStore();

    const containerClass = [
      'rounded-lg cursor-pointer transition-all duration-200 border-l-4 relative group mb-1',
      selectedId === session.sessionId
        ? 'bg-slate-700 border-l-monitor-accent-purple ring-1 ring-monitor-accent-purple/30'
        : 'bg-monitor-bg-tertiary hover:bg-slate-700/50 border-l-monitor-accent-purple/50',
    ];

    return h('div', { class: 'ml-3' }, [
      h('div', {
        class: containerClass,
        onClick: () => selectSession(session.sessionId),
        onContextmenu: (e: MouseEvent) => { e.preventDefault(); onContextMenu(session, e); },
      }, [
        h('div', { class: 'p-2' }, [
          h('div', { class: 'flex items-center justify-between' }, [
            h('div', { class: 'flex items-center space-x-2' }, [
              // Expand/collapse button
              childCount > 0
                ? h('button', {
                    class: 'w-4 h-4 flex items-center justify-center rounded hover:bg-slate-600 transition-colors',
                    onClick: (e: Event) => { e.stopPropagation(); toggleExpand(session.sessionId, e); },
                  }, [
                    h('svg', {
                      class: ['w-2.5 h-2.5 transition-transform text-monitor-text-muted', expanded ? 'rotate-90' : ''],
                      fill: 'none',
                      stroke: 'currentColor',
                      viewBox: '0 0 24 24',
                    }, [
                      h('path', {
                        'stroke-linecap': 'round',
                        'stroke-linejoin': 'round',
                        'stroke-width': '2',
                        d: 'M9 5l7 7-7 7',
                      }),
                    ]),
                  ])
                : h('span', { class: 'w-4' }),
              // Sub-agent icon
              h('svg', {
                class: 'w-3 h-3 text-monitor-accent-purple',
                fill: 'none',
                stroke: 'currentColor',
                viewBox: '0 0 24 24',
              }, [
                h('path', {
                  'stroke-linecap': 'round',
                  'stroke-linejoin': 'round',
                  'stroke-width': '2',
                  d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
                }),
              ]),
              // Status dot
              h('span', {
                class: [
                  'w-1.5 h-1.5 rounded-full',
                  session.status === 'active' ? 'bg-purple-400 animate-pulse-dot' : '',
                  session.status === 'completed' ? 'bg-gray-500' : '',
                  session.status === 'error' ? 'bg-red-500' : '',
                ],
              }),
              // Session ID / Label
              session.label
                ? h('span', { class: 'text-xs font-medium text-monitor-accent-cyan' }, session.label)
                : h('span', { class: 'text-xs font-medium text-monitor-text-secondary' },
                    session.sessionId.slice(0, 8)
                  ),
              // Agent type badge
              session.agentType
                ? h('span', {
                    class: 'px-1 py-0.5 text-xs rounded bg-monitor-accent-purple/20 text-monitor-accent-purple',
                  }, session.agentType)
                : null,
              // Child count
              childCount > 0
                ? h('span', {
                    class: 'px-1 py-0.5 text-xs rounded bg-slate-600 text-monitor-text-muted',
                  }, `+${childCount}`)
                : null,
            ]),
            h('span', { class: 'text-xs text-monitor-text-muted' },
              formatDuration(session.startTime, session.endTime)
            ),
          ]),
        ]),
      ]),
      // Nested children
      expanded
        ? children.map(child =>
            h(SessionChild, {
              key: child.sessionId,
              session: child,
              depth: depth + 1,
              getChildSessions,
              getTotalChildCount,
              isExpanded,
              toggleExpand,
              selectSession,
              selectedId,
              formatDuration,
              onContextMenu,
            })
          )
        : null,
    ]);
  },
});

export default defineComponent({
  name: 'SessionList',
  components: { SessionChild, ContextMenu },
  setup() {
    const store = useMonitorStore();

    // Context menu state
    const contextMenu = ref<{ visible: boolean; x: number; y: number; session: SessionMeta | null }>({
      visible: false,
      x: 0,
      y: 0,
      session: null,
    });

    function showContextMenu(session: SessionMeta, e: MouseEvent) {
      contextMenu.value = {
        visible: true,
        x: e.clientX,
        y: e.clientY,
        session,
      };
    }

    function closeContextMenu() {
      contextMenu.value.visible = false;
      contextMenu.value.session = null;
    }

    function handleClearAll() {
      if (store.ctrlPressed) {
        store.deleteAllSessions();
      } else {
        store.hideAllSessions();
      }
    }

    // Track expanded sessions (default to expanded for primary)
    const expandedSessions = ref<Set<string>>(new Set());

    // Use the hierarchy from store
    const hierarchy = computed(() => store.sessionHierarchy);
    const selectedId = computed(() => store.selectedSessionId);

    function getChildSessions(parentId: string): SessionMeta[] {
      return hierarchy.value.childMap.get(parentId) || [];
    }

    function getTotalChildCount(sessionId: string): number {
      const directChildren = getChildSessions(sessionId);
      let count = directChildren.length;
      for (const child of directChildren) {
        count += getTotalChildCount(child.sessionId);
      }
      return count;
    }

    function isExpanded(sessionId: string): boolean {
      return expandedSessions.value.has(sessionId);
    }

    function toggleExpand(sessionId: string, event: Event) {
      event.stopPropagation();
      if (expandedSessions.value.has(sessionId)) {
        expandedSessions.value.delete(sessionId);
      } else {
        expandedSessions.value.add(sessionId);
      }
    }

    function formatDuration(start: number, end?: number): string {
      const duration = (end || Date.now()) - start;
      const seconds = Math.floor(duration / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
      }
      if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
      }
      return `${seconds}s`;
    }

    function truncatePath(path: string, maxLength = 30): string {
      if (path.length <= maxLength) return path;
      const parts = path.split('/');
      if (parts.length <= 2) return path.slice(-maxLength);
      return '.../' + parts.slice(-2).join('/');
    }

    function selectSession(sessionId: string) {
      if (selectedId.value === sessionId) {
        store.selectSession(null);
      } else {
        store.selectSession(sessionId);
        // Auto-expand when selecting
        expandedSessions.value.add(sessionId);
      }
    }

    return {
      store,
      hierarchy,
      selectedId,
      contextMenu,
      getChildSessions,
      getTotalChildCount,
      isExpanded,
      toggleExpand,
      formatDuration,
      truncatePath,
      selectSession,
      handleClearAll,
      showContextMenu,
      closeContextMenu,
    };
  },
});
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Toolbar -->
    <div class="px-3 py-2 border-b border-slate-700 space-y-2">
      <!-- Clear All Button -->
      <button
        @click="handleClearAll"
        :class="[
          'w-full px-3 py-1.5 text-xs font-medium rounded transition-colors',
          store.ctrlPressed
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-slate-600 hover:bg-slate-700 text-white'
        ]"
        :title="store.ctrlPressed ? 'Delete All Sessions (Ctrl held)' : 'Hide All Sessions'"
      >
        {{ store.ctrlPressed ? 'Delete All' : 'Hide All' }}
      </button>

      <!-- Toggle Switches -->
      <div class="flex items-center justify-between text-xs">
        <label class="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            :checked="store.showHidden"
            @change="store.toggleShowHidden()"
            class="w-3 h-3 rounded bg-slate-700 border-slate-600 text-monitor-accent-cyan focus:ring-monitor-accent-cyan focus:ring-offset-0"
          />
          <span class="text-monitor-text-secondary">Show Hidden</span>
        </label>

        <label class="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            :checked="store.showInactiveOnly"
            @change="store.toggleShowInactive()"
            class="w-3 h-3 rounded bg-slate-700 border-slate-600 text-monitor-accent-cyan focus:ring-monitor-accent-cyan focus:ring-offset-0"
          />
          <span class="text-monitor-text-secondary">Inactive Only</span>
        </label>
      </div>
    </div>

    <!-- Session List -->
    <div class="flex-1 overflow-y-auto">
      <!-- PRIMARY SESSIONS SECTION -->
      <div v-if="hierarchy.primarySessions.length > 0" class="p-2 border-b border-slate-600">
        <div class="text-xs font-semibold text-monitor-accent-cyan uppercase tracking-wide mb-2 flex items-center">
          <svg class="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"/>
          </svg>
          Primary Sessions
        </div>

        <div class="space-y-1">
          <template v-for="session in hierarchy.primarySessions" :key="session.sessionId">
            <!-- Primary Session Card -->
            <div
              class="rounded-lg cursor-pointer transition-all duration-200 border-l-4 relative group"
              :class="[
                selectedId === session.sessionId
                  ? 'bg-slate-700 border-l-monitor-accent-cyan ring-1 ring-monitor-accent-cyan/30'
                  : 'bg-slate-800 hover:bg-slate-700/70 border-l-monitor-accent-cyan/70',
                session.isPinned ? 'shadow-lg shadow-cyan-500/5' : ''
              ]"
              @click="selectSession(session.sessionId)"
              @contextmenu.prevent="showContextMenu(session, $event)"
            >
              <!-- Pin indicator -->
              <div
                v-if="session.isPinned"
                class="absolute -top-1 -right-1 w-4 h-4 bg-monitor-accent-cyan rounded-full flex items-center justify-center shadow"
              >
                <svg class="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"/>
                </svg>
              </div>

              <div class="p-3">
                <!-- Header -->
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center space-x-2">
                    <!-- Expand/collapse -->
                    <button
                      v-if="getTotalChildCount(session.sessionId) > 0"
                      class="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-600 transition-colors"
                      @click.stop="toggleExpand(session.sessionId, $event)"
                    >
                      <svg
                        class="w-3 h-3 transition-transform text-monitor-text-muted"
                        :class="{ 'rotate-90': isExpanded(session.sessionId) }"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <span v-else class="w-5"></span>

                    <!-- User icon -->
                    <svg class="w-4 h-4 text-monitor-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>

                    <!-- Status dot -->
                    <span
                      class="w-2 h-2 rounded-full"
                      :class="{
                        'bg-green-500 animate-pulse-dot': session.status === 'active',
                        'bg-gray-500': session.status === 'completed',
                        'bg-red-500': session.status === 'error'
                      }"
                    ></span>

                    <!-- Session ID / Label -->
                    <span v-if="session.label" class="text-sm font-medium text-monitor-accent-cyan">
                      {{ session.label }}
                    </span>
                    <span v-else class="text-sm font-medium text-monitor-text-primary">
                      {{ session.sessionId.slice(0, 8) }}
                    </span>

                    <!-- Child count badge -->
                    <span
                      v-if="getTotalChildCount(session.sessionId) > 0"
                      class="px-1.5 py-0.5 text-xs rounded-full bg-monitor-accent-purple/20 text-monitor-accent-purple"
                    >
                      {{ getTotalChildCount(session.sessionId) }} agents
                    </span>
                  </div>

                  <span class="text-xs text-monitor-text-muted">
                    {{ formatDuration(session.startTime, session.endTime) }}
                  </span>
                </div>

                <!-- Details -->
                <div class="text-xs text-monitor-text-muted pl-7">
                  <div class="flex items-center">
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                    </svg>
                    {{ truncatePath(session.workingDirectory) }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Children (expanded) -->
            <template v-if="isExpanded(session.sessionId)">
              <SessionChild
                v-for="child in getChildSessions(session.sessionId)"
                :key="child.sessionId"
                :session="child"
                :depth="1"
                :get-child-sessions="getChildSessions"
                :get-total-child-count="getTotalChildCount"
                :is-expanded="isExpanded"
                :toggle-expand="toggleExpand"
                :select-session="selectSession"
                :selected-id="selectedId"
                :format-duration="formatDuration"
                :on-context-menu="showContextMenu"
              />
            </template>
          </template>
        </div>
      </div>

      <!-- OTHER SESSIONS SECTION -->
      <div v-if="hierarchy.otherSessions.length > 0" class="p-2">
        <div class="text-xs font-semibold text-monitor-text-muted uppercase tracking-wide mb-2">
          Other Sessions
        </div>

        <div class="space-y-1">
          <template v-for="session in hierarchy.otherSessions" :key="session.sessionId">
            <div
              class="rounded-lg cursor-pointer transition-all duration-200 border-l-4 relative group"
              :class="[
                selectedId === session.sessionId
                  ? 'bg-slate-700 border-l-slate-400 ring-1 ring-slate-400/30'
                  : 'bg-monitor-bg-tertiary hover:bg-slate-700/50 border-l-slate-600',
                store.hiddenSessionIds.has(session.sessionId) ? 'opacity-50' : ''
              ]"
              @click="selectSession(session.sessionId)"
              @contextmenu.prevent="showContextMenu(session, $event)"
            >
              <div class="p-2">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <!-- Expand/collapse -->
                    <button
                      v-if="getTotalChildCount(session.sessionId) > 0"
                      class="w-4 h-4 flex items-center justify-center rounded hover:bg-slate-600 transition-colors"
                      @click.stop="toggleExpand(session.sessionId, $event)"
                    >
                      <svg
                        class="w-2.5 h-2.5 transition-transform text-monitor-text-muted"
                        :class="{ 'rotate-90': isExpanded(session.sessionId) }"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <span v-else class="w-4"></span>

                    <!-- Status dot -->
                    <span
                      class="w-1.5 h-1.5 rounded-full"
                      :class="{
                        'bg-green-500 animate-pulse-dot': session.status === 'active',
                        'bg-gray-500': session.status === 'completed',
                        'bg-red-500': session.status === 'error'
                      }"
                    ></span>

                    <!-- Session ID / Label -->
                    <span v-if="session.label" class="text-xs text-monitor-accent-cyan">
                      {{ session.label }}
                    </span>
                    <span v-else class="text-xs text-monitor-text-secondary">
                      {{ session.sessionId.slice(0, 8) }}
                    </span>

                    <!-- Agent type -->
                    <span
                      v-if="session.agentType"
                      class="px-1 py-0.5 text-xs rounded bg-slate-600 text-monitor-text-muted"
                    >
                      {{ session.agentType }}
                    </span>
                  </div>

                  <span class="text-xs text-monitor-text-muted">
                    {{ formatDuration(session.startTime, session.endTime) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Children (expanded) -->
            <template v-if="isExpanded(session.sessionId)">
              <SessionChild
                v-for="child in getChildSessions(session.sessionId)"
                :key="child.sessionId"
                :session="child"
                :depth="1"
                :get-child-sessions="getChildSessions"
                :get-total-child-count="getTotalChildCount"
                :is-expanded="isExpanded"
                :toggle-expand="toggleExpand"
                :select-session="selectSession"
                :selected-id="selectedId"
                :format-duration="formatDuration"
                :on-context-menu="showContextMenu"
              />
            </template>
          </template>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-if="hierarchy.primarySessions.length === 0 && hierarchy.otherSessions.length === 0"
        class="text-monitor-text-muted text-sm p-4 text-center"
      >
        No sessions
      </div>
    </div>

    <!-- Context Menu -->
    <ContextMenu
      v-if="contextMenu.visible && contextMenu.session"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :session="contextMenu.session"
      :all-sessions="store.sessions"
      @close="closeContextMenu"
      @set-parent="(sessionId, parentId) => store.setSessionParent(sessionId, parentId)"
      @toggle-pin="(sessionId) => store.toggleSessionPin(sessionId)"
      @set-user-initiated="(sessionId, value) => store.setUserInitiated(sessionId, value)"
      @rename="(sessionId, label) => store.renameSession(sessionId, label)"
    />
  </div>
</template>
