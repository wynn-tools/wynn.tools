<script setup lang="ts">
import type { CraftedItem } from '~/lib/crafter/types'
import {
  HoverCardContent,
  HoverCardPortal,
  HoverCardRoot,
  HoverCardTrigger,
} from 'reka-ui'
import { computed } from 'vue'
import { useCdnClient } from '~/composables/useBuildData'
import { slotItemId } from '~/lib/codec/build-codec'
import { computeCraft } from '~/lib/crafter/compute-craft'
import { POWDER_NAME_BY_ID } from '~/lib/data/powder-constants'
import { itemIconUrl } from '~/lib/items/icon'
import { useBuildStore } from '~/stores/build'
import { useCraftStore } from '~/stores/craft'

const store = useBuildStore()
const craftStore = useCraftStore()

function slotIcon(slot: number): string | null {
  const id = slotItemId(store.rawBuild?.equipment[slot])
  if (id == null)
    return null
  return itemIconUrl(store.ctx?.rawItemIndex.resolveId(id))
}

// Full names — used for accessibility labels and PowderInput
const SLOT_LABELS = [
  'Helmet',
  'Chestplate',
  'Leggings',
  'Boots',
  'Ring 1',
  'Ring 2',
  'Bracelet',
  'Necklace',
  'Weapon',
] as const

// Compact display labels for the slot cards
const SLOT_DISPLAY = ['Helm', 'Chest', 'Legs', 'Boots', 'Ring', 'Ring', 'Brace', 'Neck', 'Wpn'] as const

// CSS grid-area names — see .equipment-grid template-areas below
const SLOT_AREAS = ['helmet', 'chest', 'legs', 'boots', 'ring1', 'ring2', 'bracelet', 'necklace', 'weapon'] as const

const POWDER_GLYPH: Record<string, string> = {
  e: '✤',
  t: '✦',
  w: '❉',
  f: '✹',
  a: '❋',
}
const POWDER_COLOR: Record<string, string> = {
  e: 'oklch(72% 0.18 145)',
  t: 'oklch(82% 0.15 95)',
  w: 'oklch(75% 0.13 215)',
  f: 'oklch(68% 0.18 35)',
  a: 'oklch(85% 0.04 250)',
}

const openSlot = ref<number | null>(null)
const openSlotInitialTab = ref<'items' | 'crafted'>('items')
const powderSlot = ref<number | null>(null)

function itemName(slot: number): string {
  const entry = store.rawBuild?.equipment[slot]
  if (entry?.kind === 'crafted')
    return 'Crafted'
  const id = slotItemId(entry)
  if (id == null)
    return 'Empty'
  const item = store.ctx?.rawItemIndex.resolveId(id)
  if (!item)
    return 'Empty'
  const name = item.displayName as string | undefined
  return !name || (item.id as number) >= 10000 ? 'Empty' : name
}

function slotCrafted(slot: number): CraftedItem | null {
  const entry = store.rawBuild?.equipment[slot]
  if (entry?.kind !== 'crafted')
    return null
  const craftCtx = store.ctx?.craftContext
  if (!craftCtx || !craftCtx.recipes.has(entry.raw.recipeId))
    return null
  try {
    return computeCraft(entry.raw, craftCtx)
  }
  catch {
    return null
  }
}

async function openPicker(slot: number) {
  const entry = store.rawBuild?.equipment[slot]
  if (entry?.kind === 'crafted') {
    await craftStore.prefillFromRaw(entry.raw, useCdnClient())
    openSlotInitialTab.value = 'crafted'
  }
  else {
    openSlotInitialTab.value = 'items'
  }
  openSlot.value = slot
}

function handleSelect(id: number | null) {
  if (openSlot.value !== null) {
    store.setItem(openSlot.value, id)
    openSlot.value = null
  }
}

function handleClose() {
  openSlot.value = null
}

function openPowders(slot: number, e: Event) {
  e.stopPropagation()
  powderSlot.value = slot
}

function powdersFor(slot: number): number[] {
  return store.powdersForEquipmentSlot(slot)
}

function maxPowders(slot: number): number {
  return store.maxPowderSlots(slot)
}

function slotSearchItem(slot: number) {
  return store.equipmentSearchItem(slot)
}

function onPowderUpdate(ids: number[]) {
  if (powderSlot.value !== null)
    store.setPowders(powderSlot.value, ids)
}

