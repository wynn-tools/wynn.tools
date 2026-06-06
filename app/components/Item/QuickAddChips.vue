<script setup lang="ts">
import type { IdConstraint } from '~/lib/items-search/types'
import { humanizeField } from '~/lib/data/identifications'

const props = defineProps<{ codes?: readonly string[] }>()
const emit = defineEmits<{ focusKey: [key: string] }>()
const model = defineModel<IdConstraint[]>({ required: true })

// Curated short-list of common v3 identification keys (the ones items actually
// store — see app/lib/items-search/item-search-adapter.ts).
const DEFAULT_QUICK = ['rawStrength', 'rawDexterity', 'rawIntelligence', 'rawDefence', 'rawAgility', 'spellDamage', 'rawSpellDamage', 'manaRegen', 'walkSpeed', 'rawHealth'] as const

const QUICK = computed(() => props.codes ?? DEFAULT_QUICK)

function labelFor(key: string): string {
  return humanizeField(key).label.toUpperCase()
}

function activeKey(key: string): boolean {
  return model.value.some(c => c.kind === 'id' && c.key === key)
}

function add(key: string) {
  if (activeKey(key)) {
    emit('focusKey', key)
    return
  }
  model.value = [...model.value, { kind: 'id', key, min: 1 }]
  emit('focusKey', key)
}
</script>

<template>
  <div class="quick" role="toolbar" aria-label="Quick add identification">
    <button
      v-for="key in QUICK" :key="key" type="button"
      :class="{ on: activeKey(key) }"
      @click="add(key)"
    >
      {{ labelFor(key) }}
    </button>
  </div>
</template>

<style scoped>
.quick {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.quick button {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 5px 9px;
  cursor: pointer;
  transition:
    color 0.12s,
    border-color 0.12s,
    background 0.12s;
}
.quick button:hover {
  color: var(--color-text);
  border-color: var(--color-faint);
}
.quick button.on {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: color-mix(in oklch, var(--color-accent) 8%, transparent);
}
.quick button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
