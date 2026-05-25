<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { POWDER_ID_BY_NAME } from '~/lib/data/powder-constants'
import { useBuildStore } from '~/stores/build'

const store = useBuildStore()

const POWDERABLE_SLOTS = [0, 1, 2, 3, 8] as const
const SLOT_LABELS: Record<number, string> = {
  0: 'Helmet',
  1: 'Chestplate',
  2: 'Leggings',
  3: 'Boots',
  8: 'Weapon',
}

const ELEMENTS = [
  ['e', 'Earth'],
  ['t', 'Thunder'],
  ['w', 'Water'],
  ['f', 'Fire'],
  ['a', 'Air'],
] as const
const TIERS = [1, 2, 3, 4, 5, 6, 7] as const

// Build option list once: [{value: id, label: 'Earth 1', element: 'e'}, ...]
interface PowderOption {
  value: number
  label: string
  element: string
}
interface PowderGroup {
  element: string
  name: string
  options: PowderOption[]
}

const POWDER_GROUPS: PowderGroup[] = ELEMENTS.map(([el, name]) => ({
  element: el,
  name,
  options: TIERS.map(tier => ({
    value: POWDER_ID_BY_NAME.get(`${el}${tier}`) as number,
    label: `${name} ${tier}`,
    element: el,
  })),
}))

// Active powderable slots
const activeSlots = computed(() =>
  POWDERABLE_SLOTS.filter(slot => store.maxPowderSlots(slot) > 0),
)

// Local reactive state: slotSelections[slot][subIndex] = powder id (number) or '' for none
// We use a Map keyed by slot for reactivity
const slotSelections = ref<Map<number, Array<number | ''>>>(new Map())

function syncSlot(slot: number) {
  const powders = store.powdersForEquipmentSlot(slot)
  const maxSlots = store.maxPowderSlots(slot)
  const arr: Array<number | ''> = []
  for (let i = 0; i < maxSlots; i++) {
    arr.push(powders[i] !== undefined ? powders[i] : '')
  }
  slotSelections.value.set(slot, arr)
}

// Sync all slots initially and whenever store changes
watch(
  () => activeSlots.value,
  (slots) => {
    for (const slot of slots) {
      syncSlot(slot)
    }
  },
  { immediate: true },
)

// Also watch each slot's powders for external changes (e.g. loading a new hash)
watch(
  () => POWDERABLE_SLOTS.map(slot => store.powdersForEquipmentSlot(slot)),
  () => {
    for (const slot of activeSlots.value) {
      syncSlot(slot)
    }
  },
  { deep: true },
)

function onSubSlotChange(slot: number, subIndex: number, event: Event) {
  const rawVal = (event.target as HTMLSelectElement).value
  const val: number | '' = rawVal === '' ? '' : Number(rawVal)

  const selections = slotSelections.value.get(slot)
  if (!selections)
    return

  selections[subIndex] = val

  // Collect non-empty ids in order
  const ids = selections.filter((v): v is number => v !== '')
  store.setPowders(slot, ids)
}

function getSelections(slot: number): Array<number | ''> {
  return slotSelections.value.get(slot) ?? []
}
</script>

<template>
  <div v-if="activeSlots.length > 0" class="powder-panel">
    <h2 class="section-title">
      Powders
    </h2>
    <div class="slot-list">
      <div v-for="slot in activeSlots" :key="slot" class="powder-slot">
        <div class="slot-header">
          <span class="slot-label">{{ SLOT_LABELS[slot] }}</span>
        </div>
        <div class="sub-slots">
          <select
            v-for="(selVal, subIndex) in getSelections(slot)"
            :key="subIndex"
            class="powder-select"
            :value="selVal === '' ? '' : String(selVal)"
            @change="onSubSlotChange(slot, subIndex, $event)"
          >
            <option value="">
              None
            </option>
            <optgroup
              v-for="group in POWDER_GROUPS"
              :key="group.element"
              :label="group.name"
            >
              <option
                v-for="opt in group.options"
                :key="opt.value"
                :value="String(opt.value)"
              >
                {{ opt.label }}
              </option>
            </optgroup>
          </select>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="powder-panel powder-panel--empty">
    <span class="empty-note">No powder slots</span>
  </div>
</template>

<style scoped>
.powder-panel {
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 20px 24px;
}

.powder-panel--empty {
  padding: 12px 24px;
}

.section-title {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-muted);
  margin-bottom: 16px;
}

.slot-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.powder-slot {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.slot-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.slot-label {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 12px;
  color: var(--color-muted);
  letter-spacing: 0.04em;
}

.sub-slots {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.powder-select {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 12px;
  color: var(--color-text);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  padding: 3px 6px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s;
  max-width: 120px;
}

.powder-select:focus {
  border-color: var(--color-copper);
  color: var(--color-copper);
}

.empty-note {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 12px;
  color: var(--color-faint);
  letter-spacing: 0.04em;
}
</style>
