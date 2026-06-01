<script setup lang="ts">
import type { WorldEvent } from '~/types/map'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{
  events: WorldEvent[]
  loading: boolean
  error: string | null
  selectedEvent: WorldEvent | null
}>()

const emit = defineEmits<{ select: [event: WorldEvent] }>()

const now = ref(Date.now())
let ticker: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  ticker = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
onBeforeUnmount(() => {
  if (ticker !== null)
    clearInterval(ticker)
})

const isFirstLoad = computed(() => props.loading && props.events.length === 0)

function formatCountdown(schedule: string): string {
  const ms = new Date(schedule).getTime() - now.value
  if (ms <= 0)
    return 'now'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0)
    return `in ${h}h ${m}m`
  if (m > 0)
    return `in ${m}m ${s}s`
  return `in ${s}s`
}

const DIFFICULTY_CLASSES: Record<WorldEvent['difficulty'], string> = {
  EASY: 'bg-green-500/15 text-green-400',
  MEDIUM: 'bg-amber-500/15 text-amber-400',
  HARD: 'bg-red-500/15 text-red-400',
}

const LENGTH_LABEL: Record<WorldEvent['length'], string> = {
  SHORT: 'Short',
  MEDIUM: 'Medium',
  LONG: 'Long',
}
</script>

<template>
  <div class="hidden shrink-0 border-b border-border bg-bg/95 backdrop-blur md:flex">
    <!-- Loading skeleton -->
    <div v-if="isFirstLoad" class="flex gap-2 overflow-x-auto px-4 py-2">
      <div
        v-for="i in 3"
        :key="i"
        class="h-14 w-44 shrink-0 animate-pulse rounded-lg bg-surface"
      />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex items-center px-4 py-2">
      <span class="text-xs text-muted/60">Failed to load events: {{ error }}</span>
    </div>

    <!-- Empty -->
    <div v-else-if="events.length === 0" class="flex items-center px-4 py-2">
      <span class="text-xs text-muted/60">No world events active</span>
    </div>

    <!-- Cards -->
    <div v-else class="flex gap-2 overflow-x-auto px-4 py-2">
      <button
        v-for="event in events"
        :key="event.internalName"
        type="button"
        class="flex w-44 shrink-0 flex-col gap-1 rounded-lg px-3 py-2 text-left ring-1 transition-colors"
        :class="
          selectedEvent?.internalName === event.internalName
            ? 'bg-copper/10 ring-copper/40'
            : 'bg-surface ring-border hover:bg-surface-hi'
        "
        @click="emit('select', event)"
      >
        <span class="truncate text-sm font-semibold text-copper">{{ event.name }}</span>
        <div class="flex items-center gap-1.5">
          <span
            class="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            :class="DIFFICULTY_CLASSES[event.difficulty]"
          >
            {{ event.difficulty }}
          </span>
          <span class="text-[10px] text-muted/60">Lv {{ event.level }}</span>
          <span class="text-[10px] text-muted/60">·</span>
          <span class="text-[10px] text-muted/60">{{ LENGTH_LABEL[event.length] }}</span>
        </div>
        <div class="text-[10px] tabular-nums text-muted/50">
          <span v-if="event.schedule">{{ formatCountdown(event.schedule) }}</span>
          <span v-else>No upcoming run</span>
        </div>
      </button>
    </div>
  </div>
</template>
