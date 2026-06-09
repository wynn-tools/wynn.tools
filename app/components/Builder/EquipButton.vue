<script setup lang="ts">
import type { SearchItem } from '~/lib/items-search/types'
import { PopoverAnchor, PopoverContent, PopoverPortal, PopoverRoot } from 'reka-ui'
import { computed, ref } from 'vue'
import { useBuilderRail } from '~/composables/useBuilderRail'
import { SLOT, SLOT_LABELS, slotsForItem } from '~/lib/builder-draft/routing'

const props = defineProps<{ item: SearchItem }>()

const rail = useBuilderRail()
const match = computed(() => slotsForItem(props.item))
const equippable = computed(() => match.value.slots.length > 0)
const isRing = computed(() => match.value.ambiguous)
const equipped = computed(() => rail.isEquipped(props.item.id))

const ringOpen = ref(false)

const ringSlots = computed(() =>
  [SLOT.ring1, SLOT.ring2].map(slot => ({
    slot,
    label: SLOT_LABELS[slot],
    occupant: rail.itemFor(rail.previewIds.value[slot] ?? null)?.name ?? null,
  })),
)

// Auto-fills an empty ring slot; only returns 'choose-ring' when both are full.
function onEquip() {
  const outcome = rail.equip(props.item)
  ringOpen.value = outcome.kind === 'choose-ring'
}
function chooseRing(slot: number) {
  rail.commitToSlot(props.item, slot)
  ringOpen.value = false
}
function onUnequip() {
  rail.unequip(props.item)
}
</script>

<template>
  <button
    v-if="equippable && equipped"
    type="button"
    class="equip equip--on"
    :aria-label="`Unequip ${item.name}`"
    @click.stop.prevent="onUnequip"
  >
    <span class="equip-plus" aria-hidden="true">−</span>
    <span class="equip-label">Unequip</span>
  </button>

  <PopoverRoot v-else-if="equippable && isRing" v-model:open="ringOpen">
    <PopoverAnchor as-child>
      <button
        type="button"
        class="equip"
        :aria-label="`Equip ${item.name}`"
        @click.stop.prevent="onEquip"
      >
        <span class="equip-plus" aria-hidden="true">+</span>
        <span class="equip-label">Equip</span>
      </button>
    </PopoverAnchor>
    <PopoverPortal>
      <PopoverContent
        class="ring-menu"
        side="bottom"
        align="end"
        :side-offset="6"
        @click.stop
        @open-auto-focus.prevent
      >
        <span class="ring-menu-head">Both rings full — replace</span>
        <button
          v-for="r in ringSlots"
          :key="r.slot"
          type="button"
          class="ring-opt"
          @click.stop.prevent="chooseRing(r.slot)"
        >
          <span class="ring-opt-name">{{ r.label }}</span>
          <span class="ring-opt-occ">{{ r.occupant ?? 'empty' }}</span>
        </button>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>

  <button
    v-else-if="equippable"
    type="button"
    class="equip"
    :aria-label="`Equip ${item.name}`"
    @click.stop.prevent="onEquip"
  >
    <span class="equip-plus" aria-hidden="true">+</span>
    <span class="equip-label">Equip</span>
  </button>
</template>

<style scoped>
.equip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font: 500 10px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-accent);
  background: color-mix(in oklch, var(--color-surface-hi) 92%, transparent);
  backdrop-filter: blur(6px);
  border: 1px solid color-mix(in oklch, var(--color-accent) 40%, transparent);
  border-radius: 5px;
  cursor: pointer;
  transition:
    background 0.12s ease-out,
    border-color 0.12s ease-out,
    box-shadow 0.12s ease-out;
}
.equip:hover {
  background: color-mix(in oklch, var(--color-accent) 12%, var(--color-surface-hi));
  border-color: var(--color-accent);
  box-shadow: 0 0 16px color-mix(in oklch, var(--color-accent) 18%, transparent);
}
.equip:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
/* Equipped: filled accent to read as an active toggle that turns off. */
.equip--on {
  color: var(--color-bg);
  background: var(--color-accent);
  border-color: var(--color-accent);
}
.equip--on:hover {
  color: var(--color-bg);
  background: color-mix(in oklch, var(--color-accent) 88%, var(--color-bg));
  border-color: var(--color-accent);
}
.equip-plus {
  font-size: 13px;
  line-height: 1;
  margin-top: -1px;
}

.ring-menu {
  z-index: 70;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 160px;
  padding: 6px;
  background: color-mix(in oklch, var(--color-surface-hi) 96%, transparent);
  backdrop-filter: blur(12px);
  border-radius: 8px;
  box-shadow:
    0 4px 24px oklch(0% 0 0 / 0.3),
    inset 0 0 0 1px color-mix(in oklch, var(--color-accent) 20%, transparent);
}
.ring-menu-head {
  font: 500 10px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-faint);
  padding: 4px 8px 6px;
}
.ring-opt {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  background: var(--color-surface);
  cursor: pointer;
  text-align: left;
  transition:
    background 0.12s ease-out,
    border-color 0.12s ease-out;
}
.ring-opt:hover {
  background: color-mix(in oklch, var(--color-accent) 10%, var(--color-surface));
  border-color: var(--color-accent);
}
.ring-opt:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}
.ring-opt-name {
  font: 600 13px/1 var(--font-display);
  color: var(--color-text);
}
.ring-opt-occ {
  font-size: 11px;
  color: var(--color-muted);
}
</style>
