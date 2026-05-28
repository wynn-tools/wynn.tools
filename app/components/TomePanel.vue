<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBuildStore } from '~/stores/build'

const store = useBuildStore()

const TOME_SLOTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const
const SLOT_LABELS: Record<number, string> = {
  0: 'Weapon 1',
  1: 'Weapon 2',
  2: 'Armor 1',
  3: 'Armor 2',
  4: 'Armor 3',
  5: 'Armor 4',
  6: 'Guild',
  7: 'Lootrun',
  8: 'Marathon 1',
  9: 'Marathon 2',
  10: 'Mysticism 1',
  11: 'Mysticism 2',
  12: 'Expertise 1',
  13: 'Expertise 2',
}

const expanded = ref(false)

// FilterCombobox is string-keyed; tome ids aren't unique-display by name alone
// (different tiers share a name), so we use "Display Name (Tier)" as the
// human-readable option string and keep id ↔ string maps per slot.
interface SlotMaps {
  options: string[]
  idByLabel: Map<string, number>
  labelById: Map<number, string>
}

function buildSlotMaps(slot: number): SlotMaps {
  const tomes = store.tomesForSlot(slot)
  const options: string[] = []
  const idByLabel = new Map<string, number>()
  const labelById = new Map<number, string>()
  for (const t of tomes) {
    const label = `${t.displayName} (${t.tier})`
    options.push(label)
    idByLabel.set(label, t.id)
    labelById.set(t.id, label)
  }
  return { options, idByLabel, labelById }
}

const slotMaps = computed<Record<number, SlotMaps>>(() => {
  const out: Record<number, SlotMaps> = {}
  for (const slot of TOME_SLOTS)
    out[slot] = buildSlotMaps(slot)
  return out
})

function currentLabel(slot: number): string | null {
  const id = store.currentTomeId(slot)
  return id != null ? (slotMaps.value[slot]?.labelById.get(id) ?? null) : null
}

function onSelect(slot: number, label: string | null) {
  const maps = slotMaps.value[slot]
  if (!maps)
    return
  const id = label != null ? maps.idByLabel.get(label) ?? null : null
  store.setTome(slot, id)
}

const filled = computed(() => {
  let count = 0
  for (const slot of TOME_SLOTS) {
    if (store.currentTomeId(slot) != null)
      count += 1
  }
  return count
})
</script>

<template>
  <section class="tomes">
    <button class="tomes-head" type="button" @click="expanded = !expanded">
      <span class="kicker">Tomes</span>
      <span class="tomes-count mono">{{ filled }} / {{ TOME_SLOTS.length }}</span>
      <span class="chevron" :class="{ 'chevron--open': expanded }">▸</span>
    </button>

    <div v-if="expanded" class="tomes-grid">
      <div v-for="slot in TOME_SLOTS" :key="slot" class="tome-cell">
        <span class="slot-label">{{ SLOT_LABELS[slot] }}</span>
        <FilterCombobox
          :model-value="currentLabel(slot)"
          :options="slotMaps[slot].options"
          placeholder="None"
          @update:model-value="onSelect(slot, $event)"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.tomes {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.tomes-head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
  font-family: inherit;
}
.tomes-head:hover {
  background: oklch(19% 0.008 30 / 0.6);
}

.kicker {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-muted);
  flex: 1;
}

.tomes-count {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 12px;
  color: var(--color-copper);
  font-weight: 600;
}

.chevron {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 11px;
  color: var(--color-muted);
  transition: transform 0.15s ease-out;
}
.chevron--open {
  transform: rotate(90deg);
  color: var(--color-copper);
}

.tomes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 10px 14px;
  padding: 12px 14px 14px;
  border-top: 1px solid var(--color-border);
}

@media (max-width: 720px) {
  .tomes-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px 8px;
    padding: 10px 10px 12px;
  }
  .tome-cell {
    grid-template-columns: 1fr;
    gap: 4px;
  }
  .tomes-head {
    padding: 10px 12px;
  }
}

@media (max-width: 380px) {
  .tomes-grid {
    grid-template-columns: 1fr;
  }
}

.tome-cell {
  display: grid;
  grid-template-columns: 88px 1fr;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.slot-label {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 11px;
  color: var(--color-muted);
  letter-spacing: 0.04em;
}
</style>
