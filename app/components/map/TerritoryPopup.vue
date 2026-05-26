<script setup lang="ts">
import type { TerritoryEntry } from '~/types/map'
import { computed, ref } from 'vue'
import { getGuildTerritoryCount } from '~/composables/useTerritoryData'

const props = defineProps<{
  territory: TerritoryEntry | null
  screenPos: { x: number, y: number } | null
}>()
const emit = defineEmits<{ close: [] }>()

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

const copied = ref(false)
function copyGuildName() {
  if (!props.territory?.guild)
    return
  navigator.clipboard.writeText(props.territory.guild.name).then(() => {
    copied.value = true
    setTimeout(() => (copied.value = false), 1400)
  })
}
</script>

<template>
  <MapTooltip
    v-if="territory"
    :screen-pos="screenPos"
    role="tooltip"
    class="min-w-[210px] max-w-[280px]"
  >
    <!-- Territory name + close -->
    <div class="mb-2.5 flex items-start justify-between gap-2">
      <span class="text-sm font-medium leading-tight text-text">{{ territory.name }}</span>
      <MapCloseBtn class="mt-0.5 shrink-0" aria-label="Close" @click="emit('close')" />
    </div>

    <template v-if="territory.guild">
      <!-- Guild identity row -->
      <div class="mb-2 flex items-center gap-1.5">
        <span
          class="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
          :style="{ backgroundColor: territory.guild.color }"
        />
        <span class="font-semibold" :style="{ color: territory.guild.color }">
          [{{ territory.guild.prefix }}]
        </span>
        <span class="truncate text-muted">{{ territory.guild.name }}</span>
        <button
          type="button"
          class="ml-auto shrink-0 rounded p-0.5 text-muted/40 transition-colors hover:text-copper"
          :aria-label="copied ? 'Copied' : 'Copy guild name'"
          :title="copied ? 'Copied!' : 'Copy guild name'"
          @click="copyGuildName"
        >
          <svg
            v-if="!copied"
            width="10"
            height="10"
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
            width="10"
            height="10"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
            class="text-copper"
          >
            <path d="M2 6l3 3 5-5" />
          </svg>
        </button>
      </div>

      <!-- Stats row: held time and territory count on separate lines for clarity -->
      <div class="space-y-0.5 text-muted/70">
        <div>Held {{ heldTime }}</div>
        <div v-if="guildCount > 0">
          <span class="font-semibold tabular-nums text-text">{{ guildCount }}</span>
          <span class="ml-1">territories held</span>
        </div>
      </div>
    </template>

    <div v-else class="text-muted/70">
      Unclaimed
    </div>
  </MapTooltip>
</template>
