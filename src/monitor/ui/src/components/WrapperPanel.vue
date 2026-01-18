<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useMonitorStore } from '../stores/monitor';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const store = useMonitorStore();

const terminalContainerRef = ref<HTMLElement | null>(null);

// Map of wrapper ID to xterm Terminal instance
const terminals = ref<Map<string, { terminal: Terminal; fitAddon: FitAddon }>>(new Map());

// Computed
const wrappers = computed(() => store.wrappers);
const activeWrappers = computed(() => store.activeWrappers);
const selectedWrapper = computed(() => store.selectedWrapper);
const wrappersWaitingInput = computed(() => store.wrappersWaitingInput);

// Create or get terminal for a wrapper
function getOrCreateTerminal(wrapperId: string): { terminal: Terminal; fitAddon: FitAddon } | null {
  if (terminals.value.has(wrapperId)) {
    return terminals.value.get(wrapperId)!;
  }

  // Create new terminal - act as direct PTY passthrough
  const terminal = new Terminal({
    cursorBlink: true,
    cursorStyle: 'block',
    fontSize: 13,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    theme: {
      background: '#0f172a',
      foreground: '#e2e8f0',
      cursor: '#22d3ee',
      cursorAccent: '#0f172a',
      selectionBackground: '#334155',
      black: '#1e293b',
      red: '#ef4444',
      green: '#22c55e',
      yellow: '#eab308',
      blue: '#3b82f6',
      magenta: '#a855f7',
      cyan: '#22d3ee',
      white: '#f1f5f9',
      brightBlack: '#475569',
      brightRed: '#f87171',
      brightGreen: '#4ade80',
      brightYellow: '#facc15',
      brightBlue: '#60a5fa',
      brightMagenta: '#c084fc',
      brightCyan: '#67e8f9',
      brightWhite: '#f8fafc',
    },
    scrollback: 10000,
    convertEol: false,  // Don't convert - pass through raw
    allowProposedApi: true,
  });

  const fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);

  // Capture ALL keyboard input and send directly to PTY
  terminal.onData((data) => {
    store.injectInput(wrapperId, data);
  });

  // Notify server when terminal is resized
  terminal.onResize(({ cols, rows }) => {
    store.resizeWrapper(wrapperId, cols, rows);
  });

  terminals.value.set(wrapperId, { terminal, fitAddon });
  return { terminal, fitAddon };
}

// Mount terminal to container when wrapper is selected
async function mountTerminal(wrapperId: string) {
  await nextTick();

  if (!terminalContainerRef.value) return;

  const termData = getOrCreateTerminal(wrapperId);
  if (!termData) return;

  const { terminal, fitAddon } = termData;

  // Check if already mounted to this container
  const existingTerminal = terminalContainerRef.value.querySelector('.xterm');
  if (existingTerminal) {
    // Already mounted, just fit
    try {
      fitAddon.fit();
    } catch (e) {
      // Ignore
    }
    return;
  }

  // Clear container and mount
  terminalContainerRef.value.innerHTML = '';
  terminal.open(terminalContainerRef.value);

  // Fit terminal to container
  await nextTick();
  try {
    fitAddon.fit();
    // Send initial size to PTY
    store.resizeWrapper(wrapperId, terminal.cols, terminal.rows);
  } catch (e) {
    // Ignore fit errors during initial mount
  }

  // Focus the terminal for input
  terminal.focus();
}

// Handle new output from store - direct passthrough, no processing
function handleWrapperOutput(wrapperId: string, data: string) {
  const termData = terminals.value.get(wrapperId);
  if (termData) {
    // Direct write - let xterm.js handle all escape sequences natively
    termData.terminal.write(data);
  }
}

// Watch for wrapper selection changes
watch(() => store.selectedWrapperId, async (newId, oldId) => {
  if (newId) {
    await mountTerminal(newId);

    // Focus the terminal
    const termData = terminals.value.get(newId);
    if (termData) {
      termData.terminal.focus();
    }
  }
}, { immediate: true });

// Watch for new output - direct passthrough
watch(() => store.lastWrapperOutput, (output) => {
  if (output) {
    handleWrapperOutput(output.wrapperId, output.data);
  }
});

// Handle window resize
function handleResize() {
  if (store.selectedWrapperId) {
    const termData = terminals.value.get(store.selectedWrapperId);
    if (termData) {
      try {
        termData.fitAddon.fit();
      } catch (e) {
        // Ignore fit errors
      }
    }
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  // Dispose all terminals
  for (const [, { terminal }] of terminals.value) {
    terminal.dispose();
  }
  terminals.value.clear();
});

function selectWrapper(wrapperId: string) {
  store.selectWrapper(wrapperId);
}

function handleSpawnWrapper() {
  // Spawn a new Claude session in the current working directory
  store.spawnWrapper({
    cols: 120,
    rows: 40,
  });
}

function handleKillWrapper(wrapperId: string) {
  if (confirm(`Are you sure you want to kill wrapper ${wrapperId}?`)) {
    store.killWrapper(wrapperId);
  }
}

function getStateColor(state: string): string {
  switch (state) {
    case 'waiting_input': return 'text-green-400';
    case 'processing': return 'text-yellow-400';
    case 'starting': return 'text-blue-400';
    case 'ended': return 'text-gray-500';
    default: return 'text-gray-400';
  }
}

