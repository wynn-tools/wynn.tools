<script setup lang="ts">
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

const openSlot = ref<number | null>(null)

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
</script>

<template>
  <div class="equipment-grid-wrapper">
    <div class="equipment-grid">
      <div
        v-for="(label, idx) in SLOT_LABELS"
        :key="idx"
        class="slot"
        :class="{ 'slot--active': openSlot === idx }"
        @click="openPicker(idx)"
      >
        <span class="slot-label">{{ label }}</span>
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
    </div>

    <!-- Inline picker panel (no dialog dependency, robust) -->
    <div v-if="openSlot !== null" class="picker-overlay" @click.self="handleClose">
      <ItemPicker :slot-index="openSlot" @select="handleSelect" @close="handleClose" />
    </div>
  </div>
</template>

<style scoped>
.equipment-grid-wrapper {
  position: relative;
}

.equipment-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  max-width: 560px;
  margin-bottom: 24px;
}

.slot {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  transition:
    border-color 0.1s,
    background 0.1s;
}

.slot:hover {
  border-color: var(--color-muted);
  background: oklch(16% 0.008 250);
}

.slot--active {
  border-color: var(--color-copper);
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
  background: oklch(14% 0.008 250 / 0.7);
  backdrop-filter: blur(2px);
}
</style>
