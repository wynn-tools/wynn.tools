<script setup lang="ts">
import type { ApiItemSummary } from '~/composables/useApi'
import type { CleanedRawItem } from '~/lib/build/resolve'
import type { CraftedItem } from '~/lib/crafter/types'
import { useVirtualizer } from '@tanstack/vue-virtual'
import Fuse from 'fuse.js'
import {
  HoverCardContent,
  HoverCardPortal,
  HoverCardRoot,
  HoverCardTrigger,
} from 'reka-ui'
import { computed, onMounted, ref, watch } from 'vue'
import { useApi } from '~/composables/useApi'
import { itemIconUrl } from '~/lib/items/icon'
import { parseIdString } from '~/lib/wynntils/decode'
import { getIdKeys } from '~/lib/wynntils/id-keys'
import { resolveImport } from '~/lib/wynntils/import'
import { useAuthStore } from '~/stores/auth'
import { useBuildStore } from '~/stores/build'
import { useCraftStore } from '~/stores/craft'

const props = withDefaults(defineProps<{
  slotIndex: number
  initialTab?: 'items' | 'crafted' | 'saved'
}>(), {
  initialTab: 'items',
})
const emit = defineEmits<{
  select: [id: number | null]
  close: []
}>()

const store = useBuildStore()
const craftStore = useCraftStore()
const authStore = useAuthStore()
const api = useApi()
const query = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const tab = ref<'items' | 'crafted' | 'saved'>(props.initialTab)

const pasteError = ref<string | null>(null)

// Wynntils encodes items in supplementary Private-Use-Area codepoints
// (U+F0000..U+10FFFE). A pasted string starting in that range is a Wynntils
// item code, not a search query — sniff and route to the importer.
const PUA_START = 0xF0000
function isWynntilsCode(text: string): boolean {
  return (text.codePointAt(0) ?? 0) >= PUA_START
}

onMounted(() => searchInput.value?.focus())

// Cap only the ranked search results (already most-relevant first); the
// unfiltered browse list shows everything for the slot.
const MAX_RESULTS = 100

const items = computed<CleanedRawItem[]>(() => store.itemsForSlot(props.slotIndex))

const fuse = computed(() => new Fuse(items.value, {
  keys: ['displayName'],
  threshold: 0.4,
  ignoreLocation: true,
}))

const filteredItems = computed<CleanedRawItem[]>(() => {
  const q = query.value.trim()
  if (!q)
    return items.value
  return fuse.value.search(q, { limit: MAX_RESULTS }).map(r => r.item)
})

function selectItem(id: number | null) {
  emit('select', id)
}

// Virtualize the items list. Row 0 is the "None" entry; rows 1..N map to
// filteredItems. Dynamic measurement (`measureElement`) handles the mobile
// row-size bump without per-breakpoint config.
const itemsScrollEl = ref<HTMLDivElement | null>(null)
const itemRows = computed(() => filteredItems.value.length + 1)
const itemsVirtualizer = useVirtualizer(
  computed(() => ({
    count: itemRows.value,
    getScrollElement: () => itemsScrollEl.value,
    estimateSize: () => 36,
    overscan: 8,
  })),
)

watch(filteredItems, () => {
  itemsScrollEl.value?.scrollTo({ top: 0 })
})

// ----- Crafted tab -----

// Map a build slot to the recipe types that can validly fill it. Mirrors the
// SLOT_TYPES list in build.ts but lowercased to match Recipe.type.
const ALLOWED_RECIPE_TYPES: Readonly<Record<number, ReadonlyArray<string>>> = {
  0: ['helmet'],
  1: ['chestplate'],
  2: ['leggings'],
  3: ['boots'],
  4: ['ring'],
  5: ['ring'],
  6: ['bracelet'],
  7: ['necklace'],
  8: ['spear', 'wand', 'dagger', 'bow', 'relik'],
}

const SLOT_LABEL: Readonly<Record<number, string>> = {
  0: 'helmet',
  1: 'chestplate',
  2: 'leggings',
  3: 'boots',
  4: 'ring',
  5: 'ring',
  6: 'bracelet',
  7: 'necklace',
  8: 'weapon',
}

