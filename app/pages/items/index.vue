<script setup lang="ts">
import type { IngredientCriteria, MaterialCriteria, TomeCriteria } from '~/lib/items-search/types'
import { useBuilderRail } from '~/composables/useBuilderRail'
import { defaultIngredientCriteria, defaultMaterialCriteria, defaultTomeCriteria } from '~/lib/items-search/criteria-url'
import { filterIngredients } from '~/lib/items-search/filter-ingredients'
import { filterItems } from '~/lib/items-search/filter-items'
import { filterMaterials } from '~/lib/items-search/filter-materials'
import { filterTomes } from '~/lib/items-search/filter-tomes'
import { useBuildStore } from '~/stores/build'

useSeoMeta({
  title: 'Item Search — wynn.tools',
  ogTitle: 'Item Search — wynn.tools',
  description: 'Search and filter Wynncraft items, ingredients, tomes, charms, and materials by stats, tier, type, and more.',
  ogDescription: 'Search and filter Wynncraft items, ingredients, tomes, charms, and materials by stats, tier, type, and more.',
  twitterCard: 'summary_large_image',
})

const RESULT_CAP = 200

const { data, pending, error, refresh } = useItemSearchData()
const { criteria } = useItemSearchQuery()
const ingredientCriteria = ref<IngredientCriteria>(defaultIngredientCriteria())
const tomeCriteria = ref<TomeCriteria>(defaultTomeCriteria())
const materialCriteria = ref<MaterialCriteria>(defaultMaterialCriteria())

type Tab = 'items' | 'ingredients' | 'tomes' | 'charms' | 'materials'
const tab = ref<Tab>('items')

const showSidebar = computed(() => tab.value !== 'charms')

// Items-page builder rail. Reconcile the persisted draft once data lands so ids
// that no longer resolve (game-data drift) are dropped. The layout reflows when
// the inline full builder is expanded.
const rail = useBuilderRail()
const railOpen = rail.open

watch(data, (d) => {
  if (d)
    rail.reconcile()
}, { immediate: true })

// While the panel is open, every edit (ability tree, skillpoints, powders, item
// swaps) changes the build hash. On each change: mirror equipment back into the
// draft (so the collapsed rail and reload restore never go stale) and persist
// the full build hash so the in-progress build survives reload.
const buildStore = useBuildStore()
watch(() => buildStore.currentHash, (hash) => {
  // Skip during promotion: loading the saved hash mutates the build before the
  // draft is applied, and syncing then would overwrite the draft with the stale
  // stored equipment (see ensurePromoted).
  if (railOpen.value && hash && !rail.promoting.value) {
    rail.syncDraftFromBuild()
    rail.persistBuildHash(hash)
  }
})

const layoutMode = computed(() => (showSidebar.value ? '' : 'layout--full'))

// Esc minimises the overlay panel.
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && railOpen.value)
    rail.closeBuilder()
}
onMounted(() => {
  // Read the persisted draft on the client, after Pinia's SSR hydration, so it
  // isn't clobbered by the empty server state. Then validate against data.
  rail.hydrateDraft()
  if (data.value)
    rail.reconcile()
  window.addEventListener('keydown', onKeydown)
})
const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | null = null

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (copyTimer)
    clearTimeout(copyTimer)
})

function copyBuildLink() {
  const hash = buildStore.currentHash
  if (!hash)
    return
  navigator.clipboard.writeText(`${window.location.origin}/builder/${hash}`)
  copied.value = true
  if (copyTimer)
    clearTimeout(copyTimer)
  copyTimer = setTimeout(() => {
    copied.value = false
  }, 1500)
}

