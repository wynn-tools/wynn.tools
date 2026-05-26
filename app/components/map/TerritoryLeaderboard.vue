<script setup lang="ts">
import type { GuildLbRow } from '~/composables/useGuildLeaderboard'
import type { TerritoryEntry } from '~/types/map'
import { ref, watch } from 'vue'
import { buildGuildLeaderboard } from '~/composables/useGuildLeaderboard'

const props = defineProps<{ territories: TerritoryEntry[] }>()

const rows = ref<GuildLbRow[]>([])
const loading = ref(true)
const error = ref(false)
const mobileExpanded = ref(false)

watch(
  () => props.territories.length,
  async () => {
    if (!props.territories.length)
      return
    loading.value = true
    error.value = false
    try {
      rows.value = await buildGuildLeaderboard(props.territories)
    }
    catch {
      error.value = true
    }
    finally {
      loading.value = false
    }
  },
  { immediate: true },
)
</script>

<template>
  <Transition
    appear
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 translate-y-1"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      role="region"
      aria-label="Territory control leaderboard"
      class="pointer-events-auto absolute left-4 right-4 top-4 z-[400] flex flex-col overflow-hidden rounded-lg bg-bg/95 shadow-xl ring-1 ring-copper/20 backdrop-blur md:left-auto md:w-72 md:max-h-[calc(100vh-5rem)]"
    >
      <!-- Header — tappable on mobile to expand/collapse -->
      <button
        type="button"
        class="flex w-full shrink-0 cursor-default items-center justify-between px-4 pb-2 pt-3 md:cursor-default cursor-pointer"

        aria-label="Toggle territory leaderboard"
        @click="mobileExpanded = !mobileExpanded"
      >
        <span class="text-sm font-semibold text-text">Territory Control</span>
        <div class="flex items-center gap-2">
          <span class="flex items-center gap-1.5 text-[10px] text-muted/60">
            <span class="relative flex h-1.5 w-1.5">
              <span
                class="absolute inline-flex h-full w-full animate-ping rounded-full bg-copper opacity-60"
              />
              <span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-copper" />
            </span>
            live
          </span>
          <!-- Expand chevron — mobile only -->
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            class="text-muted/50 transition-transform duration-200 md:hidden"
            :class="mobileExpanded ? 'rotate-180' : ''"
          >
            <path d="M2 4l4 4 4-4" />
          </svg>
        </div>
      </button>

      <!-- Body — hidden on mobile when collapsed -->
      <div
        class="flex min-h-0 flex-col overflow-hidden"
        :class="mobileExpanded ? 'max-h-[40vh]' : 'hidden md:flex md:max-h-none'"
      >
        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-8">
          <span class="text-xs text-muted/50">Loading...</span>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="px-4 py-6 text-center">
          <p class="text-xs text-muted/60">
            Could not load leaderboard
          </p>
        </div>

        <!-- Rows -->
        <ol v-else class="min-h-0 overflow-y-auto pb-2">
          <li v-for="row in rows" :key="row.name" class="flex items-center gap-2.5 px-4 py-1.5">
            <span
              class="w-6 shrink-0 text-right text-[11px] font-semibold tabular-nums"
              :class="row.rank <= 3 ? 'text-copper' : 'text-muted/40'"
            >
              {{ row.rank }}
            </span>
            <span class="h-2.5 w-2.5 shrink-0 rounded-sm" :style="{ backgroundColor: row.color }" />
            <div class="min-w-0 flex-1 truncate" :title="`[${row.prefix}] ${row.name}`">
              <span class="text-[11px] font-semibold" :style="{ color: row.color }">
                [{{ row.prefix }}]
              </span>
              <span class="ml-1 text-[11px] text-muted">{{ row.name }}</span>
            </div>
            <span class="shrink-0 text-[11px] font-semibold tabular-nums text-text">
              {{ row.liveCount }}
            </span>
          </li>
        </ol>

        <!-- Footer -->
        <div
          v-if="!loading && !error"
          class="shrink-0 border-t border-border px-4 py-2 text-[10px] text-muted/40"
        >
          Ranked by Wynncraft · counts from live map
        </div>
      </div>
    </div>
  </Transition>
</template>
