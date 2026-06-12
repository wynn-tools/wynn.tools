<script setup lang="ts">
import type { Requirement } from '~/lib/items/roll-simulator'

const props = defineProps<{
  label: string
  requirement: Requirement
  currentPct: number
}>()

const emit = defineEmits<{
  update: [Requirement]
}>()

function toggle() {
  emit('update', { ...props.requirement, enabled: !props.requirement.enabled })
}
function flipDirection() {
  emit('update', { ...props.requirement, direction: props.requirement.direction === 'gte' ? 'lte' : 'gte' })
}
function setValue(v: string) {
  const num = v.trim() === '' ? null : Number(v)
  emit('update', { ...props.requirement, value: Number.isFinite(num) ? num : null })
}

const met = computed(() => {
  if (!props.requirement.enabled || props.requirement.value == null)
    return false
  return props.requirement.direction === 'gte'
    ? props.currentPct >= props.requirement.value
    : props.currentPct <= props.requirement.value
})
</script>

<template>
  <div class="req" :class="{ 'req--on': requirement.enabled, 'req--met': met && requirement.enabled }">
    <button
      type="button"
      class="req-toggle"
      :aria-pressed="requirement.enabled"
      @click="toggle"
    >
      <span class="req-check" aria-hidden="true">
        <span v-if="requirement.enabled" class="req-check-mark">✓</span>
      </span>
      <span class="req-label">{{ label }}</span>
    </button>
    <button
      type="button"
      class="req-dir"
      :class="`req-dir--${requirement.direction}`"
      :aria-label="requirement.direction === 'gte' ? 'At least' : 'At most'"
      :disabled="!requirement.enabled"
      @click="flipDirection"
    >
      {{ requirement.direction === 'gte' ? '≥' : '≤' }}
    </button>
    <input
      type="number"
      min="0"
      max="100"
      step="1"
      class="req-input"
      :disabled="!requirement.enabled"
      :value="requirement.value ?? ''"
      placeholder="—"
      @input="(e) => setValue((e.target as HTMLInputElement).value)"
    >
    <span class="req-pct">%</span>
  </div>
</template>

<style scoped>
.req {
  display: grid;
  grid-template-columns: 1fr 36px 64px 18px;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 4px;
}
.req--met {
  background: color-mix(in oklch, var(--color-accent) 5%, transparent);
}

.req-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: 0;
  cursor: pointer;
  padding: 4px 0;
  color: var(--color-muted);
  text-align: left;
  min-width: 0;
}
.req-toggle:hover {
  color: var(--color-text);
}
.req-toggle:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: 4px;
}
.req--on .req-toggle {
  color: var(--color-text);
}

.req-check {
  width: 14px;
  height: 14px;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  transition:
    border-color 0.12s ease-out,
    background 0.12s ease-out;
}
.req--on .req-check {
  border-color: var(--color-accent);
  background: color-mix(in oklch, var(--color-accent) 20%, transparent);
}
.req-check-mark {
  font-size: 10px;
  color: var(--color-accent);
  line-height: 1;
}

.req-label {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.req-dir {
  width: 28px;
  height: 26px;
  display: grid;
  place-items: center;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font: 500 14px/1 var(--font-mono);
  color: var(--color-muted);
  cursor: pointer;
  transition:
    border-color 0.12s ease-out,
    color 0.12s ease-out,
    background 0.12s ease-out;
}
.req-dir:hover:not(:disabled) {
  border-color: var(--color-faint);
}
.req-dir:disabled {
  opacity: 0.4;
  cursor: default;
}
.req-dir--gte {
  color: var(--color-good);
  border-color: color-mix(in oklch, var(--color-good) 30%, var(--color-border));
}
.req-dir--lte {
  color: var(--color-bad);
  border-color: color-mix(in oklch, var(--color-bad) 30%, var(--color-border));
}

.req-input {
  width: 100%;
  height: 26px;
  background: color-mix(in oklch, var(--color-bg) 60%, transparent);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 0 8px;
  font: 500 12px/1 var(--font-mono);
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
  text-align: right;
  transition: border-color 0.12s ease-out;
}
.req-input:focus-visible {
  outline: none;
  border-color: var(--color-accent);
}
.req-input:disabled {
  opacity: 0.4;
  cursor: default;
}

.req-pct {
  font: 500 11px/1 var(--font-mono);
  color: var(--color-faint);
  letter-spacing: 0.04em;
}
</style>