const itemResults = computed(() => data.value ? filterItems(data.value.items, criteria.value) : [])
const ingredientResults = computed(() => data.value ? filterIngredients(data.value.ingredients, ingredientCriteria.value) : [])
const tomeResults = computed(() => data.value ? filterTomes(data.value.tomes, tomeCriteria.value) : [])
const materialResults = computed(() => data.value ? filterMaterials(data.value.materials, materialCriteria.value) : [])
const majorIdOptions = computed(() =>
  data.value
    ? [...new Set(data.value.items.flatMap(i => i.majorIds.map(m => m.name)))].sort()
    : [],
)
const setOptions = computed(() =>
  data.value
    ? [...new Set(data.value.items.flatMap(i => i.sets))].sort()
    : [],
)
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <div class="tabs" role="tablist">
        <button :class="{ on: tab === 'items' }" role="tab" :aria-selected="tab === 'items'" @click="tab = 'items'">
          Items
        </button>
        <button :class="{ on: tab === 'ingredients' }" role="tab" :aria-selected="tab === 'ingredients'" @click="tab = 'ingredients'">
          Ingredients
        </button>
        <button :class="{ on: tab === 'tomes' }" role="tab" :aria-selected="tab === 'tomes'" @click="tab = 'tomes'">
          Tomes
        </button>
        <button :class="{ on: tab === 'charms' }" role="tab" :aria-selected="tab === 'charms'" @click="tab = 'charms'">
          Charms
        </button>
        <button :class="{ on: tab === 'materials' }" role="tab" :aria-selected="tab === 'materials'" @click="tab = 'materials'">
          Materials
        </button>
      </div>
    </div>

    <div v-if="pending" class="state">
      Loading…
    </div>
    <div v-else-if="error" class="state">
      Failed to load item data. <button @click="refresh()">
        Retry
      </button>
    </div>

    <div v-else class="layout" :class="layoutMode">
      <FiltersSidebar v-if="showSidebar" panel-id="search-filters-panel">
        <template #name>
          <input
            v-if="tab === 'items'"
            :value="criteria.name"
            class="f-input"
            type="text"
            placeholder="Item name…"
            @input="criteria = { ...criteria, name: ($event.target as HTMLInputElement).value }"
          >
          <input
            v-else-if="tab === 'ingredients'"
            :value="ingredientCriteria.name"
            class="f-input"
            type="text"
            placeholder="Ingredient name…"
            @input="ingredientCriteria = { ...ingredientCriteria, name: ($event.target as HTMLInputElement).value }"
          >
          <input
            v-else-if="tab === 'tomes'"
            :value="tomeCriteria.name"
            class="f-input"
            type="text"
            placeholder="Tome name…"
            @input="tomeCriteria = { ...tomeCriteria, name: ($event.target as HTMLInputElement).value }"
          >
          <input
            v-else-if="tab === 'materials'"
            :value="materialCriteria.name"
            class="f-input"
            type="text"
            placeholder="Material name…"
            @input="materialCriteria = { ...materialCriteria, name: ($event.target as HTMLInputElement).value }"
          >
        </template>
        <ItemSearchFilters v-if="tab === 'items'" v-model="criteria" :major-id-options="majorIdOptions" :set-options="setOptions" />
        <IngredientSearchFilters v-else-if="tab === 'ingredients'" v-model="ingredientCriteria" />
        <TomeSearchFilters v-else-if="tab === 'tomes'" v-model="tomeCriteria" />
        <MaterialSearchFilters v-else-if="tab === 'materials'" v-model="materialCriteria" />
      </FiltersSidebar>

      <section class="results">
        <template v-if="tab === 'items'">
          <header class="results-head">
            <span class="count">{{ itemResults.length.toLocaleString() }} items</span>
            <span v-if="itemResults.length > RESULT_CAP" class="count count--dim">Showing first {{ RESULT_CAP }} of {{ itemResults.length.toLocaleString() }} — add identification filters to narrow further.</span>
          </header>
          <div v-if="itemResults.length" class="results-list">
            <ItemResultCard
              v-for="it in itemResults.slice(0, RESULT_CAP)"
              :key="it.id"
              :item="it"
            />
          </div>
          <p v-else class="state">
            No items match these filters.
          </p>
        </template>

        <template v-else-if="tab === 'ingredients'">
          <header class="results-head">
            <span class="count">{{ ingredientResults.length.toLocaleString() }} ingredients</span>
            <span v-if="ingredientResults.length > RESULT_CAP" class="count count--dim">showing first {{ RESULT_CAP }}</span>
          </header>
          <div v-if="ingredientResults.length" class="results-list">
            <IngredientResultCard v-for="ing in ingredientResults.slice(0, RESULT_CAP)" :key="ing.id" :ingredient="ing" />
          </div>
          <p v-else class="state">
            No ingredients match these filters.
          </p>
        </template>

        <template v-else-if="tab === 'tomes'">
          <header class="results-head">
            <span class="count">{{ tomeResults.length.toLocaleString() }} tomes</span>
            <span v-if="tomeResults.length > RESULT_CAP" class="count count--dim">showing first {{ RESULT_CAP }}</span>
          </header>
          <div v-if="tomeResults.length" class="results-list">
            <TomeResultCard v-for="tome in tomeResults.slice(0, RESULT_CAP)" :key="tome.id" :tome="tome" />
          </div>
          <p v-else class="state">
            No tomes match these filters.
          </p>
        </template>

        <template v-else-if="tab === 'charms'">
          <header class="results-head">
            <span class="count">{{ data?.charms.length ?? 0 }} charms</span>
          </header>
          <div v-if="data?.charms.length" class="results-list">
            <CharmResultCard v-for="charm in data.charms" :key="charm.id" :charm="charm" />
          </div>
          <p v-else class="state">
            No charms available.
          </p>
        </template>

        <template v-else-if="tab === 'materials'">
          <header class="results-head">
            <span class="count">{{ materialResults.length.toLocaleString() }} materials</span>
            <span v-if="materialResults.length > RESULT_CAP" class="count count--dim">showing first {{ RESULT_CAP }}</span>
          </header>
          <div v-if="materialResults.length" class="results-list">
            <MaterialResultCard v-for="mat in materialResults.slice(0, RESULT_CAP)" :key="mat.id" :material="mat" />
          </div>
          <p v-else class="state">
            No materials match these filters.
          </p>
        </template>
      </section>

      <!-- Slim build preview rail (desktop only; mobile uses the FAB). Stays
           put when the panel expands — the panel slides over it. -->
      <BuilderRail class="rail-col" @expand="rail.openBuilder()" />
    </div>

    <!-- Expanded: the full builder slides in from the right, overlaying the
         results. Results stay put; the user expands and minimises the panel. -->
    <Teleport to="body">
      <Transition name="build-panel">
        <div v-if="railOpen" class="build-overlay">
          <div class="build-scrim" @click="rail.closeBuilder()" />
          <section class="build-panel" aria-label="Build workspace">
            <header class="build-panel-head">
              <span class="kicker">Build</span>
              <span class="build-panel-count">{{ rail.count.value }}/9</span>
              <button
                type="button"
                class="build-copy"
                :class="{ 'build-copy--copied': copied }"
                :disabled="!buildStore.currentHash || rail.promoting.value"
                :aria-label="copied ? 'Copied to clipboard' : (buildStore.currentHash ? 'Copy build link' : 'No build to copy')"
                @click="copyBuildLink"
              >
                {{ copied ? 'Copied' : 'Copy link' }}
              </button>
              <button type="button" class="build-min" @click="rail.closeBuilder()">
                Minimise <span class="build-min-arrow" aria-hidden="true">›</span>
              </button>
            </header>
            <div class="build-panel-body">
              <p v-if="rail.promoting.value" class="build-panel-loading">
                Loading builder…
              </p>
              <BuilderWorkspace v-else embedded />
            </div>
          </section>
        </div>
      </Transition>
    </Teleport>

    <BuilderFab v-if="!railOpen" />
    <AppToasts />
  </div>
