<script setup lang="ts">
import type { CraftedItem } from '~/lib/crafter/types'
import type { RawMarketPrice } from '~/lib/market/types'
import {
  HoverCardContent,
  HoverCardPortal,
  HoverCardRoot,
  HoverCardTrigger,
} from 'reka-ui'
import { computed, ref, watch } from 'vue'
import { useCdnClient } from '~/composables/useBuildData'
import { useMarket } from '~/composables/useMarket'
import { SLOT_LABELS } from '~/lib/build/slot-labels'
import { slotItemId } from '~/lib/codec/build-codec'
import { computeCraft } from '~/lib/crafter/compute-craft'
import { POWDER_NAME_BY_ID } from '~/lib/data/powder-constants'
import { powderElementMeta } from '~/lib/data/powder-elements'
import { itemIconUrl } from '~/lib/items/icon'
import { formatEmeralds } from '~/lib/market/format-emeralds'
import { pickIdHeadline } from '~/lib/market/summarize'
import { useBuildStore } from '~/stores/build'
import { useCraftStore } from '~/stores/craft'

const store = useBuildStore()
const craftStore = useCraftStore()
const market = useMarket()
const slotPrices = ref<Map<number, RawMarketPrice | null>>(new Map())

// Fetch a headline price per occupied, non-crafted gear slot.
let priceGen = 0
async function refreshPrices() {
  const gen = ++priceGen
  const names: { slot: number, name: string }[] = []
  for (let slot = 0; slot <= 8; slot++) {
    const entry = store.rawBuild?.equipment[slot]
    if (entry?.kind === 'crafted')
      continue
    const id = slotItemId(entry)
    if (id == null || id >= 10000)
      continue
    const item = store.ctx?.rawItemIndex.resolveId(id)
    const name = item?.name as string | undefined
    if (name)
      names.push({ slot, name })
  }
  if (names.length === 0) {
    slotPrices.value = new Map()
    return
  }
  try {
    const results = await market.prices(names.map(n => ({ name: n.name })))
    if (gen !== priceGen)
      return
    const map = new Map<number, RawMarketPrice | null>()
    names.forEach((n, idx) => map.set(n.slot, results[idx] ?? null))
    slotPrices.value = map
  }
  catch {
    if (gen === priceGen)
      slotPrices.value = new Map()
  }
}

watch(() => store.rawBuild?.equipment, refreshPrices, { immediate: true, deep: true })

function slotPrice(slot: number): string | null {
  const p = slotPrices.value.get(slot)
  if (!p)
    return null
  const h = pickIdHeadline(p)
  return h == null ? null : formatEmeralds(h)
}

function slotIcon(slot: number): string | null {
  const id = slotItemId(store.rawBuild?.equipment[slot])
  if (id == null)
    return null
  return itemIconUrl(store.ctx?.rawItemIndex.resolveId(id))
}

// CSS grid-area names — see .equipment-grid template-areas below
const SLOT_AREAS = ['helmet', 'chest', 'legs', 'boots', 'ring1', 'ring2', 'bracelet', 'necklace', 'weapon'] as const

function pmeta(pid: number) {
  return powderElementMeta(POWDER_NAME_BY_ID.get(pid))
}
function ptier(pid: number) {
  return POWDER_NAME_BY_ID.get(pid)?.slice(1) ?? ''
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
              <span v-else class="slot-icon slot-icon--empty" aria-hidden="true" />
              <div class="slot-body">
                <div class="slot-head">
                  <span class="slot-name" :class="{ 'slot-name--empty': itemName(idx) === 'Empty' }">
                    {{ itemName(idx) === 'Empty' ? label : itemName(idx) }}
                  </span>
                  <span v-if="slotPrice(idx)" class="slot-price">{{ slotPrice(idx) }}</span>
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
                      :style="{ color: pmeta(pid)?.color ?? 'inherit' }"
                      :title="`${pmeta(pid)?.name ?? ''} ${ptier(pid)}`"
                    >
                      <span class="powder-letter">{{ pmeta(pid)?.letter }}</span><span class="powder-tier">{{ ptier(pid) }}</span>
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
          <span v-else class="slot-icon slot-icon--empty" aria-hidden="true" />
          <div class="slot-body">
            <div class="slot-head">
              <span class="slot-name" :class="{ 'slot-name--empty': itemName(idx) === 'Empty' }">
                {{ itemName(idx) === 'Empty' ? label : itemName(idx) }}
              </span>
              <span v-if="slotPrice(idx)" class="slot-price">{{ slotPrice(idx) }}</span>
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
                  :style="{ color: pmeta(pid)?.color ?? 'inherit' }"
                  :title="`${pmeta(pid)?.name ?? ''} ${ptier(pid)}`"
                >
                  <span class="powder-letter">{{ pmeta(pid)?.letter }}</span><span class="powder-tier">{{ ptier(pid) }}</span>
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

/* Empty slot: dashed placeholder keeps the left edge aligned with filled rows
   and reads as "drop an item here". */
.slot-icon--empty {
  border: 1px dashed var(--color-border);
  border-radius: 4px;
  transition: border-color 0.12s;
}
.slot:hover .slot-icon--empty {
  border-color: var(--color-muted);
}
.slot--active .slot-icon--empty {
  border-color: var(--color-copper);
}

.slot-name {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 12px;
  color: var(--color-text);
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slot-name--empty {
  color: var(--color-muted);
}

.slot-price {
  font-size: 0.65rem;
  color: var(--color-muted);
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
  background: color-mix(in oklch, var(--color-bg) 60%, transparent);
}

.powder-chip {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 9px;
  display: inline-flex;
  align-items: baseline;
  gap: 1px;
  letter-spacing: 0;
}
.powder-letter {
  font-weight: 700;
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
  border-color: color-mix(in oklch, var(--color-accent) 50%, transparent);
  border-style: solid;
}

.powder-chips--empty {
  border-color: var(--color-border);
  color: var(--color-faint);
}
.powder-chips--empty:hover {
  border-color: var(--color-copper);
  background: color-mix(in oklch, var(--color-accent) 6%, transparent);
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
  background: color-mix(in oklch, var(--color-bg) 70%, transparent);
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
