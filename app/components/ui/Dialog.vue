<script setup lang="ts">
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'

withDefaults(defineProps<{
  open?: boolean
  title?: string
  ariaLabel?: string
  variant?: 'default' | 'elevated'
  width?: number | string
  maxWidth?: number | string
  maxHeight?: number | string
  showClose?: boolean
}>(), {
  variant: 'default',
  width: 'min(520px, 92vw)',
  maxHeight: '86vh',
  showClose: true,
})

defineEmits<{ 'update:open': [open: boolean] }>()

function sizeValue(v: number | string | undefined) {
  if (v === undefined)
    return undefined
  return typeof v === 'number' ? `${v}px` : v
}
</script>

<template>
  <DialogRoot :open="open" @update:open="$emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay class="ui-dialog__overlay" :class="[`ui-dialog__overlay--${variant}`]" />
      <DialogContent
        class="ui-dialog"
        :class="[`ui-dialog--${variant}`]"
        :aria-label="ariaLabel ?? title"
        :style="{
          width: sizeValue(width),
          maxWidth: sizeValue(maxWidth),
          maxHeight: sizeValue(maxHeight),
        }"
      >
        <header
          v-if="title || $slots['header-actions'] || showClose"
          class="ui-dialog__head"
        >
          <DialogTitle v-if="title" class="ui-dialog__title">
            {{ title }}
          </DialogTitle>
          <span v-else />
          <div class="ui-dialog__head-actions">
            <slot name="header-actions" />
            <DialogClose v-if="showClose" class="ui-dialog__close" aria-label="Close">
              ×
            </DialogClose>
          </div>
        </header>

        <div class="ui-dialog__body">
          <slot />
        </div>

        <footer v-if="$slots.footer" class="ui-dialog__foot">
          <slot name="footer" />
        </footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style>
/* Unscoped on purpose: DialogPortal teleports the node out of the component
   subtree, so scoped data-v attributes can't reach it. */
.ui-dialog__overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
}
.ui-dialog__overlay--default {
  background: oklch(0% 0 0 / 0.55);
}
.ui-dialog__overlay--elevated {
  background: color-mix(in oklch, var(--color-bg) 70%, transparent);
  backdrop-filter: blur(2px);
}

.ui-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 51;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  border-radius: 8px;
  overflow: auto;
  color: var(--color-text);
}

.ui-dialog--default {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: 0 8px 40px oklch(0% 0 0 / 0.5);
}

.ui-dialog--elevated {
  background: color-mix(in oklch, var(--color-surface) 96%, transparent);
  border: 1px solid var(--color-border);
  backdrop-filter: blur(12px);
  box-shadow:
    0 4px 24px oklch(0% 0 0 / 0.3),
    inset 0 0 0 1px color-mix(in oklch, var(--color-accent) 18%, transparent);
}

.ui-dialog:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.ui-dialog__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  flex-shrink: 0;
}
.ui-dialog__title {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text);
  margin: 0;
}
.ui-dialog__head-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.ui-dialog__close {
  background: transparent;
  border: 0;
  color: var(--color-muted);
  font-size: 18px;
  line-height: 1;
  padding: 2px 6px;
  cursor: pointer;
  border-radius: 4px;
  transition:
    color 0.12s ease-out,
    background 0.12s ease-out;
}
.ui-dialog__close:hover {
  color: var(--color-text);
  background: color-mix(in oklch, var(--color-surface-hi) 50%, transparent);
}
.ui-dialog__close:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.ui-dialog__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.ui-dialog__foot {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
</style>
