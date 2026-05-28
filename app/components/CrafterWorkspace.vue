<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useCdnClient } from '~/composables/useBuildData'
import { useCraftStore } from '~/stores/craft'

// `embedded`: when true, this workspace is being mounted inside another tool
// (the builder hosts the crafter in the ItemPicker). In embedded mode
// we don't own the URL (the host does); the URL-sync watcher is suppressed so
// builder navigation isn't hijacked.
// `onEquip` / `equipDisabledReason`: when supplied, the embedded preview shows
// an active "Equip in this slot" CTA that delegates back to the host. The host
// is responsible for closing whatever modal/picker it owns.
const props = withDefaults(defineProps<{
  embedded?: boolean
  onEquip?: () => void
  equipDisabledReason?: string | null
}>(), {
  embedded: false,
  onEquip: undefined,
  equipDisabledReason: null,
})

const store = useCraftStore()

// Embedded mode is responsible for ensuring the craft context is loaded — the
// standalone `/crafter` page does this in its own onMounted, but when we're
// hosted inside the ItemPicker the page-level mount hook never runs. Guard with
// a ctx check so re-mounting (e.g. switching tabs) doesn't refetch.
onMounted(async () => {
  if (!props.embedded)
    return
  if (store.ctx || store.loading)
    return
  await store.loadFresh(-1, useCdnClient())
})

// URL sync: every shareHash change rewrites the URL bar without triggering a
// route navigation (mirrors how the builder mutates its URL during edits).
// `replaceState` keeps history clean — one URL per session, not one per click.
watch(
  () => store.shareHash,
  (hash) => {
    if (props.embedded)
      return
    if (typeof window === 'undefined')
      return
    if (!hash)
      return
    const target = `/crafter/${hash}`
    if (window.location.pathname === target)
      return
    window.history.replaceState(window.history.state, '', target)
  },
)
</script>

<template>
  <main class="crafter">
    <p v-if="store.loading" class="state-text">
      Loading crafter…
    </p>
    <p v-else-if="store.error" class="state-text state-text--error">
      Failed to load crafter: {{ store.error }}
    </p>
    <template v-else-if="store.ctx">
      <div class="cw-grid">
        <section class="cw-inputs" aria-label="Recipe and materials">
          <CrafterRecipePanel />
          <CrafterMaterialPanel />
        </section>

        <section class="cw-preview" aria-label="Crafted item preview">
          <CraftedItemPreview
            :hide-equip-button="embedded && !onEquip"
            :on-equip="onEquip"
            :equip-disabled-reason="equipDisabledReason"
          />
        </section>

        <section class="cw-ingredients" aria-label="Ingredients">
          <CrafterIngredientGrid />
        </section>
      </div>
    </template>
  </main>
</template>

<style scoped>
.crafter {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 32px clamp(16px, 3vw, 40px) 64px;
  max-width: 1600px;
  width: 100%;
  margin: 0 auto;
}

.state-text {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 13px;
  color: var(--color-muted);
  letter-spacing: 0.04em;
}

.state-text--error {
  color: oklch(62% 0.15 20);
}

/*
 * Desktop layout: two columns. Left column stacks recipe/material panels above
 * the ingredient grid; right column is the crafted preview spanning both rows.
 *
 *   ┌────────────────────────┬──────────────┐
 *   │ RecipePanel + MatPanel │              │
 *   ├────────────────────────┤   Preview    │
 *   │ IngredientGrid         │              │
 *   └────────────────────────┴──────────────┘
 */
.cw-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1.6fr) minmax(280px, 1fr);
  grid-template-areas:
    'inputs preview'
    'ingredients preview';
  align-items: start;
}

.cw-inputs {
  grid-area: inputs;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.cw-preview {
  grid-area: preview;
  min-width: 0;
  position: sticky;
  top: 68px;
}

.cw-ingredients {
  grid-area: ingredients;
  min-width: 0;
}

@media (max-width: 1023px) {
  .cw-grid {
    grid-template-columns: 1fr;
    grid-template-areas:
      'inputs'
      'ingredients'
      'preview';
  }
  .cw-preview {
    position: static;
  }
}
</style>
