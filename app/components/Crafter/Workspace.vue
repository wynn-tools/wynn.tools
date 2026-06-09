<script setup lang="ts">
import type { Ingredient } from '~/lib/data/cdn-adapter/ingredient-adapter'
import { onMounted, ref, watch } from 'vue'
import { useCdnClient } from '~/composables/useBuildData'
import { useMediaQuery } from '~/composables/useMediaQuery'
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
  lockedType?: string | null
  savedId?: string
  isOwner?: boolean
  visibility?: 'public' | 'unlisted' | 'private'
}>(), {
  embedded: false,
  onEquip: undefined,
  equipDisabledReason: null,
  savedId: undefined,
  isOwner: false,
  visibility: undefined,
})

const store = useCraftStore()

// Picker state lives here so the picker can mount either inline in the right
// rail (desktop) or as a fixed overlay (tablet/mobile). The grid is dumb about
// where the picker lives — it just emits `open(index)` and reads back
// `openSlot` + `hoveredIngredient` to compute effectiveness previews.
const openSlot = ref<number | null>(null)
const hoveredIngredient = ref<Ingredient | null>(null)

// 1100px matches the existing breakpoint where `.crafter-main` grows a 380px
// right column for the item preview. Above that, the picker takes over the
// column while open; below it, we fall back to the centered modal so the
// player can still see the grid above the sheet.
const isWide = useMediaQuery('(min-width: 1100px)')

function openPicker(index: number) {
  openSlot.value = index
  hoveredIngredient.value = null
}

function closePicker() {
  openSlot.value = null
  hoveredIngredient.value = null
}

function onPickerSelect(id: number | null) {
  if (openSlot.value == null)
    return
  store.setIngredient(openSlot.value, id)
  closePicker()
}

function onHoverIngredient(ing: Ingredient | null) {
  hoveredIngredient.value = ing
}

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
    const path = window.location.pathname
    if (path !== '/crafter' && !path.startsWith('/crafter/'))
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
      <div class="crafter-toolbar">
        <CrafterHashBar />
        <div v-if="!embedded" class="crafter-toolbar__actions">
          <NuxtLink to="/crafted" class="toolbar-browse">
            Browse crafted <span class="toolbar-browse-arrow" aria-hidden="true">→</span>
          </NuxtLink>
          <CrafterDuplicateMenu v-if="props.savedId && props.isOwner" />
          <CrafterSaveButton :saved-id="props.savedId" :is-owner="props.isOwner" :visibility="props.visibility" />
        </div>
      </div>
      <header class="crafter-bar">
        <CrafterRecipePanel :locked-type="lockedType" />
        <span class="crafter-bar__divider" aria-hidden="true" />
        <CrafterMaterialPanel />
      </header>
      <div class="crafter-main">
        <section class="crafter-ingredients" aria-label="Ingredients">
          <CrafterIngredientGrid
            :open-slot="openSlot"
            :hovered-ingredient="hoveredIngredient"
            @open="openPicker"
          />
          <CrafterMarketCost />
        </section>
        <aside
          class="crafter-output"
          :aria-label="isWide && openSlot !== null ? 'Choose ingredient' : 'Crafted item preview'"
        >
          <CrafterIngredientPicker
            v-if="isWide && openSlot !== null"
            :slot-index="openSlot"
            variant="rail"
            @select="onPickerSelect"
            @close="closePicker"
            @hover-ingredient="onHoverIngredient"
          />
          <CrafterItemPreview
            v-else
            :hide-equip-button="!onEquip"
            :on-equip="onEquip"
            :equip-disabled-reason="equipDisabledReason"
          />
        </aside>
      </div>
      <CrafterIngredientPicker
        v-if="!isWide && openSlot !== null"
        :slot-index="openSlot"
        variant="modal"
        @select="onPickerSelect"
        @close="closePicker"
        @hover-ingredient="onHoverIngredient"
      />
    </template>
  </main>
</template>

<style scoped>
.crafter {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 48px clamp(16px, 3vw, 40px) 80px;
  max-width: var(--shell-max);
  width: 100%;
  margin: 0 auto;
}

.crafter-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.crafter-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.toolbar-browse {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--color-faint);
  text-decoration: none;
  white-space: nowrap;
  align-self: center;
  transition: color 0.12s ease-out;
}

.toolbar-browse:hover {
  color: var(--color-muted);
}

.toolbar-browse-arrow {
  display: inline-block;
  transition: transform 0.15s ease-out;
}

.toolbar-browse:hover .toolbar-browse-arrow {
  transform: translateX(3px);
}

.toolbar-browse:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: 3px;
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
 * Top bar: thin divider, not a card. Recipe pickers and materials sit side-
 * by-side, separated by a vertical hairline. The bar wraps below 1100px.
 */
.crafter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 32px;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border);
  min-width: 0;
}

.crafter-bar__divider {
  width: 1px;
  height: 24px;
  background: var(--color-border);
  align-self: center;
}

/*
 * Main area: ingredients on the left, preview anchored top-right (380px).
 * `align-items: start` is what keeps the preview at the top of the viewport
 * — otherwise the ingredient column would stretch to the tooltip's height.
 */
.crafter-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 32px;
  align-items: start;
  min-width: 0;
}

.crafter-ingredients {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.crafter-output {
  min-width: 0;
}

@media (min-width: 1100px) {
  .crafter-main {
    grid-template-columns: minmax(0, 1fr) 380px;
  }

  .crafter-output {
    width: 380px;
  }
}

@media (max-width: 767px) {
  .crafter-bar {
    gap: 16px;
  }

  .crafter-bar__divider {
    display: none;
  }
}

@media (max-width: 720px) {
  .crafter {
    gap: 16px;
    padding: 20px 12px 48px;
  }

  /* Stack the toolbar so the share/import hash field gets the full width
     instead of being squeezed by the browse + save controls on its row. */
  .crafter-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .crafter-toolbar__actions {
    justify-content: space-between;
  }

  .crafter-main {
    gap: 18px;
  }

  .crafter-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
    padding: 10px 0 12px;
  }
}

/* Phones: break out of the page shell's gutter so the workspace runs edge to
   edge. The 12px side padding above keeps content off the screen edge. */
@media (max-width: 600px) {
  .crafter {
    width: calc(100% + 2 * var(--shell-pad-mobile));
    max-width: none;
    margin-inline: calc(-1 * var(--shell-pad-mobile));
  }
}
</style>
