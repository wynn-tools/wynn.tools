<script setup lang="ts">
import { ref } from 'vue'
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

function onTomeChange(slot: number, event: Event) {
  const value = (event.target as HTMLSelectElement).value
  store.setTome(slot, value === '' ? null : Number(value))
}

function fillCount(): number {
  let count = 0
  for (const slot of TOME_SLOTS) {
    if (store.currentTomeId(slot) != null)
      count += 1
  }
  return count
}
</script>

<template>
  <section class="tomes">
    <button class="tomes-head" type="button" @click="expanded = !expanded">
      <span class="kicker">Tomes</span>
      <span class="tomes-count mono">{{ fillCount() }} / {{ TOME_SLOTS.length }}</span>
      <span class="chevron" :class="{ 'chevron--open': expanded }">▸</span>
    </button>

    <div v-if="expanded" class="tomes-grid">
      <div v-for="slot in TOME_SLOTS" :key="slot" class="tome-cell">
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
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 6px 12px;
  padding: 10px 14px 14px;
  border-top: 1px solid var(--color-border);
}

.tome-cell {
  display: grid;
  grid-template-columns: 80px 1fr;
  align-items: center;
  gap: 8px;
}

.slot-label {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 11px;
  color: var(--color-muted);
  letter-spacing: 0.04em;
}

.tome-select {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 12px;
  color: var(--color-text);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 3px 6px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.12s;
  min-width: 0;
  width: 100%;
}

.tome-select:focus {
  border-color: var(--color-copper);
  color: var(--color-copper);
}
</style>