async function onSearchPaste(ev: ClipboardEvent) {
  const text = (ev.clipboardData?.getData('text') ?? '').trim()
  if (!text || !isWynntilsCode(text))
    return // not a Wynntils code — fall through to default paste/search
  ev.preventDefault()
  pasteError.value = null
  if (!store.ctx)
    return

  let blocks
  try {
    blocks = parseIdString(text)
  }
  catch {
    pasteError.value = 'Invalid Wynntils item code.'
    return
  }

  let idKeys
  try {
    idKeys = await getIdKeys()
  }
  catch {
    pasteError.value = 'Wynntils ID list unavailable, try again later.'
    return
  }

  const result = resolveImport(blocks, store.ctx, idKeys, new Set())
  if (!result.ok) {
    pasteError.value = result.error.message
    return
  }

  const expected = SLOT_LABEL[props.slotIndex]
  const actual = SLOT_LABEL[result.row.slot]
  const ringPair = (props.slotIndex === 4 && result.row.slot === 5) || (props.slotIndex === 5 && result.row.slot === 4)
  if (props.slotIndex !== result.row.slot && !ringPair) {
    pasteError.value = `Pasted item is a ${actual}, this slot expects ${expected}.`
    return
  }

  store.applyImport([{ ...result.row, slot: props.slotIndex }])
  emit('close')
}

// Clear any lingering paste error once the user starts typing a search query.
watch(query, () => {
  if (pasteError.value)
    pasteError.value = null
})

// Single allowed type for non-weapon slots; null for weapon slot (multiple types).
const lockedRecipeType = computed<string | null>(() => {
  const allowed = ALLOWED_RECIPE_TYPES[props.slotIndex] ?? []
  return allowed.length === 1 ? (allowed[0] ?? null) : null
})

const equipDisabledReason = computed<string | null>(() => {
  const rec = craftStore.recipe
  if (!rec)
    return 'Pick a recipe to enable equip.'
  const allowed = ALLOWED_RECIPE_TYPES[props.slotIndex] ?? []
  if (!allowed.includes(rec.type))
    return `This slot accepts ${SLOT_LABEL[props.slotIndex]}; selected recipe is ${rec.type}.`
  return null
})

function handleEquipCraft() {
  if (equipDisabledReason.value)
    return
  if (!craftStore.recipe || !craftStore.ctx)
    return
  // Snapshot the raw object so later edits inside the crafter store don't
  // mutate the build (RawCraft contains arrays we'd otherwise share).
  const snapshot = JSON.parse(JSON.stringify(craftStore.raw))
  store.setCraftedSlot(props.slotIndex, snapshot, craftStore.isWeapon)
  emit('close')
}

// ----- Saved tab -----

const { resolve: resolveCraft } = useCraftedItemPreview()

const savedItems = ref<ApiItemSummary[]>([])
const savedNextCursor = ref<string | null>(null)
const savedLoading = ref(false)
const savedLoaded = ref(false)
const savedError = ref<string | null>(null)
const savedMismatch = ref<string | null>(null)
const savedCraftedCache = new Map<string, CraftedItem>()
const savedHoverCrafted = ref<CraftedItem | null>(null)

async function loadSaved(cursor?: string) {
  if (savedLoading.value)
    return
  savedLoading.value = true
  savedError.value = null
  try {
    const res = await api.listMyItems(undefined, cursor, 20)
    savedItems.value = cursor ? [...savedItems.value, ...res.data] : res.data
    savedNextCursor.value = res.nextCursor
    savedLoaded.value = true
  }
  catch (e: unknown) {
    savedError.value = e instanceof Error ? e.message : 'Failed to load items'
  }
  finally {
    savedLoading.value = false
  }
}

watch(tab, (t) => {
  if (t === 'saved' && !savedLoaded.value && authStore.user)
    loadSaved()
})

async function onSavedHoverOpen(open: boolean, craftHash: string | null | undefined) {
  if (!open || !craftHash)
    return
  if (savedCraftedCache.has(craftHash)) {
    savedHoverCrafted.value = savedCraftedCache.get(craftHash)!
    return
  }
  try {
    const resolved = await resolveCraft(craftHash)
    if (resolved) {
      savedCraftedCache.set(craftHash, resolved.crafted)
      savedHoverCrafted.value = resolved.crafted
    }
  }
  catch {
    // suppress — tooltip just won't show
  }
}

async function selectSavedItem(item: ApiItemSummary) {
  if (!item.craftHash)
    return
  savedMismatch.value = null
  try {
    const resolved = await resolveCraft(item.craftHash)
    if (!resolved)
      return
    const allowed = ALLOWED_RECIPE_TYPES[props.slotIndex] ?? []
    if (!allowed.includes(resolved.crafted.type)) {
      savedMismatch.value = `"${item.name}" is a ${resolved.crafted.type} — this slot accepts ${SLOT_LABEL[props.slotIndex]}`
      return
    }
    const isWeapon = resolved.crafted.category === 'weapon'
    store.setCraftedSlot(props.slotIndex, resolved.raw, isWeapon)
    emit('close')
  }
  catch {
    savedMismatch.value = 'Failed to load item'
  }
}
</script>

