<script setup lang="ts" generic="V extends string | number">
interface SegOption {
  value: V
  label?: string
  disabled?: boolean
}

withDefaults(defineProps<{
  options: readonly SegOption[]
  role?: 'radio' | 'tab' | 'group'
  variant?: 'inline' | 'enclosed'
  ariaLabel?: string
  fullWidth?: boolean
}>(), {
  role: 'radio',
  variant: 'enclosed',
  fullWidth: false,
})

const model = defineModel<V>({ required: true })

const ROLE_TO_GROUP = {
  radio: 'radiogroup',
  tab: 'tablist',
  group: 'group',
} as const

const ROLE_TO_ITEM = {
  radio: 'radio',
  tab: 'tab',
  group: undefined,
} as const

function ariaProps(opt: SegOption, role: 'radio' | 'tab' | 'group') {
  const active = opt.value === model.value
  if (role === 'radio')
    return { 'aria-checked': active }
  if (role === 'tab')
    return { 'aria-selected': active }
  return {}
}
</script>

<template>
  <div
    class="ui-seg"
    :class="[`ui-seg--${variant}`, fullWidth ? 'ui-seg--full' : null]"
    :role="ROLE_TO_GROUP[role]"
    :aria-label="ariaLabel"
  >
    <button
      v-for="opt in options"
      :key="String(opt.value)"
      type="button"
      :role="ROLE_TO_ITEM[role]"
      class="ui-seg__btn"
      :class="{ 'ui-seg__btn--on': opt.value === model }"
      :disabled="opt.disabled"
      v-bind="ariaProps(opt, role)"
      @click="model = opt.value"
    >
      <slot name="option" :option="opt" :active="opt.value === model">
        {{ opt.label }}
      </slot>
    </button>
  </div>
</template>

<style scoped>
.ui-seg {
  display: inline-flex;
}
.ui-seg--full {
  display: grid;
  grid-auto-columns: 1fr;
  grid-auto-flow: column;
}

/* Enclosed: container with border + padding, pills without borders. */
.ui-seg--enclosed {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 3px;
  gap: 2px;
}
.ui-seg--enclosed .ui-seg__btn {
  border: none;
  border-radius: 4px;
}
.ui-seg--enclosed .ui-seg__btn--on {
  color: var(--color-accent);
  background: color-mix(in oklch, var(--color-accent) 10%, transparent);
}

/* Inline: bare row, each pill carries its own border. */
.ui-seg--inline {
  gap: 4px;
}
.ui-seg--inline .ui-seg__btn {
  border: 1px solid var(--color-border);
  border-radius: 4px;
}
.ui-seg--inline .ui-seg__btn--on {
  color: var(--color-accent);
  border-color: color-mix(in oklch, var(--color-accent) 50%, transparent);
  background: color-mix(in oklch, var(--color-accent) 6%, transparent);
}
.ui-seg--inline .ui-seg__btn--on:hover:not(:disabled) {
  border-color: var(--color-accent);
}

/* Shared button shape */
.ui-seg__btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-muted);
  background: transparent;
  padding: 5px 10px;
  cursor: pointer;
  white-space: nowrap;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out,
    background-color 0.12s ease-out;
}
.ui-seg__btn:hover:not(:disabled) {
  color: var(--color-text);
}
.ui-seg--inline .ui-seg__btn:hover:not(:disabled) {
  border-color: var(--color-faint);
}
.ui-seg__btn:disabled {
  opacity: 0.45;
  cursor: default;
}
.ui-seg__btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
