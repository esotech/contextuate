<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue';
import { useMonitorStore } from './stores/monitor';
import SessionList from './components/SessionList.vue';
import EventStream from './components/EventStream.vue';
import AgentTree from './components/AgentTree.vue';
import ToolTimeline from './components/ToolTimeline.vue';
import TokenMetrics from './components/TokenMetrics.vue';
import ModeIndicator from './components/ModeIndicator.vue';
import FilterBar from './components/FilterBar.vue';

const store = useMonitorStore();

const connectionStatusClass = computed(() => {
  switch (store.connectionStatus) {
    case 'connected': return 'status-connected';
    case 'connecting': return 'status-connecting';
    default: return 'status-disconnected';
  }
});

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Control' || e.key === 'Meta') {
    store.setCtrlPressed(true);
  }
}

function handleKeyUp(e: KeyboardEvent) {
  if (e.key === 'Control' || e.key === 'Meta') {
    store.setCtrlPressed(false);
  }
}

onMounted(() => {
  store.connect();
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  // Handle blur event to reset Ctrl state when window loses focus
  window.addEventListener('blur', () => store.setCtrlPressed(false));
});

onUnmounted(() => {
  store.disconnect();
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  window.removeEventListener('blur', () => store.setCtrlPressed(false));
});
</script>

<template>
  <div class="min-h-screen bg-monitor-bg-primary text-monitor-text-primary">
    <!-- Header -->
    <header class="bg-monitor-bg-secondary border-b border-slate-700 px-4 py-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <img src="/logo.png" alt="Contextuate" class="h-8 w-auto" />
          <h1 class="text-xl font-semibold">
            <span class="text-monitor-accent-cyan">Contextuate</span>
            <span class="text-monitor-text-secondary ml-2">Monitor</span>
          </h1>
          <ModeIndicator />
        </div>
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-2">
            <span
              class="w-2 h-2 rounded-full"
              :class="{
                'bg-green-500 animate-pulse-dot': store.connectionStatus === 'connected',
                'bg-yellow-500 animate-pulse': store.connectionStatus === 'connecting',
                'bg-red-500': store.connectionStatus === 'disconnected'
              }"
            ></span>
            <span class="text-sm" :class="connectionStatusClass">
              {{ store.connectionStatus }}
            </span>
          </div>
          <span class="text-monitor-text-muted text-sm">
            {{ store.sessions.length }} session(s)
          </span>
        </div>
      </div>
    </header>

    <!-- Filter Bar -->
    <FilterBar class="border-b border-slate-700" />

    <!-- Main Content -->
    <main class="flex h-[calc(100vh-120px)]">
      <!-- Left Sidebar - Sessions -->
      <aside class="w-72 border-r border-slate-700 flex flex-col">
        <div class="p-3 border-b border-slate-700">
          <h2 class="text-sm font-medium text-monitor-text-secondary uppercase tracking-wide">
            Sessions
          </h2>
        </div>
        <SessionList class="flex-1 overflow-y-auto" />
      </aside>

      <!-- Center - Event Stream & Timeline -->
      <div class="flex-1 flex flex-col">
        <!-- Tool Timeline -->
        <div class="h-32 border-b border-slate-700">
          <ToolTimeline />
        </div>

        <!-- Event Stream -->
        <div class="flex-1 overflow-hidden">
          <EventStream />
        </div>
      </div>

      <!-- Right Sidebar - Details -->
      <aside class="w-80 border-l border-slate-700 flex flex-col">
        <!-- Agent Tree -->
        <div class="h-1/2 border-b border-slate-700">
          <div class="p-3 border-b border-slate-700">
            <h2 class="text-sm font-medium text-monitor-text-secondary uppercase tracking-wide">
              Agent Hierarchy
            </h2>
          </div>
          <AgentTree class="overflow-y-auto h-[calc(100%-44px)]" />
        </div>

        <!-- Token Metrics -->
        <div class="h-1/2">
          <div class="p-3 border-b border-slate-700">
            <h2 class="text-sm font-medium text-monitor-text-secondary uppercase tracking-wide">
              Token Usage
            </h2>
          </div>
          <TokenMetrics class="overflow-y-auto h-[calc(100%-44px)]" />
        </div>
      </aside>
    </main>
  </div>
</template>