<template>
  <div class="picker" :class="{ 'picker--wide': tab === 'crafted' }">
    <div class="picker-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        :aria-selected="tab === 'items'"
        class="picker-tab"
        :class="{ 'picker-tab--active': tab === 'items' }"
        @click="tab = 'items'"
      >
        Items
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="tab === 'crafted'"
        class="picker-tab"
        :class="{ 'picker-tab--active': tab === 'crafted' }"
        @click="tab = 'crafted'"
      >
        Crafted
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="tab === 'saved'"
        class="picker-tab"
        :class="{ 'picker-tab--active': tab === 'saved' }"
        @click="tab = 'saved'; if (!savedLoaded && authStore.user) loadSaved()"
      >
        Saved
      </button>
      <button class="picker-close" aria-label="Close" @click="emit('close')">
        ✕
      </button>
    </div>

    <template v-if="tab === 'items'">
      <div class="picker-header">
        <input
          ref="searchInput"
          v-model="query"
          class="picker-search"
          type="text"
          placeholder="Search items, or paste a Wynntils item code…"
          spellcheck="false"
          autocomplete="off"
          @paste="onSearchPaste"
        >
        <p v-if="pasteError" class="paste-error" role="alert">
          {{ pasteError }}
        </p>
      </div>
      <div ref="itemsScrollEl" class="picker-list picker-list--virtual">
        <div
          class="picker-list-inner"
          :style="{ height: `${itemsVirtualizer.getTotalSize()}px` }"
        >
          <div
            v-for="vRow in itemsVirtualizer.getVirtualItems()"
            :key="vRow.key"
            :ref="el => itemsVirtualizer.measureElement(el as Element | null)"
            :data-index="vRow.index"
            class="picker-row"
            :style="{ transform: `translateY(${vRow.start}px)` }"
          >
            <div
              v-if="vRow.index === 0"
              class="picker-item picker-item--none"
              @click="selectItem(null)"
            >
              None
            </div>
            <div
              v-else
              class="picker-item"
              @click="selectItem(filteredItems[vRow.index - 1]!.id as number)"
            >
              <img
                v-if="itemIconUrl(filteredItems[vRow.index - 1]!)"
                :src="itemIconUrl(filteredItems[vRow.index - 1]!)!"
                class="picker-icon"
                loading="lazy"
                draggable="false"
                aria-hidden="true"
                alt=""
              >
              <span v-else class="picker-icon picker-icon--empty" aria-hidden="true" />
              <span class="picker-item-name">{{ filteredItems[vRow.index - 1]!.displayName }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else-if="tab === 'crafted'" class="picker-crafted-host" @click.stop>
      <CrafterWorkspace
        :embedded="true"
        :on-equip="handleEquipCraft"
        :equip-disabled-reason="equipDisabledReason"
        :locked-type="lockedRecipeType"
      />
    </div>

    <template v-else-if="tab === 'saved'">
      <div v-if="authStore.pending" class="saved-state">
        Loading…
      </div>
      <div v-else-if="!authStore.user" class="saved-unauthenticated">
        <p class="saved-auth-msg">
          Sign in to access your saved crafted items.
        </p>
        <button class="saved-signin-btn" type="button" @click="authStore.login()">
          Sign in with Discord
        </button>
      </div>
      <template v-else>
        <div v-if="savedLoading && savedItems.length === 0" class="saved-state">
          Loading…
        </div>
        <p v-else-if="savedError" class="saved-state saved-state--error">
          {{ savedError }}
        </p>
        <div v-else-if="savedItems.length === 0" class="saved-state">
          No saved crafted items.
        </div>
        <ul v-else class="picker-list">
          <HoverCardRoot
            v-for="item in savedItems"
            :key="item.id"
            :open-delay="120"
            :close-delay="0"
            @update:open="open => onSavedHoverOpen(open, item.craftHash)"
          >
            <HoverCardTrigger as-child>
              <li class="picker-item" @click="selectSavedItem(item)">
                <span class="picker-item-name">{{ item.name }}</span>
                <span class="picker-item-version">{{ item.gameVersion }}</span>
              </li>
            </HoverCardTrigger>
            <HoverCardPortal v-if="item.craftHash">
              <HoverCardContent :side-offset="8" side="right" align="start" class="saved-quickview">
                <div class="saved-quickview-scale">
                  <CrafterItemPreview
                    v-if="savedCraftedCache.get(item.craftHash)"
                    :crafted="savedCraftedCache.get(item.craftHash)!"
                    hide-equip-button
                  />
                  <div v-else class="saved-tooltip-loading">
                    Loading…
                  </div>
                </div>
              </HoverCardContent>
            </HoverCardPortal>
          </HoverCardRoot>
        </ul>
        <div v-if="savedNextCursor" class="saved-loadmore">
          <button type="button" :disabled="savedLoading" class="saved-loadmore-btn" @click="loadSaved(savedNextCursor ?? undefined)">
            {{ savedLoading ? 'Loading…' : 'Load more' }}
          </button>
        </div>
        <p v-if="savedMismatch" class="saved-mismatch">
          {{ savedMismatch }}
        </p>
      </template>
    </template>
  </div>
</template>

<style scoped>
.picker {
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  width: 320px;
  max-height: 440px;
  overflow: hidden;
}

/* Crafted tab needs much more room — let the picker expand to fit the
   embedded crafter workspace. Constrained against the viewport so the modal
   stays scrollable on small screens. */
.picker--wide {
  width: min(1200px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
}

/* Phone: full-width bottom sheet, ~85vh, rounded only on top.
   Matches DESIGN.md floating-panel bottom-sheet convention. */
@media (max-width: 720px) {
  .picker,
  .picker--wide {
    width: 100%;
    max-height: 88vh;
    border-radius: 14px 14px 0 0;
    border-bottom: none;
    box-shadow: 0 -8px 32px oklch(0% 0 0 / 0.45);
    animation: picker-rise 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .picker-tabs {
    padding: 8px 10px;
  }
  .picker-tab {
    padding: 6px 12px;
    font-size: 12px;
  }
  .picker-header {
    padding: 10px 14px;
  }
  .picker-search {
    font-size: 14px;
  }
  .picker-close {
    font-size: 18px;
    padding: 6px 10px;
    margin-left: 6px;
  }
  .picker-item {
    padding: 10px 14px;
    font-size: 13px;
    min-height: 44px;
  }
  .picker-icon {
    width: 28px;
    height: 28px;
  }
}

@keyframes picker-rise {
  from {
    transform: translateY(20px);
    opacity: 0.6;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .picker,
  .picker--wide {
    animation: none;
  }
}

.picker-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--color-border);
}

.picker-tab {
  background: none;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 4px 10px;
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-muted);
  cursor: pointer;
  transition:
    color 0.1s,
    border-color 0.1s,
    background 0.1s;
}

.picker-tab:hover {
  color: var(--color-text);
}

.picker-tab--active {
  color: var(--color-text);
  border-color: var(--color-border);
  background: var(--color-surface, transparent);
}

.picker-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border);
}

