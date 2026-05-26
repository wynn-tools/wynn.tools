<script setup lang="ts">
import { computed, ref } from 'vue'
import { parseLootrun } from '~/composables/useLootrunParse'
import { findWorldByBbox } from '~/config/worlds'
import { useMapStore } from '~/stores/map'

const open = defineModel<boolean>({ default: false })
const store = useMapStore()
const error = ref<string | null>(null)
const pasted = ref('')
const dragOver = ref(false)

const distance = computed(() =>
  store.lootrun?.blockDistance ? Math.round(store.lootrun.blockDistance).toLocaleString() : '0',
)

async function ingest(text: string) {
  error.value = null
  try {
    const parsed = parseLootrun(text)
    const world = findWorldByBbox(parsed.bbox)
    if (!world) {
      error.value = 'Out of bounds — this run is in a quest area not available in v1.'
      return
    }
    store.setWorld(world.id)
    store.setLootrun({
      points: parsed.points,
      chests: parsed.chests,
      bbox: parsed.bbox,
      blockDistance: parsed.blockDistance,
      worldId: world.id,
    })
    pasted.value = ''
    error.value = null
  }
  catch (e: any) {
    error.value = e?.message ?? 'Failed to parse lootrun'
  }
}

async function onFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f)
    return
  ingest(await f.text())
}

async function onDrop(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f)
    ingest(await f.text())
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="translate-x-4 opacity-0"
    enter-to-class="translate-x-0 opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="translate-x-0 opacity-100"
    leave-to-class="translate-x-4 opacity-0"
  >
    <aside
      v-if="open"
      class="pointer-events-auto absolute right-4 top-4 z-[420] w-72 overflow-hidden rounded-lg bg-bg/95 shadow-xl ring-1 ring-copper/20 backdrop-blur"
      role="region"
      aria-label="Lootrun route"
    >
      <!-- Header -->
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
            <circle cx="5" cy="6" r="2" />
            <path d="M7 6h4a4 4 0 0 1 4 4v2a4 4 0 0 0 4 4" />
            <circle cx="19" cy="18" r="2" />
          </svg>
          <h2 class="text-sm font-semibold text-copper">
            Route
          </h2>
        </div>
        <MapCloseBtn aria-label="Close route panel" @click="open = false" />
      </header>

      <!-- No lootrun: upload area -->
      <div v-if="!store.lootrun" class="p-4">
        <div
          class="mb-4 rounded-lg border-2 border-dashed p-5 text-center transition-colors duration-150"
          :class="dragOver ? 'border-copper bg-copper/5' : 'border-copper/20'"
          @dragover.prevent="dragOver = true"
          @dragleave="dragOver = false"
          @drop="onDrop"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="mx-auto mb-2 text-muted/40"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p class="mb-3 text-xs text-muted">
            Drag a <code class="text-copper">.json</code> lootrun file here
          </p>
          <label
            class="cursor-pointer rounded-md bg-copper/10 px-3 py-1.5 text-xs text-copper transition-colors hover:bg-copper/20"
          >
            Browse file
            <input type="file" accept=".json,application/json" class="sr-only" @change="onFile">
          </label>
        </div>

        <p class="mb-1 text-xs text-muted/60">
          Or paste JSON:
        </p>
        <textarea
          v-model="pasted"
          rows="3"
          class="w-full rounded-md bg-card px-3 py-2 font-mono text-xs text-copper ring-1 ring-border focus:outline-none focus:ring-copper/50"
          placeholder="{&quot;points&quot;:[...]}"
        />

        <p v-if="error" class="mt-2 rounded bg-red-500/10 px-2 py-1.5 text-xs text-red-400">
          {{ error }}
        </p>

        <div class="mt-3 flex justify-end">
          <button
            type="button"
            class="rounded-md bg-copper/20 px-4 py-1.5 text-sm font-medium text-copper transition-colors hover:bg-copper/30 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="!pasted.trim()"
            @click="ingest(pasted)"
          >
            Load
          </button>
        </div>
      </div>

      <!-- Lootrun active: stats + actions -->
      <div v-else class="p-4">
        <!-- Stats row -->
        <div class="mb-5 flex items-center gap-5">
          <div>
            <p class="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted/50">
              Points
            </p>
            <p class="font-semibold tabular-nums text-text">
              {{ store.lootrun.points.length.toLocaleString() }}
            </p>
          </div>
          <div class="h-6 w-px bg-border" aria-hidden="true" />
          <div>
            <p class="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted/50">
              Distance
            </p>
            <p class="font-semibold tabular-nums text-text">
              {{ distance }}
              <span class="text-xs font-normal text-muted">blocks</span>
            </p>
          </div>
          <div class="h-6 w-px bg-border" aria-hidden="true" />
          <div>
            <p class="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted/50">
              Chests
            </p>
            <p class="font-semibold tabular-nums text-text">
              {{ (store.lootrun.chests?.length ?? 0).toLocaleString() }}
            </p>
          </div>
        </div>

        <!-- Name field (future) -->
        <div class="mb-4">
          <label class="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted">
            Name
            <span
              class="rounded bg-card px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted/40 ring-1 ring-border"
            >
              coming soon
            </span>
          </label>
          <input
            type="text"
            placeholder="Name this route..."
            disabled
            class="w-full cursor-not-allowed rounded-md border border-border bg-card/40 px-3 py-1.5 text-sm text-muted/30 placeholder:text-muted/20 focus:outline-none"
          >
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <button
            type="button"
            disabled
            title="Save to account (coming soon)"
            class="flex-1 cursor-not-allowed rounded-md border border-border px-3 py-1.5 text-xs text-muted/30"
          >
            Save
          </button>
          <button
            type="button"
            disabled
            title="Share route (coming soon)"
            class="flex-1 cursor-not-allowed rounded-md border border-border px-3 py-1.5 text-xs text-muted/30"
          >
            Share
          </button>
          <button
            type="button"
            class="rounded-md bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/20"
            @click="store.clearLootrun"
          >
            Clear
          </button>
        </div>
      </div>
    </aside>
  </Transition>
</template>
