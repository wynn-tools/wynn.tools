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

// Compute the CraftedItem for a slot holding a RawCraft. Returns null when
// the slot isn't crafted, the craft context isn't loaded yet, or the recipe
// id is unknown to the current snapshot.
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
  // Crafted slot: prefill the crafter with the slot's RawCraft and open the
  // picker on the Crafted tab so the user lands directly on an editable
  // version of the existing item.
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
              :class="{ 'slot--active': openSlot === idx, 'slot--powderable': maxPowders(idx) > 0 }"
              @click="openPicker(idx)"
            >
              <div class="slot-top">
                <span class="slot-label">{{ label }}</span>
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
                    <span class="powder-cta-label">0/{{ maxPowders(idx) }} Powders</span>
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
              <div class="slot-body">
                <img
                  v-if="slotIcon(idx)"
                  :src="slotIcon(idx)!"
                  class="slot-icon"
                  loading="lazy"
                  draggable="false"
                  aria-hidden="true"
                  alt=""
                >
                <span class="slot-name" :class="{ 'slot-name--empty': itemName(idx) === 'Empty' }">
                  {{ itemName(idx) }}
                </span>
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
          :class="{ 'slot--active': openSlot === idx, 'slot--powderable': maxPowders(idx) > 0 }"
          @click="openPicker(idx)"
        >
          <div class="slot-top">
            <span class="slot-label">{{ label }}</span>
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
                <span class="powder-cta-label">0/{{ maxPowders(idx) }} Powders</span>
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
          <div class="slot-body">
            <img
              v-if="slotIcon(idx)"
              :src="slotIcon(idx)!"
              class="slot-icon"
              loading="lazy"
              draggable="false"
              aria-hidden="true"
              alt=""
            >
            <span class="slot-name" :class="{ 'slot-name--empty': itemName(idx) === 'Empty' }">
              {{ itemName(idx) }}
            </span>
          </div>
        </div>
      </template>
    </div>

    <!-- Inline picker panel (no dialog dependency, robust) -->
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

.equipment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 8px;
}

@media (max-width: 720px) {
  .equipment-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
  }
  .slot {
    padding: 8px 10px;
    gap: 4px;
  }
  .slot-name {
    font-size: 11px;
  }
  .slot-icon {
    width: 20px;
    height: 20px;
  }
  .powder-cta-label {
    display: none;
  }
  .powder-chips--empty {
    padding: 2px 5px;
  }
}

.slot {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  transition:
    border-color 0.12s,
    background 0.12s;
}

.slot:hover {
  border-color: var(--color-muted);
  background: oklch(19% 0.008 30);
}

.slot--active {
  border-color: var(--color-copper);
}

.slot-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 16px;
}

.slot-label {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--color-faint);
}

.slot--active .slot-label {
  color: var(--color-copper);
}

.powder-chips {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 1px 4px;
  cursor: pointer;
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
  font-size: 10px;
  display: inline-flex;
  align-items: baseline;
  gap: 1px;
  letter-spacing: 0;
}
.powder-glyph {
  font-size: 9px;
}
.powder-tier {
  font-weight: 600;
}

/* Outlined placeholder for partially filled slot — reads as an empty container */
.powder-pip {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 1px dashed var(--color-border);
  border-radius: 2px;
  transition:
    border-color 0.12s,
    background 0.12s;
}
.slot:hover .powder-pip {
  border-color: var(--color-muted);
}
.powder-chips:hover .powder-pip {
  border-color: oklch(65% 0.15 48 / 0.5);
  border-style: solid;
}

/* Empty-state CTA pill: "+ 0/N Powders" — explicit affordance */
.powder-chips--empty {
  gap: 5px;
  padding: 2px 7px 2px 6px;
  border-color: var(--color-border);
  color: var(--color-muted);
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

.slot-body {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.slot-icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  image-rendering: pixelated;
  object-fit: contain;
}

.slot-name {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 12px;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slot-name--empty {
  color: var(--color-faint);
  font-style: italic;
}

/* Overlay backdrop */
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

/* Phone: slide picker up from the bottom as a sheet — native mobile pattern,
   easier reach, matches the floating-panel convention in the design system. */
@media (max-width: 720px) {
  .picker-overlay {
    align-items: flex-end;
    justify-content: stretch;
  }
}

.quickview {
  z-index: 9999;
}

/* Hover quickview is a desktop affordance — hide on coarse/touch pointers
   so a tap doesn't fire a stuck hover card behind the picker. */
@media (hover: none), (pointer: coarse) {
  .quickview {
    display: none !important;
  }
}

.quickview-scale {
  zoom: 0.7;
}
</style>
