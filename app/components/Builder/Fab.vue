<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
  VisuallyHidden,
} from 'reka-ui'
import { ref } from 'vue'
import { useBuilderRail } from '~/composables/useBuilderRail'

const rail = useBuilderRail()
const sheetOpen = ref(false)

async function openFull() {
  await rail.navigateToFullBuilder()
  sheetOpen.value = false
}
</script>

<template>
  <DialogRoot v-model:open="sheetOpen">
    <DialogTrigger as-child>
      <button
        v-show="!rail.isEmpty.value"
        type="button"
        class="fab"
        aria-label="Open build"
      >
        <span class="fab-kicker">Build</span>
        <span class="fab-count">{{ rail.count.value }}/9</span>
      </button>
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="sheet-overlay" />
      <DialogContent class="sheet" @open-auto-focus.prevent>
        <VisuallyHidden>
          <DialogTitle>Build preview</DialogTitle>
        </VisuallyHidden>
        <div class="sheet-handle" aria-hidden="true" />
        <BuilderRail @expand="openFull" />
        <div class="sheet-actions">
          <DialogClose as-child>
            <button type="button" class="sheet-close">
              Close
            </button>
          </DialogClose>
          <button
            type="button"
            class="sheet-open"
            :disabled="rail.promoting.value || rail.isEmpty.value"
            @click="openFull"
          >
            {{ rail.promoting.value ? 'Loading…' : 'Open full builder' }}
            <span v-if="!rail.promoting.value" class="sheet-open-arrow" aria-hidden="true">→</span>
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
/* The FAB and sheet are a mobile-only affordance; desktop uses the inline rail. */
.fab {
  display: none;
}

@media (max-width: 900px) {
  .fab {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 80;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    padding: 10px 16px;
    background: color-mix(in oklch, var(--color-surface-hi) 94%, transparent);
    backdrop-filter: blur(12px);
    border: 1px solid color-mix(in oklch, var(--color-accent) 40%, transparent);
    border-radius: 12px;
    box-shadow:
      0 4px 24px oklch(0% 0 0 / 0.3),
      0 0 24px color-mix(in oklch, var(--color-accent) 16%, transparent);
    cursor: pointer;
  }
}
.fab-kicker {
  font: 500 9px/1 var(--font-mono);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-accent);
}
.fab-count {
  font: 700 16px/1 var(--font-display);
  color: var(--color-text);
}

.sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: oklch(0% 0 0 / 0.5);
  backdrop-filter: blur(2px);
}
.sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 91;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 10px 18px calc(18px + env(safe-area-inset-bottom));
  max-height: 86vh;
  overflow-y: auto;
  background: var(--color-surface);
  border-top: 1px solid color-mix(in oklch, var(--color-accent) 20%, var(--color-border));
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -8px 40px oklch(0% 0 0 / 0.4);
}
.sheet-handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--color-border);
  margin: 2px auto 4px;
  flex-shrink: 0;
}

.sheet-actions {
  display: flex;
  gap: 10px;
  position: sticky;
  bottom: 0;
}
.sheet-close,
.sheet-open {
  font: 600 13px/1 var(--font-display);
  letter-spacing: 0.01em;
  border-radius: 8px;
  padding: 12px 16px;
  cursor: pointer;
  min-height: 44px;
}
.sheet-close {
  color: var(--color-muted);
  background: var(--color-surface-hi);
  border: 1px solid var(--color-border);
}
.sheet-open {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--color-bg);
  background: var(--color-accent);
  border: 1px solid var(--color-accent);
}
.sheet-open:disabled {
  opacity: 0.55;
  cursor: default;
}
.sheet-open-arrow {
  font-size: 14px;
}

.sheet-enter-active {
  animation: sheet-up 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes sheet-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sheet-enter-active {
    animation: none;
  }
}
</style>
