<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, nextTick } from 'vue';
import type { SessionMeta } from '../../../../types/monitor';

const props = defineProps<{
  x: number;
  y: number;
  session: SessionMeta;
  allSessions: SessionMeta[];
}>();

const emit = defineEmits<{
  close: [];
  setParent: [sessionId: string, parentId: string | null];
  togglePin: [sessionId: string];
  setUserInitiated: [sessionId: string, value: boolean];
  rename: [sessionId: string, label: string];
}>();

// Rename state
const showRenameInput = ref(false);
const renameInputValue = ref('');
const renameInputRef = ref<HTMLInputElement | null>(null);

function startRename() {
  renameInputValue.value = props.session.label || '';
  showRenameInput.value = true;
  nextTick(() => {
    renameInputRef.value?.focus();
    renameInputRef.value?.select();
  });
}

function submitRename() {
  emit('rename', props.session.sessionId, renameInputValue.value);
  emit('close');
}

function cancelRename() {
  showRenameInput.value = false;
  renameInputValue.value = '';
}

// Get eligible parents (exclude self and descendants)
function isDescendantOf(sessionId: string, potentialAncestorId: string): boolean {
  const session = props.allSessions.find(s => s.sessionId === sessionId);
  if (!session) return false;
  if (session.parentSessionId === potentialAncestorId) return true;
  if (session.parentSessionId) {
    return isDescendantOf(session.parentSessionId, potentialAncestorId);
  }
  return false;
}

const eligibleParents = computed(() => {
  return props.allSessions.filter(s =>
    s.sessionId !== props.session.sessionId &&
    !isDescendantOf(s.sessionId, props.session.sessionId) &&
    !props.session.childSessionIds.includes(s.sessionId)
  ).sort((a, b) => b.startTime - a.startTime);
});

// Close on click outside
function handleClickOutside(e: MouseEvent) {
  emit('close');
}

// Close on Escape key
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close');
  }
}

onMounted(() => {
  // Delay to avoid immediate close from the triggering click
  setTimeout(() => {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeydown);
  }, 10);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div
    class="fixed bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-1 min-w-52 z-50"
    :style="{ left: x + 'px', top: y + 'px' }"
    @click.stop
  >
    <!-- Session info header -->
    <div class="px-3 py-2 border-b border-slate-700 text-xs text-monitor-text-muted">
      <span class="text-monitor-text-primary font-medium">{{ session.sessionId.slice(0, 8) }}</span>
      <span v-if="session.agentType" class="ml-2 text-monitor-accent-purple">({{ session.agentType }})</span>
      <span v-if="session.label" class="ml-2 text-monitor-accent-cyan">"{{ session.label }}"</span>
    </div>

    <!-- Rename input (inline) -->
    <div v-if="showRenameInput" class="px-3 py-2 border-b border-slate-700">
      <div class="flex items-center space-x-2">
        <input
          ref="renameInputRef"
          v-model="renameInputValue"
          type="text"
          class="flex-1 px-2 py-1 text-sm bg-slate-700 border border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-monitor-accent-cyan"
          placeholder="Enter label (empty to clear)"
          @keydown.enter="submitRename"
          @keydown.escape="cancelRename"
        />
        <button
          class="px-2 py-1 text-xs bg-monitor-accent-cyan text-slate-900 rounded hover:bg-cyan-400 transition-colors"
          @click="submitRename"
        >
          OK
        </button>
        <button
          class="px-2 py-1 text-xs bg-slate-600 text-white rounded hover:bg-slate-500 transition-colors"
          @click="cancelRename"
        >
          Cancel
        </button>
      </div>
    </div>

    <!-- Rename button -->
    <button
      v-if="!showRenameInput"
      class="w-full px-3 py-2 text-left text-sm hover:bg-slate-700 flex items-center"
      @click="startRename"
    >
      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
      </svg>
      <span>Rename</span>
      <span v-if="session.label" class="ml-auto text-xs text-monitor-text-muted">
        "{{ session.label }}"
      </span>
    </button>

    <div v-if="!showRenameInput" class="border-t border-slate-700 my-1"></div>

    <!-- Pin/Unpin -->
    <button
      v-if="!showRenameInput"
      class="w-full px-3 py-2 text-left text-sm hover:bg-slate-700 flex items-center"
      @click="emit('togglePin', session.sessionId); emit('close')"
    >
      <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"/>
      </svg>
      <span :class="session.isPinned ? 'text-monitor-accent-cyan' : ''">
        {{ session.isPinned ? 'Unpin Session' : 'Pin to Top' }}
      </span>
    </button>

    <!-- Mark as User-Initiated / Sub-Agent -->
    <button
      v-if="!showRenameInput"
      class="w-full px-3 py-2 text-left text-sm hover:bg-slate-700 flex items-center"
      @click="emit('setUserInitiated', session.sessionId, !session.isUserInitiated); emit('close')"
    >
      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
      </svg>
      <span :class="session.isUserInitiated ? 'text-monitor-accent-cyan' : ''">
        {{ session.isUserInitiated ? 'Mark as Sub-Agent' : 'Mark as Primary' }}
      </span>
    </button>

    <div v-if="!showRenameInput" class="border-t border-slate-700 my-1"></div>

    <!-- Set Parent (submenu-like) -->
    <div v-if="!showRenameInput" class="relative group">
      <button class="w-full px-3 py-2 text-left text-sm hover:bg-slate-700 flex items-center justify-between">
        <span class="flex items-center">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          Set Parent
        </span>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      </button>

      <!-- Submenu -->
      <div class="absolute left-full top-0 ml-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-1 min-w-48 hidden group-hover:block max-h-64 overflow-y-auto">
        <!-- No parent option -->
        <button
          class="w-full px-3 py-2 text-left text-sm hover:bg-slate-700 text-monitor-text-muted flex items-center"
          :class="{ 'text-monitor-accent-cyan': !session.parentSessionId }"
          @click="emit('setParent', session.sessionId, null); emit('close')"
        >
          <svg class="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
          (No Parent - Root)
        </button>

        <div class="border-t border-slate-700 my-1"></div>

        <!-- Available parents -->
        <button
          v-for="parent in eligibleParents"
          :key="parent.sessionId"
          class="w-full px-3 py-2 text-left text-sm hover:bg-slate-700 flex items-center"
          :class="{ 'text-monitor-accent-cyan': session.parentSessionId === parent.sessionId }"
          @click="emit('setParent', session.sessionId, parent.sessionId); emit('close')"
        >
          <span
            class="w-2 h-2 rounded-full mr-2"
            :class="{
              'bg-green-500': parent.status === 'active',
              'bg-gray-500': parent.status === 'completed',
              'bg-red-500': parent.status === 'error'
            }"
          ></span>
          <span>{{ parent.sessionId.slice(0, 8) }}</span>
          <span v-if="parent.agentType" class="ml-1 text-xs text-monitor-accent-purple">
            ({{ parent.agentType }})
          </span>
          <span v-if="parent.isUserInitiated" class="ml-1 text-xs text-monitor-accent-cyan">
            (primary)
          </span>
        </button>

        <div v-if="eligibleParents.length === 0" class="px-3 py-2 text-sm text-monitor-text-muted italic">
          No eligible parents
        </div>
      </div>
    </div>
  </div>
</template>
