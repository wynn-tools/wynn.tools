<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'

withDefaults(defineProps<{
  open?: boolean
  variant?: 'default' | 'elevated'
  width?: number | string
  minWidth?: number | string
  sideOffset?: number
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  ariaLabel?: string
}>(), {
  variant: 'default',
  minWidth: 240,
  sideOffset: 6,
  side: 'bottom',
  align: 'end',
})

defineEmits<{ 'update:open': [open: boolean] }>()

function sizeValue(v: number | string | undefined) {
  if (v === undefined)
    return undefined
  return typeof v === 'number' ? `${v}px` : v
}
</script>

<template>
  <PopoverRoot :open="open" @update:open="$emit('update:open', $event)">
    <PopoverTrigger as-child>
      <slot name="trigger" />
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        class="ui-popover"
        :class="[`ui-popover--${variant}`]"
        :side="side"
        :align="align"
        :side-offset="sideOffset"
        :aria-label="ariaLabel"
        :style="{
          width: sizeValue(width),
          minWidth: sizeValue(minWidth),
        }"
      >
        <slot />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>

<style>
/* Unscoped on purpose: PopoverPortal teleports the node out of the component
   subtree, so scoped data-v attributes can't reach it. */
.ui-popover {
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  font-family: var(--font-body, inherit);
  color: var(--color-text);
}

.ui-popover--default {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.ui-popover--elevated {
  background: color-mix(in oklch, var(--color-surface-hi) 96%, transparent);
  backdrop-filter: blur(12px);
  border-radius: 8px;
  box-shadow:
    0 4px 24px oklch(0% 0 0 / 0.3),
    inset 0 0 0 1px color-mix(in oklch, var(--color-accent) 20%, transparent);
}

.ui-popover:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
