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
      <div class="crafter-toolbar">
        <CrafterHashBar />
        <NuxtLink v-if="!embedded" to="/crafted" class="toolbar-browse">
          Browse crafted <span class="toolbar-browse-arrow" aria-hidden="true">→</span>
        </NuxtLink>
        <CrafterSaveButton v-if="!embedded" :saved-id="props.savedId" :is-owner="props.isOwner" :visibility="props.visibility" />
      </div>
      <header class="crafter-bar">
        <CrafterRecipePanel :locked-type="lockedType" />
        <span class="crafter-bar__divider" aria-hidden="true" />
        <CrafterMaterialPanel />
      </header>
      <div class="crafter-main">
        <section class="crafter-ingredients" aria-label="Ingredients">
          <CrafterIngredientGrid />
        </section>
        <aside class="crafter-output" aria-label="Crafted item preview">
          <CrafterItemPreview
            :hide-equip-button="!onEquip"
            :on-equip="onEquip"
            :equip-disabled-reason="equipDisabledReason"
          />
        </aside>
      </div>
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
</style>
