<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBuildStore } from '~/stores/build'

const store = useBuildStore()
const openTomeSlot = ref<number | null>(null)

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

function tomeDisplayName(slot: number): string {
  const id = store.currentTomeId(slot)
  if (id == null)
    return SLOT_LABELS[slot] ?? `Tome ${slot}`
  return slotMaps.value[slot]?.labelById.get(id) ?? SLOT_LABELS[slot] ?? `Tome ${slot}`
}

function hasRollableIds(slot: number): boolean {
  const expanded = store.expandedAtTomeSlot(slot)
  if (!expanded)
    return false
  if (expanded.get('fixID'))
    return false
  const minR = expanded.get('minRolls') as Map<string, number> | undefined
  const maxR = expanded.get('maxRolls') as Map<string, number> | undefined
  if (!minR || !maxR)
    return false
  return [...maxR.keys()].some(id => (minR.get(id) ?? 0) !== (maxR.get(id) ?? 0))
}

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
    <header class="tomes-head">
      <span class="kicker">Tomes</span>
      <span class="tomes-count mono">{{ filled }} / {{ TOME_SLOTS.length }}</span>
    </header>

    <div class="tomes-grid">
      <div v-for="slot in TOME_SLOTS" :key="slot" class="tome-cell">
        <span class="slot-label">{{ SLOT_LABELS[slot] }}</span>
        <FilterCombobox
          :model-value="currentLabel(slot)"
          :options="slotMaps[slot].options"
          placeholder="None"
          @update:model-value="onSelect(slot, $event)"
        />
        <button
          v-if="hasRollableIds(slot)"
          class="rolls-btn"
          type="button"
          :aria-label="`Edit rolls on ${SLOT_LABELS[slot]}`"
          @click.stop="openTomeSlot = slot"
        >
          ✎
        </button>
        <span v-else class="rolls-spacer" />
      </div>
    </div>

    <RollOverridePanel
      v-if="openTomeSlot !== null && store.expandedAtTomeSlot(openTomeSlot)"
      kind="tome"
      :open="openTomeSlot !== null"
      :slot-idx="openTomeSlot"
      :item="store.expandedAtTomeSlot(openTomeSlot)!"
      :item-name="tomeDisplayName(openTomeSlot)"
      @update:open="(v) => { if (!v) openTomeSlot = null }"
    />
  </section>
</template>

<style scoped>
.tomes {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px 12px 10px;
}

.tomes-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 6px;
}

.tomes-count {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 12px;
  color: var(--color-copper);
  font-weight: 600;
}

/* Always expanded, two tight columns so the 14 slots fill the space under the
   gear grid and bring the inputs column up to roughly the stats column height. */
.tomes-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 12px;
}

.tome-cell {
  display: grid;
  grid-template-columns: 62px 1fr 20px;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.rolls-btn {
  background: var(--color-surface-hi);
  border: 1px solid var(--color-border);
  border-radius: 3px;
  width: 18px;
  height: 18px;
  font-size: 10px;
  color: var(--color-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition:
    color 0.12s,
    border-color 0.12s;
}
.rolls-btn:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.rolls-spacer {
  width: 18px;
  flex-shrink: 0;
}

.slot-label {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  color: var(--color-muted);
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 1100px) {
  .tomes-grid {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }
  .tome-cell {
    grid-template-columns: 78px 1fr 20px;
  }
}

/* Phones: one tome per row. Two columns starved the combobox to ~100px and
   clipped the slot label; a full-width row gives the picker the whole line and
   restores a comfortable tap target. */
@media (max-width: 720px) {
  .tomes-grid {
    grid-template-columns: 1fr;
    gap: 6px;
  }
  .tome-cell {
    grid-template-columns: 96px 1fr 20px;
    gap: 10px;
  }
  .slot-label {
    font-size: 11px;
  }
}
</style>