function getStateIcon(state: string): string {
  switch (state) {
    case 'waiting_input': return '⏳';
    case 'processing': return '⚙️';
    case 'starting': return '🚀';
    case 'ended': return '✓';
    default: return '•';
  }
}
</script>

<template>
  <div class="h-full flex flex-col bg-monitor-bg-primary">
    <!-- Header -->
    <div class="p-3 border-b border-slate-700 flex items-center justify-between">
      <h2 class="text-sm font-medium text-monitor-text-secondary uppercase tracking-wide">
        Claude Wrappers
      </h2>
      <div class="flex items-center gap-2">
        <span class="text-xs text-monitor-text-muted">
          {{ activeWrappers.length }} active
        </span>
        <button
          class="px-2 py-1 bg-monitor-accent-cyan/20 text-monitor-accent-cyan rounded text-xs hover:bg-monitor-accent-cyan/30 transition-colors flex items-center gap-1"
          @click="handleSpawnWrapper"
          title="Spawn new Claude Code session"
        >
          <span>+</span>
          <span>New</span>
        </button>
      </div>
    </div>

    <!-- No wrappers message -->
    <div v-if="wrappers.length === 0" class="flex-1 flex items-center justify-center p-4">
      <div class="text-center text-monitor-text-muted">
        <p class="text-sm">No wrapper sessions</p>
        <p class="text-xs mt-2">Click the <span class="text-monitor-accent-cyan">+ New</span> button above to spawn a Claude Code session</p>
        <p class="text-xs mt-1">or run <code class="bg-slate-700 px-1 rounded">contextuate claude</code> from terminal</p>
        <button
          class="mt-4 px-4 py-2 bg-monitor-accent-cyan/20 text-monitor-accent-cyan rounded hover:bg-monitor-accent-cyan/30 transition-colors"
          @click="handleSpawnWrapper"
        >
          Spawn Claude Code Session
        </button>
      </div>
    </div>

    <!-- Wrapper list -->
    <div v-else class="flex-1 flex flex-col overflow-hidden">
      <!-- Wrapper tabs -->
      <div class="flex border-b border-slate-700 overflow-x-auto">
        <button
          v-for="wrapper in wrappers"
          :key="wrapper.wrapperId"
          class="px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors"
          :class="[
            store.selectedWrapperId === wrapper.wrapperId
              ? 'border-monitor-accent-cyan text-monitor-accent-cyan bg-slate-800'
              : 'border-transparent text-monitor-text-secondary hover:text-monitor-text-primary hover:bg-slate-800/50'
          ]"
          @click="selectWrapper(wrapper.wrapperId)"
        >
          <span :class="getStateColor(wrapper.state)">{{ getStateIcon(wrapper.state) }}</span>
          <span class="ml-2">{{ wrapper.wrapperId }}</span>
          <span v-if="wrapper.state === 'waiting_input'" class="ml-2 text-xs text-green-400">(ready)</span>
        </button>
      </div>

      <!-- Selected wrapper content -->
      <div v-if="selectedWrapper" class="flex-1 flex flex-col overflow-hidden">
        <!-- Wrapper info bar -->
        <div class="px-3 py-2 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <span class="text-xs text-monitor-text-muted">ID:</span>
            <code class="text-xs text-monitor-accent-cyan">{{ selectedWrapper.wrapperId }}</code>
            <span class="text-xs text-monitor-text-muted">State:</span>
            <span :class="getStateColor(selectedWrapper.state)" class="text-xs font-medium">
              {{ selectedWrapper.state }}
            </span>
            <template v-if="selectedWrapper.claudeSessionId">
              <span class="text-xs text-monitor-text-muted">Session:</span>
              <code class="text-xs text-slate-400">{{ selectedWrapper.claudeSessionId.slice(0, 8) }}</code>
            </template>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-monitor-text-muted">
              Click terminal to type directly
            </span>
            <button
              v-if="selectedWrapper.state !== 'ended'"
              class="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30 transition-colors"
              @click="handleKillWrapper(selectedWrapper.wrapperId)"
              title="Kill this wrapper session"
            >
              Kill
            </button>
          </div>
        </div>

        <!-- Terminal (xterm.js - direct PTY passthrough) -->
        <div
          ref="terminalContainerRef"
          class="flex-1 overflow-hidden"
          @click="() => {
            const termData = terminals.get(store.selectedWrapperId || '');
            if (termData) termData.terminal.focus();
          }"
        ></div>
      </div>

      <!-- No selection message -->
      <div v-else class="flex-1 flex items-center justify-center p-4">
        <p class="text-sm text-monitor-text-muted">Select a wrapper to view terminal</p>
      </div>
    </div>

    <!-- Quick input for any waiting wrapper (shown at bottom if there are waiting wrappers) -->
    <div
      v-if="wrappersWaitingInput.length > 0 && !selectedWrapper"
      class="border-t border-slate-700 p-3 bg-green-900/20"
    >
      <div class="text-xs text-green-400 mb-2">
        {{ wrappersWaitingInput.length }} wrapper(s) waiting for input
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="wrapper in wrappersWaitingInput"
          :key="wrapper.wrapperId"
          class="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-500 transition-colors"
          @click="selectWrapper(wrapper.wrapperId)"
        >
          {{ wrapper.wrapperId }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Ensure xterm.js container fills space properly */
:deep(.xterm) {
  height: 100%;
  padding: 4px;
}

:deep(.xterm-viewport) {
  overflow-y: auto !important;
}

:deep(.xterm-screen) {
  height: 100%;
}
</style>
