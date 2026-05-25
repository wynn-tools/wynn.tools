<script setup lang="ts">
import { useBuildStore } from '~/stores/build'

const store = useBuildStore()

const TOME_SLOTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const
const SLOT_LABELS: Record<number, string> = {
  0: 'Weapon Tome 1',
  1: 'Weapon Tome 2',
  2: 'Armor Tome 1',
  3: 'Armor Tome 2',
  4: 'Armor Tome 3',
  5: 'Armor Tome 4',
  6: 'Guild Tome',
  7: 'Lootrun Tome',
  8: 'Marathon Tome 1',
  9: 'Marathon Tome 2',
  10: 'Mysticism Tome 1',
  11: 'Mysticism Tome 2',
  12: 'Expertise Tome 1',
  13: 'Expertise Tome 2',
}

function onTomeChange(slot: number, event: Event) {
  const value = (event.target as HTMLSelectElement).value
  store.setTome(slot, value === '' ? null : Number(value))
}
</script>

<template>
  <div class="tome-panel">
    <h2 class="section-title">
      Tomes
    </h2>
    <div class="slot-list">
      <div v-for="slot in TOME_SLOTS" :key="slot" class="tome-slot">
        <span class="slot-label">{{ SLOT_LABELS[slot] }}</span>
        <select
          class="tome-select"
          :value="store.currentTomeId(slot) ?? ''"
          @change="onTomeChange(slot, $event)"
        >
          <option value="">
            None
          </option>
          <option
            v-for="t in store.tomesForSlot(slot)"
            :key="t.id"
            :value="t.id"
          >
            {{ t.displayName }} ({{ t.tier }})
          </option>
        </select>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tome-panel {
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 20px 24px;
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
  gap: 8px;
}

.tome-slot {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slot-label {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 12px;
  color: var(--color-muted);
  letter-spacing: 0.04em;
  min-width: 120px;
  flex-shrink: 0;
}

.tome-select {
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
  flex: 1;
  min-width: 0;
}

.tome-select:focus {
  border-color: var(--color-copper);
  color: var(--color-copper);
}
</style>
