<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open)
    emit('close')
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const shortcuts = [
  { keys: ['?'], description: 'Show keyboard shortcuts' },
  { keys: ['/'], description: 'Focus search' },
  { keys: ['Ctrl', 'K'], description: 'Focus search (chord)' },
  { keys: ['+', '='], description: 'Zoom in' },
  { keys: ['-'], description: 'Zoom out' },
  { keys: ['F'], description: 'Toggle fullscreen' },
  { keys: ['T'], description: 'Toggle territories' },
  { keys: ['Esc'], description: 'Close panel / clear pin' },
  { keys: ['↑', '↓'], description: 'Navigate search or explore list' },
  { keys: ['Enter'], description: 'Select focused result' },
]
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="open"
      class="pointer-events-auto absolute inset-0 z-[600] flex items-center justify-center bg-bg/50"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      @click.self="emit('close')"
    >
      <aside
        class="w-72 overflow-hidden rounded-lg bg-bg/95 shadow-xl ring-1 ring-copper/20 backdrop-blur"
      >
        <header class="flex items-center justify-between border-b border-border px-4 py-3">
          <div class="flex items-center gap-2">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="text-copper"
              aria-hidden="true"
            >
              <rect x="2" y="6" width="20" height="13" rx="2" />
              <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" />
            </svg>
            <h2 class="text-sm font-semibold text-copper">
              Shortcuts
            </h2>
          </div>
          <MapCloseBtn aria-label="Close shortcuts" @click="emit('close')" />
        </header>
        <ul class="py-1.5">
          <li
            v-for="(s, i) in shortcuts"
            :key="i"
            class="flex items-center justify-between px-4 py-1.5"
          >
            <span class="text-xs text-muted">{{ s.description }}</span>
            <span class="flex items-center gap-0.5">
              <template v-for="(k, ki) in s.keys" :key="k">
                <span v-if="ki > 0" class="text-[9px] text-muted/40">+</span>
                <kbd
                  class="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-text"
                >{{ k }}</kbd>
              </template>
            </span>
          </li>
        </ul>
      </aside>
    </div>
  </Transition>
</template>
