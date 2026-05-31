<script setup lang="ts">
import { useToast } from '~/composables/useToast'

const { toasts } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="toasts" aria-live="polite" aria-atomic="false">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="toast"
          :class="{ 'toast--error': t.kind === 'error' }"
          role="status"
        >
          <span class="toast-msg">{{ t.msg }}</span>
          <button v-if="t.action" type="button" class="toast-action" @click="t.action.run()">
            {{ t.action.label }}
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toasts {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
  width: max-content;
  max-width: min(92vw, 460px);
}

.toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 9px 9px 9px 14px;
  background: color-mix(in oklch, var(--color-surface-hi) 94%, transparent);
  backdrop-filter: blur(12px);
  border-radius: 8px;
  box-shadow:
    0 4px 24px oklch(0% 0 0 / 0.3),
    inset 0 0 0 1px color-mix(in oklch, var(--color-accent) 20%, transparent);
  color: var(--color-text);
  font: 400 13px/1.4 var(--font-body);
}

.toast--error {
  box-shadow:
    0 4px 24px oklch(0% 0 0 / 0.3),
    inset 0 0 0 1px color-mix(in oklch, oklch(62% 0.15 20) 36%, transparent);
}

.toast-msg {
  min-width: 0;
}

.toast-action {
  flex-shrink: 0;
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-accent);
  background: color-mix(in oklch, var(--color-accent) 8%, transparent);
  border: none;
  border-radius: 5px;
  padding: 7px 12px;
  cursor: pointer;
  transition:
    background 0.12s ease-out,
    box-shadow 0.12s ease-out;
}

.toast-action:hover {
  background: color-mix(in oklch, var(--color-accent) 16%, transparent);
}

.toast-action:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s ease-out,
    transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active {
    transition: none;
  }
}
</style>