</template>

<style scoped>
/* Lock the page to the viewport below the global nav so the sidebar and results
   each scroll inside their own column instead of forcing the whole page to scroll. */
.page {
  height: calc(100dvh - 76px);
  display: flex;
  flex-direction: column;
  padding: 20px 0 0;
  overflow: hidden;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 20px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}
/* Add the build rail as a third column. Scoped specificity beats the global
   `.layout` rule, so these widths win at desktop sizes. */
.layout {
  --rail-w: 124px;
  /* The third track stays reserved (124px) for the build rail, which is
     position: fixed and viewport-centred, so results never run under it. */
  grid-template-columns: 248px minmax(0, 1fr) var(--rail-w);
  gap: 28px;
  flex: 1;
  min-height: 0;
}
.layout--full {
  grid-template-columns: minmax(0, 1fr) var(--rail-w);
}
/* `:deep()` because the `<aside class="sidebar">` element is rendered by the
   FiltersSidebar child component, so page-scoped selectors don't reach it
   directly. Without this the global `position: sticky; top: 76px` wins and
   the sidebar refuses to scroll. The shell fills the column; the aside inside
   it flexes to fill the remaining height below the always-visible name input. */
.layout :deep(.filters-shell) {
  height: 100%;
  min-height: 0;
}
.layout :deep(.sidebar) {
  position: static;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 8px;
  padding-bottom: 24px;
  scrollbar-width: thin;
}
.results {
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
  padding-bottom: 24px;
  scrollbar-width: thin;
}
.results-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
  height: 22px;
}
.count {
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text);
}
.count--dim {
  color: var(--color-muted);
}
/* CSS-columns masonry: each card has break-inside: avoid + margin-bottom for
   the row gap. Columns reflow with the container width — no JS measurement. */
