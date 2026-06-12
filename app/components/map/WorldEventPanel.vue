<script setup lang="ts">
import type { WorldEvent } from '~/types/map'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { formatCountdown as formatDuration, nextSpawnIn } from '~/lib/world-events/schedule'
import { useMapStore } from '~/stores/map'

const props = defineProps<{
  event: WorldEvent | null
  listMode?: boolean
  allEvents?: WorldEvent[]
}>()

const emit = defineEmits<{ close: [] }>()

const store = useMapStore()

const now = ref(Date.now())
let ticker: ReturnType<typeof setInterval> | null = null
const expandedRewards = ref(new Set<number>())
const listSelected = ref<WorldEvent | null>(null)

const activeEvent = computed(() => listSelected.value ?? props.event)

onMounted(() => {
  ticker = setInterval(() => {
    now.value = Date.now()
  }, 1000)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  if (ticker !== null)
    clearInterval(ticker)
  window.removeEventListener('keydown', onKey)
})

watch(
  () => props.event,
  () => {
    expandedRewards.value = new Set()
    listSelected.value = null
  },
)

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape')
    emit('close')
}

function formatCountdown(schedule: string): string {
  const seconds = nextSpawnIn(schedule, now.value)
  return seconds == null ? 'happening now' : `in ${formatDuration(seconds)}`
}

function formatScheduleDate(schedule: string): string {
  return new Date(schedule).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function panTo(x: number, z: number) {
  store.setCenter(x, z)
  store.setZoom(2)
}

function toggleReward(i: number) {
  const s = new Set(expandedRewards.value)
  if (s.has(i))
    s.delete(i)
  else
    s.add(i)
  expandedRewards.value = s
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
  <Transition
    enter-active-class="transition duration-200"
    enter-from-class="translate-x-full opacity-0"
    enter-to-class="translate-x-0 opacity-100"
    leave-active-class="transition duration-150"
    leave-from-class="translate-x-0 opacity-100"
    leave-to-class="translate-x-full opacity-0"
  >
    <aside
      v-if="event !== null || listMode"
      class="pointer-events-auto fixed bottom-0 inset-x-0 z-[500] max-h-[70vh] overflow-y-auto rounded-t-2xl md:absolute md:bottom-auto md:inset-x-auto md:right-4 md:top-4 md:w-80 md:rounded-lg bg-bg/95 p-4 shadow-xl ring-1 ring-copper/20 backdrop-blur"
      role="region"
      :aria-label="activeEvent ? `Event: ${activeEvent.name}` : 'World Events'"
    >
      <!-- List mode: no event selected yet -->
      <template v-if="listMode && !activeEvent">
        <header class="mb-3 flex items-center justify-between">
          <h2 class="text-base font-semibold text-copper">
            World Events
          </h2>
          <MapCloseBtn aria-label="Close events" @click="emit('close')" />
        </header>
        <ul class="space-y-1">
          <li v-for="ev in (allEvents ?? [])" :key="ev.internalName">
            <button
              type="button"
              class="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface"
              @click="listSelected = ev"
            >
              <div class="text-sm font-medium text-text">
                {{ ev.name }}
              </div>
              <div class="mt-0.5 text-xs text-muted/60">
                Lv {{ ev.level }} · {{ ev.difficulty }}
              </div>
            </button>
          </li>
        </ul>
      </template>

      <!-- Detail mode -->
      <template v-else-if="activeEvent">
        <!-- Back button (list mode only) -->
        <button
          v-if="listMode && listSelected"
          type="button"
          class="mb-2 flex items-center gap-1 text-xs text-muted hover:text-copper"
          @click="listSelected = null"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          All events
        </button>

        <header class="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-copper">
              {{ activeEvent.name }}
            </h2>
            <div class="mt-1 flex flex-wrap items-center gap-1.5">
              <span
                class="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                :class="DIFFICULTY_CLASSES[activeEvent.difficulty]"
              >
                {{ activeEvent.difficulty }}
              </span>
              <span class="rounded bg-surface px-1.5 py-0.5 text-[10px] text-muted">
                {{ LENGTH_LABEL[activeEvent.length] }}
              </span>
              <span class="rounded bg-surface px-1.5 py-0.5 text-[10px] text-muted">
                Lv {{ activeEvent.level }}
              </span>
            </div>
          </div>
          <MapCloseBtn aria-label="Close event details" @click="emit('close')" />
        </header>

        <p v-if="activeEvent.lore" class="mb-3 text-sm italic text-muted/80">
          {{ activeEvent.lore }}
        </p>

        <div v-if="activeEvent.requirements.length" class="mb-3 flex flex-wrap gap-1">
          <span
            v-for="req in activeEvent.requirements"
            :key="req.type"
            class="rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400"
          >
            {{ req.type === 'COMBAT_LEVEL' ? `Combat Lv. ${req.value}+` : `${req.type}: ${req.value}` }}
          </span>
        </div>

        <div v-if="activeEvent.rewardPerLevel.length" class="mb-3">
          <div class="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted/60">
            Rewards
          </div>
          <div class="space-y-1">
            <div
              v-for="(tier, i) in activeEvent.rewardPerLevel"
              :key="i"
              class="rounded-lg bg-surface"
            >
              <button
                type="button"
                class="flex w-full items-center justify-between px-3 py-2 text-xs text-muted hover:text-text"
                @click="toggleReward(i)"
              >
                <span>Completion {{ i + 1 }}</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="transition-transform"
                  :class="expandedRewards.has(i) ? 'rotate-90' : ''"
                  aria-hidden="true"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
              <ul v-if="expandedRewards.has(i)" class="space-y-0.5 px-3 pb-2">
                <li v-for="reward in tier" :key="reward" class="text-xs text-muted/80">
                  {{ reward }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="mb-3">
          <div class="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted/60">
            Schedule
          </div>
          <div v-if="activeEvent.schedule" class="text-xs text-muted">
            {{ formatScheduleDate(activeEvent.schedule) }}
            <span class="ml-1 tabular-nums text-copper">{{ formatCountdown(activeEvent.schedule) }}</span>
          </div>
          <div v-else class="text-xs text-muted/60">
            No upcoming run in the next 15 minutes
          </div>
        </div>

        <div>
          <div class="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted/60">
            Locations
          </div>
          <ol class="space-y-1">
            <li
              v-for="(loc, i) in activeEvent.location"
              :key="i"
              class="flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2"
            >
              <span class="text-xs tabular-nums text-muted">
                {{ i + 1 }}. {{ loc.event.x }}, {{ loc.event.z }}
              </span>
              <button
                type="button"
                class="shrink-0 rounded bg-copper/10 px-2 py-0.5 text-xs text-copper transition-colors hover:bg-copper/20"
                @click="panTo(loc.event.x, loc.event.z)"
              >
                Pan to
              </button>
            </li>
          </ol>
        </div>
      </template>
    </aside>
  </Transition>
</template>
