<script setup lang="ts">
import type { SearchIngredient } from '~/lib/items-search/types'
import { onBeforeUnmount, onMounted } from 'vue'
import { useMapStore } from '~/stores/map'

defineProps<{
  ingredient: SearchIngredient | null
  palette: Map<string, string>
}>()

const store = useMapStore()

const TIER_COLOR: Record<number, string> = {
  0: '#cccccc',
  1: '#f6f734',
  2: '#ff44ff',
  3: '#07f2f0',
}

function nameColor(tier: number): string {
  return TIER_COLOR[tier] ?? '#fff'
}

function spawnCount(coords: [number, number, number, number][] | null): string {
  if (!coords)
    return 'unknown location'
  return coords.length === 1 ? '1 spawn' : `${coords.length} spawns`
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape')
    store.setIngredientDrop(null)
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Transition
    enter-active-class="transition duration-200"
    enter-from-class="translate-x-full opacity-0 md:translate-x-full md:opacity-0"
    enter-to-class="translate-x-0 opacity-100"
    leave-active-class="transition duration-150"
    leave-from-class="translate-x-0 opacity-100"
    leave-to-class="translate-x-full opacity-0 md:translate-x-full md:opacity-0"
  >
    <aside
      v-if="ingredient"
      class="pointer-events-auto fixed z-[500] bottom-0 inset-x-0 max-h-[70vh] overflow-y-auto rounded-t-2xl md:absolute md:bottom-auto md:inset-x-auto md:right-4 md:top-4 md:w-80 md:rounded-lg bg-bg/95 p-4 shadow-xl ring-1 ring-copper/20 backdrop-blur"
      role="region"
      aria-label="Ingredient drop locations"
    >
      <header class="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold" :style="{ color: nameColor(ingredient.tier) }">
            {{ ingredient.displayName }}
          </h2>
          <div class="mt-1 flex items-center gap-2">
            <span
              class="inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold"
              :style="{ color: nameColor(ingredient.tier), borderColor: nameColor(ingredient.tier) }"
            >
              Tier {{ ingredient.tier }}
            </span>
            <span class="text-xs uppercase tracking-wider text-muted">Lv {{ ingredient.level }}</span>
          </div>
        </div>
        <MapCloseBtn aria-label="Close drop locations" @click="store.setIngredientDrop(null)" />
      </header>

      <p class="mb-2 text-xs text-muted">
        Dropped by
      </p>

      <ul class="flex flex-col gap-1.5">
        <li
          v-for="d in ingredient.droppedBy" :key="d.name"
          class="flex items-center gap-2 text-sm"
        >
          <span
            class="size-3 shrink-0 rounded-full border border-white/20"
            :style="d.coords ? { background: palette.get(d.name) ?? '#888' } : { background: 'transparent' }"
          />
          <span class="flex-1 truncate" :class="d.coords ? 'text-text' : 'text-muted'">
            {{ d.name }}
          </span>
          <span class="shrink-0 text-xs text-muted">
            {{ spawnCount(d.coords) }}
          </span>
        </li>
      </ul>
    </aside>
  </Transition>
</template>
