<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'ghost' | 'accent'
  size?: 'sm' | 'md'
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  fullWidth?: boolean
}>(), {
  variant: 'ghost',
  size: 'sm',
  type: 'button',
  fullWidth: false,
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="ui-btn"
    :class="[`ui-btn--${variant}`, `ui-btn--${size}`, fullWidth ? 'ui-btn--full' : null]"
  >
    <slot />
  </button>
</template>

<style scoped>
.ui-btn {
  font-family: var(--font-mono);
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  cursor: pointer;
  white-space: nowrap;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out,
    background-color 0.12s ease-out;
}
.ui-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
.ui-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.ui-btn--full {
  width: 100%;
}

/* Sizes */
.ui-btn--sm {
  font-size: 10px;
  padding: 6px 14px;
}
.ui-btn--md {
  font-size: 10px;
  padding: 8px 16px;
}

/* Variants */
.ui-btn--ghost {
  color: var(--color-muted);
}
.ui-btn--ghost:not(:disabled):hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.ui-btn--accent {
  color: var(--color-accent);
  border-color: color-mix(in oklch, var(--color-accent) 40%, transparent);
  background: color-mix(in oklch, var(--color-accent) 6%, transparent);
}
.ui-btn--accent:not(:disabled):hover {
  background: color-mix(in oklch, var(--color-accent) 14%, transparent);
  border-color: var(--color-accent);
}
.ui-btn--accent:disabled {
  background: transparent;
  border-color: var(--color-border);
  color: var(--color-faint);
}
</style>