.results-list {
  column-width: 280px;
  column-gap: 12px;
}
/* ── Slide-out full-builder panel (overlays the results) ─────────── */
.build-overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
}
.build-scrim {
  position: absolute;
  inset: 0;
  background: oklch(0% 0 0 / 0.42);
  backdrop-filter: blur(1.5px);
}
.build-panel {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  width: min(1480px, 97vw);
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
  border-left: 1px solid color-mix(in oklch, var(--color-accent) 20%, var(--color-border));
  box-shadow: -12px 0 48px oklch(0% 0 0 / 0.4);
}
.build-panel-head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  padding: 14px 20px;
  border-bottom: 1px solid var(--color-border);
  background: color-mix(in oklch, var(--color-surface) 60%, var(--color-bg));
}
.build-panel-count {
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.08em;
  color: var(--color-text);
}
.build-copy {
  display: inline-flex;
  align-items: center;
  margin-left: auto;
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 8px 12px;
  cursor: pointer;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out,
    background 0.12s ease-out;
}
.build-copy:hover:not(:disabled) {
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.build-copy:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
.build-copy:disabled {
  color: var(--color-faint);
  cursor: not-allowed;
}
.build-copy--copied {
  color: var(--color-accent);
  background: color-mix(in oklch, var(--color-accent) 8%, transparent);
  border-color: var(--color-accent);
  pointer-events: none;
}

.build-min {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 8px 12px;
  cursor: pointer;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out;
}
.build-min:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.build-min:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
.build-min-arrow {
  font-size: 14px;
  line-height: 1;
  transition: transform 0.15s ease-out;
}
.build-min:hover .build-min-arrow {
  transform: translateX(2px);
}
.build-panel-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px clamp(16px, 2vw, 28px) 40px;
}
.build-panel-loading {
  font: 400 13px/1.4 var(--font-mono);
  letter-spacing: 0.04em;
  color: var(--color-muted);
  padding: 40px 4px;
}

.build-panel-enter-active,
.build-panel-leave-active {
  transition: opacity 0.2s ease-out;
}
.build-panel-enter-active .build-panel,
.build-panel-leave-active .build-panel {
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}
.build-panel-enter-from,
.build-panel-leave-to {
  opacity: 0;
}
.build-panel-enter-from .build-panel,
.build-panel-leave-to .build-panel {
  transform: translateX(100%);
}

@media (prefers-reduced-motion: reduce) {
  .build-copy,
  .build-min-arrow {
    transition: none;
  }
  .build-panel-enter-active,
  .build-panel-leave-active,
  .build-panel-enter-active .build-panel,
  .build-panel-leave-active .build-panel {
    transition: none;
  }
}

/* Below the side-rail breakpoint, the rail collapses to the floating FAB and
   the search returns to a single stacked column. */
@media (max-width: 900px) {
  /* Below the desktop breakpoint the sidebar moves into a sheet and the page
     reverts to natural scrolling — the locked-viewport layout only makes sense
     when both columns are visible side-by-side. */
  .page {
    height: auto;
    overflow: visible;
    padding-bottom: 64px;
  }
  .layout,
  .layout--full {
    grid-template-columns: 1fr;
    gap: 20px;
    min-height: 0;
  }
  .layout :deep(.sidebar),
  .results {
    height: auto;
    overflow: visible;
    padding-right: 0;
    padding-bottom: 0;
  }
  .rail-col {
    display: none;
  }
}

@media (max-width: 720px) {
  .page {
    padding: 12px 0 48px;
  }
  .toolbar {
    padding-bottom: 14px;
    margin-bottom: 16px;
  }
  .results-list--charms {
    grid-template-columns: 1fr;
  }
  .results-head {
    margin-bottom: 10px;
  }
}
</style>
