<script setup lang="ts">
import type {
  TerritoryEntry,
  TerritoryRating,
  TerritoryResource,
  TerritoryResourceType,
} from '~/types/map'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { getGuildTerritoryCount } from '~/composables/useTerritoryData'

const props = defineProps<{
  territory: TerritoryEntry | null
}>()

const emit = defineEmits<{
  close: []
}>()

function formatHeldTime(acquired: string | null): string {
  if (!acquired)
    return 'Unknown'
  const ms = Date.now() - new Date(acquired).getTime()
  if (ms < 0)
    return 'Unknown'
  const totalMinutes = Math.floor(ms / 60_000)
  if (totalMinutes < 60)
    return `${totalMinutes}m`
  const hours = Math.floor(totalMinutes / 60)
  if (hours < 24)
    return `${hours}h ${totalMinutes % 60}m`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}

const heldTime = computed(() => formatHeldTime(props.territory?.acquired ?? null))
const guildCount = computed(() =>
  props.territory?.guild ? getGuildTerritoryCount(props.territory.guild.name) : 0,
)

const RESOURCE_LABELS: Record<TerritoryResourceType, string> = {
  EMERALD: 'Emerald',
  ORE: 'Ore',
  WOOD: 'Wood',
  FISH: 'Fish',
  CROP: 'Crop',
}

const RESOURCE_ORDER: TerritoryResourceType[]
  = ['EMERALD', 'ORE', 'WOOD', 'FISH', 'CROP']

const orderedResources = computed<TerritoryResource[]>(() => {
  const list = props.territory?.resources ?? []
  if (list.length === 0)
    return []
  const byType = new Map(list.map(r => [r.type, r]))
  return RESOURCE_ORDER.flatMap(t => (byType.has(t) ? [byType.get(t)!] : []))
})

const RATING_LABEL: Record<TerritoryRating, string> = {
  VERY_LOW: 'Very Low',
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  VERY_HIGH: 'Very High',
}

function ratingLabel(r: TerritoryRating | undefined): string {
  return r ? RATING_LABEL[r] : '—'
}

function resourceLabel(t: TerritoryResourceType): string {
  return RESOURCE_LABELS[t]
}

function rateText(r: TerritoryResource): string {
  return `${r.generation.toLocaleString()}/h`
}

function storedText(r: TerritoryResource): string {
  return `${r.stored.toLocaleString()} / ${r.limit.toLocaleString()}`
}

function isBoosted(r: TerritoryResource): boolean {
  return r.generation > r.baseGeneration
}

function fillPct(r: TerritoryResource): number {
  if (r.limit <= 0)
    return 0
  return Math.max(0, Math.min(100, (r.stored / r.limit) * 100))
}

function isDepleted(r: TerritoryResource): boolean {
  return r.limit > 0 && r.stored / r.limit <= 0.1
}