.picker-search {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 13px;
  color: var(--color-text);
  caret-color: var(--color-copper);
}

.picker-search::placeholder {
  color: var(--color-faint);
}

.picker-close {
  margin-left: auto;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
  color: var(--color-muted);
  line-height: 1;
  padding: 2px 6px;
  border-radius: 3px;
  transition: color 0.1s;
}

.picker-close:hover {
  color: var(--color-text);
}

.picker-list {
  list-style: none;
  overflow-y: auto;
  flex: 1;
}

.picker-list--virtual {
  position: relative;
}

.picker-list-inner {
  position: relative;
  width: 100%;
}

.picker-row {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}

.picker-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 12px;
  padding: 8px 14px;
  color: var(--color-muted);
  cursor: pointer;
  transition:
    background 0.08s,
    color 0.08s;
}

.picker-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  image-rendering: pixelated;
  object-fit: contain;
}

.picker-icon--empty {
  visibility: hidden;
}

.picker-item-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.picker-item-version {
  font-size: 10px;
  color: var(--color-faint);
  flex-shrink: 0;
}

.picker-item:hover {
  background: var(--color-border);
  color: var(--color-text);
}

.picker-item--none {
  color: var(--color-faint);
  border-bottom: 1px solid var(--color-border);
  font-style: italic;
}

.picker-item--none:hover {
  color: var(--color-muted);
}

.picker-crafted-host {
  flex: 1;
  overflow: auto;
}

/* Saved tab */
.saved-state {
  padding: 24px 16px;
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 12px;
  color: var(--color-muted);
  text-align: center;
}

.saved-state--error {
  color: oklch(62% 0.15 20);
}

.saved-unauthenticated {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 28px 20px;
}

.saved-auth-msg {
  font-size: 13px;
  color: var(--color-muted);
  text-align: center;
}

.saved-signin-btn {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 6px 14px;
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-muted);
  cursor: pointer;
  transition:
    color 0.1s,
    border-color 0.1s;
}

.saved-signin-btn:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.saved-loadmore {
  display: flex;
  justify-content: center;
  padding: 8px;
  border-top: 1px solid var(--color-border);
}

.saved-loadmore-btn {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-faint);
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.1s;
}

.saved-loadmore-btn:not(:disabled):hover {
  color: var(--color-muted);
}

.saved-loadmore-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.saved-mismatch {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 11px;
  color: var(--color-accent);
  padding: 8px 14px;
  border-top: 1px solid var(--color-border);
}

.saved-quickview {
  z-index: 60;
}

.saved-quickview-scale {
  zoom: 0.7;
}

.saved-tooltip-loading {
  font-size: 12px;
  color: var(--color-muted);
  padding: 16px;
}

.paste-error {
  color: oklch(62% 0.15 20);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.02em;
  margin: 6px 0 0;
}
</style>