const powderSlotLabel = computed(() =>
  powderSlot.value !== null ? SLOT_LABELS[powderSlot.value] : '',
)
const powderSlotValue = computed(() =>
  powderSlot.value !== null ? powdersFor(powderSlot.value) : [],
)
const powderSlotMax = computed(() =>
  powderSlot.value !== null ? maxPowders(powderSlot.value) : 0,
)
</script>

<template>
  <div class="equipment-grid-wrapper">
    <div class="equipment-grid">
      <template v-for="(label, idx) in SLOT_LABELS" :key="idx">
        <HoverCardRoot v-if="slotSearchItem(idx) || slotCrafted(idx)" :open-delay="300" :close-delay="0">
          <HoverCardTrigger as-child>
            <div
              class="slot"
              :class="{ 'slot--active': openSlot === idx }"
              :style="{ gridArea: SLOT_AREAS[idx] }"
              @click="openPicker(idx)"
            >
              <img
                v-if="slotIcon(idx)"
                :src="slotIcon(idx)!"
                class="slot-icon"
                loading="lazy"
                draggable="false"
                aria-hidden="true"
                alt=""
              >
              <div class="slot-body">
                <div class="slot-head">
                  <span class="slot-label">{{ SLOT_DISPLAY[idx] }}</span>
                  <span class="slot-name" :class="{ 'slot-name--empty': itemName(idx) === 'Empty' }">
                    {{ itemName(idx) }}
                  </span>
                </div>
                <button
                  v-if="maxPowders(idx) > 0"
                  class="powder-chips"
                  :class="{ 'powder-chips--empty': powdersFor(idx).length === 0 }"
                  type="button"
                  :aria-label="`Powders for ${label}`"
                  @click="openPowders(idx, $event)"
                >
                  <template v-if="powdersFor(idx).length === 0">
                    <span class="powder-cta-plus" aria-hidden="true">+</span>
                    <span class="powder-cta-label">Powders</span>
                  </template>
                  <template v-else>
                    <span
                      v-for="(pid, i) in powdersFor(idx)"
                      :key="i"
                      class="powder-chip"
                      :style="{ color: POWDER_COLOR[POWDER_NAME_BY_ID.get(pid)?.[0] ?? ''] }"
                    >
                      <span class="powder-glyph">{{ POWDER_GLYPH[POWDER_NAME_BY_ID.get(pid)?.[0] ?? ''] }}</span><span class="powder-tier">{{ POWDER_NAME_BY_ID.get(pid)?.slice(1) }}</span>
                    </span>
                    <span
                      v-for="i in Math.max(0, maxPowders(idx) - powdersFor(idx).length)"
                      :key="`e-${i}`"
                      class="powder-pip"
                      aria-hidden="true"
                    />
                  </template>
                </button>
              </div>
            </div>
          </HoverCardTrigger>
          <HoverCardPortal>
            <HoverCardContent side="right" align="start" :side-offset="8" :avoid-collisions="false" class="quickview">
              <div class="quickview-scale">
                <ItemTooltip v-if="slotSearchItem(idx)" :item="slotSearchItem(idx)!" />
                <CrafterItemPreview
                  v-else
                  :crafted="slotCrafted(idx)"
                  hide-equip-button
                />
              </div>
            </HoverCardContent>
          </HoverCardPortal>
        </HoverCardRoot>

        <div
          v-else
          class="slot"
          :class="{ 'slot--active': openSlot === idx }"
          :style="{ gridArea: SLOT_AREAS[idx] }"
          @click="openPicker(idx)"
        >
          <img
            v-if="slotIcon(idx)"
            :src="slotIcon(idx)!"
            class="slot-icon"
            loading="lazy"
            draggable="false"
            aria-hidden="true"
            alt=""
          >
          <div class="slot-body">
            <div class="slot-head">
              <span class="slot-label">{{ SLOT_DISPLAY[idx] }}</span>
              <span class="slot-name" :class="{ 'slot-name--empty': itemName(idx) === 'Empty' }">
                {{ itemName(idx) }}
              </span>
            </div>
            <button
              v-if="maxPowders(idx) > 0"
              class="powder-chips"
              :class="{ 'powder-chips--empty': powdersFor(idx).length === 0 }"
              type="button"
              :aria-label="`Powders for ${label}`"
              @click="openPowders(idx, $event)"
            >
              <template v-if="powdersFor(idx).length === 0">
                <span class="powder-cta-plus" aria-hidden="true">+</span>
                <span class="powder-cta-label">Powders</span>
              </template>
              <template v-else>
                <span
                  v-for="(pid, i) in powdersFor(idx)"
                  :key="i"
                  class="powder-chip"
                  :style="{ color: POWDER_COLOR[POWDER_NAME_BY_ID.get(pid)?.[0] ?? ''] }"
                >
                  <span class="powder-glyph">{{ POWDER_GLYPH[POWDER_NAME_BY_ID.get(pid)?.[0] ?? ''] }}</span><span class="powder-tier">{{ POWDER_NAME_BY_ID.get(pid)?.slice(1) }}</span>
                </span>
                <span
                  v-for="i in Math.max(0, maxPowders(idx) - powdersFor(idx).length)"
                  :key="`e-${i}`"
                  class="powder-pip"
                  aria-hidden="true"
                />
              </template>
            </button>
          </div>
        </div>
      </template>
    </div>

    <div v-if="openSlot !== null" class="picker-overlay" @click.self="handleClose">
      <ItemPicker
        :slot-index="openSlot"
        :initial-tab="openSlotInitialTab"
        @select="handleSelect"
        @close="handleClose"
      />
    </div>

    <PowderInput
      v-if="powderSlot !== null"
      :slot-label="powderSlotLabel"
      :max-slots="powderSlotMax"
      :value="powderSlotValue"
      @update="onPowderUpdate"
      @close="powderSlot = null"
    />
  </div>