const copied = ref(false)
function copyGuildName() {
  if (!props.territory?.guild)
    return
  navigator.clipboard.writeText(props.territory.guild.name).then(() => {
    copied.value = true
    setTimeout(() => (copied.value = false), 1400)
  })
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.territory) {
    emit('close')
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="translate-x-2 opacity-0"
    enter-to-class="translate-x-0 opacity-100"
    leave-active-class="transition duration-100 ease-out"
    leave-from-class="translate-x-0 opacity-100"
    leave-to-class="translate-x-2 opacity-0"
  >
    <aside
      v-if="territory"
      class="pointer-events-auto absolute right-4 top-4 z-[400] hidden max-h-[calc(100vh-9rem)] w-80 flex-col overflow-hidden rounded-lg bg-bg/95 shadow-xl ring-1 ring-accent/20 backdrop-blur md:flex"
      role="dialog"
      :aria-label="`Territory ${territory.name}`"
    >
      <!-- Header -->
      <header class="flex shrink-0 items-start justify-between gap-2 border-b border-border px-3 py-2.5">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5">
            <h2 class="truncate text-sm font-semibold leading-tight text-text">
              {{ territory.name }}
            </h2>
            <span
              v-if="territory.hq"
              class="shrink-0 rounded bg-accent/10 px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-accent"
              title="Guild HQ"
            >
              HQ
            </span>
          </div>
        </div>
        <MapCloseBtn aria-label="Close territory panel" @click="emit('close')" />
      </header>

      <!-- Scrollable body -->
      <div class="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <!-- Guild block -->
        <section class="border-b border-border px-3 py-2.5">
          <template v-if="territory.guild">
            <div class="flex items-center gap-2">
              <span
                class="inline-block h-3 w-3 shrink-0 rounded-sm ring-1 ring-inset ring-black/20"
                :style="{ backgroundColor: territory.guild.color }"
              />
              <span class="shrink-0 font-semibold" :style="{ color: territory.guild.color }">
                [{{ territory.guild.prefix }}]
              </span>
              <span class="min-w-0 flex-1 truncate text-sm text-text">{{ territory.guild.name }}</span>
              <button
                type="button"
                class="shrink-0 rounded p-1 text-muted/60 transition-colors hover:text-accent"
                :aria-label="copied ? 'Copied' : 'Copy guild name'"
                :title="copied ? 'Copied' : 'Copy guild name'"
                @click="copyGuildName"
              >
                <svg
                  v-if="!copied"
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <svg
                  v-else
                  width="11"
                  height="11"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  aria-hidden="true"
                  class="text-accent"
                >
                  <path d="M2 6l3 3 5-5" />
                </svg>
              </button>
            </div>
            <div class="mt-1.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted/70">
              <span>Held <span class="text-text/80">{{ heldTime }}</span></span>
              <span v-if="guildCount > 0" class="text-muted/40">·</span>
              <span v-if="guildCount > 0">
                <span class="tabular-nums text-text/80">{{ guildCount }}</span>
                held
              </span>
            </div>
          </template>
          <div v-else class="text-sm text-muted/70">
            Unclaimed
          </div>
        </section>

        <!-- Treasury / Defences chips -->
        <section
          v-if="territory.guild && (territory.treasury || territory.defences)"
          class="grid grid-cols-2 gap-2 border-b border-border px-3 py-2.5"
        >
          <div class="rounded-md border border-border bg-surface/60 px-2 py-1.5">
            <div class="font-mono text-[10px] uppercase tracking-wider text-muted/60">
              Treasury
            </div>
            <div class="mt-0.5 text-sm font-medium text-text">
              {{ ratingLabel(territory.treasury) }}
            </div>
          </div>
          <div class="rounded-md border border-border bg-surface/60 px-2 py-1.5">
            <div class="font-mono text-[10px] uppercase tracking-wider text-muted/60">
              Defences
            </div>
            <div class="mt-0.5 text-sm font-medium text-text">
              {{ ratingLabel(territory.defences) }}
            </div>
          </div>
        </section>

        <!-- Resources -->
        <section
          v-if="orderedResources.length > 0"
          class="border-b border-border px-3 py-2.5"
        >
          <h3 class="mb-2 font-mono text-[10px] font-medium uppercase tracking-wider text-muted/70">
            Resources
          </h3>
          <ul class="space-y-1.5">
            <li
              v-for="r in orderedResources"
              :key="r.type"
              class="grid grid-cols-[1fr_auto] gap-x-2 gap-y-1"
            >
              <span class="font-mono text-[11px] uppercase tracking-wider text-muted">
                {{ resourceLabel(r.type) }}
              </span>
              <span
                class="flex items-center gap-1 font-mono text-[11px] tabular-nums"
                :class="isBoosted(r) ? 'text-accent' : 'text-text/80'"
              >
                <svg
                  v-if="isBoosted(r)"
                  width="8"
                  height="8"
                  viewBox="0 0 8 8"
                  aria-hidden="true"
                  class="shrink-0"
                >
                  <polygon points="4 1 7 7 1 7" fill="currentColor" />
                </svg>
                {{ rateText(r) }}
              </span>
              <div class="col-span-2 flex items-center gap-2">
                <div class="h-1 flex-1 overflow-hidden rounded-full bg-border/60">
                  <div
                    class="h-full rounded-full transition-[width] duration-300"
                    :class="
                      isBoosted(r)
                        ? 'bg-accent/70'
                        : isDepleted(r)
                          ? 'bg-accent-dim/40'
                          : 'bg-muted/40'
                    "
                    :style="{ width: `${fillPct(r)}%` }"
                  />
                </div>
                <span class="shrink-0 font-mono text-[10px] tabular-nums text-muted/70">
                  {{ storedText(r) }}
                </span>
              </div>
            </li>
          </ul>
        </section>

        <!-- Connections count (lines are drawn on the map) -->
        <section v-if="territory.links && territory.links.length > 0" class="px-3 py-2.5">
          <div class="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-wider text-muted/70">
            <span>Connections</span>
            <span class="tabular-nums text-text/80">{{ territory.links.length }}</span>
          </div>
        </section>
      </div>
    </aside>
  </Transition>
</template>
