<script setup lang="ts">
import { ref } from 'vue'
import { parseLootrun } from '~/composables/useLootrunParse'
import { findWorldByBbox } from '~/config/worlds'
import { useMapStore } from '~/stores/map'

const open = defineModel<boolean>({ default: false })
const store = useMapStore()
const error = ref<string | null>(null)
const pasted = ref('')
const dragOver = ref(false)

async function ingest(text: string) {
  error.value = null
  try {
    const parsed = parseLootrun(text)
    const world = findWorldByBbox(parsed.bbox)
    if (!world) {
      error.value = 'Lootrun out of bounds — this run is in a quest area not available in v1.'
      return
    }
    store.setWorld(world.id)
    store.setLootrun({
      points: parsed.points,
      bbox: parsed.bbox,
      blockDistance: parsed.blockDistance,
      worldId: world.id,
    })
    open.value = false
    pasted.value = ''
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
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-[800] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        @click.self="open = false"
      >
        <div
          class="w-full max-w-md rounded-xl bg-bg/98 p-5 shadow-2xl ring-1 ring-copper/20"
        >
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-semibold text-copper">
              Load Lootrun
            </h2>
            <button type="button" class="text-muted hover:text-copper" @click="open = false">
              ✕
            </button>
          </div>

          <div
            class="mb-4 rounded-lg border-2 border-dashed p-6 text-center transition"
            :class="dragOver ? 'border-copper bg-copper/5' : 'border-copper/20'"
            @dragover.prevent="dragOver = true"
            @dragleave="dragOver = false"
            @drop="onDrop"
          >
            <p class="mb-2 text-sm text-muted">
              Drag & drop a <code>.json</code> lootrun file here
            </p>
            <label
              class="cursor-pointer rounded-md bg-copper/10 px-3 py-1.5 text-sm text-copper hover:bg-copper/20"
            >
              Browse
              <input type="file" accept=".json,application/json" class="sr-only" @change="onFile">
            </label>
          </div>

          <div class="mb-1 text-xs text-muted">
            Or paste JSON:
          </div>
          <textarea
            v-model="pasted"
            rows="4"
            class="w-full rounded-md bg-black/30 px-3 py-2 text-xs text-copper ring-1 ring-copper/20 focus:outline-none focus:ring-copper/60"
            placeholder="{&quot;points&quot;:[...]}"
          />

          <div v-if="error" class="mt-2 rounded bg-red-500/10 px-2 py-1 text-xs text-red-400">
            {{ error }}
          </div>

          <div class="mt-3 flex justify-end gap-2">
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-sm text-muted hover:text-copper"
              @click="open = false"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-md bg-copper/20 px-3 py-1.5 text-sm text-copper hover:bg-copper/30"
              :disabled="!pasted.trim()"
              @click="ingest(pasted)"
            >
              Load
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
