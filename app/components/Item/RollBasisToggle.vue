<script setup lang="ts">
import type { RollBasis } from '~/lib/items-search/roll-basis'

const model = defineModel<RollBasis>({ required: true })
</script>

<template>
  <div class="roll-basis" role="radiogroup" aria-label="Roll basis">
    <button
      type="button" role="radio" :aria-checked="model === 'possible'"
      :class="{ on: model === 'possible' }"
      @click="model = 'possible'"
    >
      Possible
    </button>
    <button
      type="button" role="radio" :aria-checked="model === 'guaranteed'"
      :class="{ on: model === 'guaranteed' }"
      @click="model = 'guaranteed'"
    >
      Guaranteed
    </button>
  </div>
</template>

<style scoped>
.roll-basis {
  display: inline-flex;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 3px;
}
.roll-basis button {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
  background: transparent;
  border: 0;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition:
    color 0.12s,
    background 0.12s;
}
.roll-basis button:hover {
  color: var(--color-text);
}
.roll-basis button.on {
  color: var(--color-accent);
  background: color-mix(in oklch, var(--color-accent) 10%, transparent);
}
.roll-basis button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
