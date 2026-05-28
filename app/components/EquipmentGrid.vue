<script setup lang="ts">
import {
  HoverCardContent,
  HoverCardPortal,
  HoverCardRoot,
  HoverCardTrigger,
} from 'reka-ui'
import { computed } from 'vue'
import { POWDER_NAME_BY_ID } from '~/lib/data/powder-constants'
import { itemIconUrl } from '~/lib/items/icon'
import { useBuildStore } from '~/stores/build'

const store = useBuildStore()

function slotIcon(slot: number): string | null {
  const id = store.rawBuild?.equipmentIds[slot]
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
const powderSlot = ref<number | null>(null)

function itemName(slot: number): string {
  const id = store.rawBuild?.equipmentIds[slot]
  if (id == null)
    return 'Empty'
  const item = store.ctx?.rawItemIndex.resolveId(id)
  if (!item)
    return 'Empty'
  const name = item.displayName as string | undefined
  return !name || (item.id as number) >= 10000 ? 'Empty' : name
}

function openPicker(slot: number) {
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
        <HoverCardRoot v-if="slotSearchItem(idx)" :open-delay="300" :close-delay="0">
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
                  type="button"
                  :aria-label="`Powders for ${label}`"
                  @click="openPowders(idx, $event)"
                >
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
                    class="powder-chip powder-chip--empty"
                  >·</span>
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
                <ItemTooltip :item="slotSearchItem(idx)!" />
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
              type="button"
              :aria-label="`Powders for ${label}`"
              @click="openPowders(idx, $event)"
            >
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
                class="powder-chip powder-chip--empty"
              >·</span>
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
      <ItemPicker :slot-index="openSlot" @select="handleSelect" @close="handleClose" />
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
  gap: 3px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 1px 4px;
  cursor: pointer;
  transition:
    border-color 0.12s,
    background 0.12s;
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
.powder-chip--empty {
  color: var(--color-faint);
  opacity: 0.5;
  padding: 0 1px;
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

.quickview {
  z-index: 9999;
}

.quickview-scale {
  zoom: 0.7;
}
</style>