</template>

<style scoped>
.equipment-grid-wrapper {
  position: relative;
}

/* 2-column paired layout:
   Left:  Helmet / Chest / Legs / Boots
   Right: Ring1 / Ring2 / Bracelet / Necklace
   Full:  Weapon */
.equipment-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-areas:
    'helmet   ring1'
    'chest    ring2'
    'legs     bracelet'
    'boots    necklace'
    'weapon   weapon';
  gap: 4px;
}

.slot {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 9px;
  min-height: 34px;
  /* Grid items default to min-width:auto, which a nowrap name resists shrinking
     below — pinning it to 0 lets long names ellipsis instead of forcing overflow. */
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  cursor: pointer;
  transition:
    border-color 0.12s,
    background 0.12s;
}

/* Item name on its own line, powders stacked beneath — long names never
   collide with the powder chips. */
.slot-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.slot-head {
  display: flex;
  align-items: baseline;
  gap: 7px;
  min-width: 0;
}

.slot:hover {
  border-color: var(--color-muted);
  background: var(--color-surface);
}

.slot--active {
  border-color: var(--color-copper);
}

.slot-icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  image-rendering: pixelated;
  object-fit: contain;
}

.slot-label {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-faint);
  flex-shrink: 0;
  min-width: 28px;
}

.slot--active .slot-label {
  color: var(--color-copper);
}

.slot-name {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 11px;
  color: var(--color-text);
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slot-name--empty {
  color: var(--color-faint);
  font-style: italic;
}

.powder-chips {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 1px 5px 1px 3px;
  margin-left: -3px;
  cursor: pointer;
  max-width: 100%;
  transition:
    border-color 0.12s,
    background 0.12s,
    color 0.12s;
}
.powder-chips:hover {
  border-color: var(--color-border);
  background: oklch(14% 0.006 30 / 0.6);
}

.powder-chip {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 9px;
  display: inline-flex;
  align-items: baseline;
  gap: 1px;
  letter-spacing: 0;
}
.powder-glyph {
  font-size: 8px;
}
.powder-tier {
  font-weight: 600;
}

.powder-pip {
  display: inline-block;
  width: 8px;
  height: 8px;
  border: 1px dashed var(--color-border);
  border-radius: 2px;
  transition: border-color 0.12s;
}
.slot:hover .powder-pip {
  border-color: var(--color-muted);
}
.powder-chips:hover .powder-pip {
  border-color: oklch(65% 0.15 48 / 0.5);
  border-style: solid;
}

.powder-chips--empty {
  border-color: var(--color-border);
  color: var(--color-faint);
}
.powder-chips--empty:hover {
  border-color: var(--color-copper);
  background: oklch(65% 0.15 48 / 0.06);
  color: var(--color-copper);
}
.powder-cta-plus {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  color: inherit;
}
.powder-cta-label {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: inherit;
}

.picker-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: oklch(14% 0.006 30 / 0.7);
  backdrop-filter: blur(2px);
}

@media (max-width: 720px) {
  .picker-overlay {
    align-items: flex-end;
    justify-content: stretch;
  }
}

.quickview {
  z-index: 9999;
}

@media (hover: none), (pointer: coarse) {
  .quickview {
    display: none !important;
  }
}

.quickview-scale {
  zoom: 0.7;
}
</style>
