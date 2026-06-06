<script setup lang="ts">
import { nextTick, ref } from 'vue'

const props = withDefaults(defineProps<{
  title?: string
  ariaLabel?: string
  dragDismiss?: boolean
  showClose?: boolean
  maxHeight?: string
}>(), {
  dragDismiss: true,
  showClose: true,
  maxHeight: '85vh',
})

const open = defineModel<boolean>({ required: true })

const sheetEl = ref<HTMLElement | null>(null)

// Disable Vue Transition CSS during drag-dismiss so the element is removed
// instantly after the inline animation finishes — no reset-then-slide glitch.
const dragDismissing = ref(false)

const DISMISS_THRESHOLD = 80
let dragStartY = 0
let dragCurrent = 0
let dragging = false

function onDragStart(e: TouchEvent) {
  if (!props.dragDismiss)
    return
  dragStartY = e.touches[0]!.clientY
  dragCurrent = 0
  dragging = true
}

function onDragMove(e: TouchEvent) {
  if (!dragging || !sheetEl.value)
    return
  const dy = e.touches[0]!.clientY - dragStartY
  if (dy < 0)
    return
  dragCurrent = dy
  sheetEl.value.style.transform = `translateY(${dy}px)`
  sheetEl.value.style.transition = 'none'
}

async function onDragEnd() {
  if (!dragging || !sheetEl.value)
    return
  dragging = false
  const el = sheetEl.value

  if (dragCurrent >= DISMISS_THRESHOLD) {
    // Scale dismiss duration to remaining distance so it feels proportional.
    const sheetHeight = el.offsetHeight || 300
    const remaining = Math.max(0, sheetHeight - dragCurrent)
    const duration = Math.max(80, Math.round((remaining / sheetHeight) * 220))

    el.style.transition = `transform ${duration}ms ease-in`
    el.style.transform = 'translateY(100%)'

    await new Promise(r => setTimeout(r, duration))

    dragDismissing.value = true
    open.value = false
    await nextTick()
    dragDismissing.value = false
  }
  else {
    // Snap back with spring easing.
    el.style.transition = 'transform 250ms cubic-bezier(0.16, 1, 0.3, 1)'
    el.style.transform = 'translateY(0)'
    el.addEventListener(
      'transitionend',
      () => {
        el.style.transform = ''
        el.style.transition = ''
      },
      { once: true },
    )
  }

  dragCurrent = 0
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="bs-scrim-enter-active"
      leave-active-class="bs-scrim-leave-active"
      enter-from-class="bs-scrim-from"
      leave-to-class="bs-scrim-from"
    >
      <div
        v-if="open"
        class="bs-scrim"
        aria-hidden="true"
        @click="open = false"
      />
    </Transition>

    <Transition
      :css="!dragDismissing"
      enter-active-class="bs-sheet-enter-active"
      leave-active-class="bs-sheet-leave-active"
      enter-from-class="bs-sheet-from"
      leave-to-class="bs-sheet-from"
    >
      <div
        v-if="open"
        ref="sheetEl"
        role="dialog"
        aria-modal="true"
        :aria-label="ariaLabel ?? title"
        class="bs-sheet"
        :style="{ maxHeight }"
      >
        <div
          class="bs-handle-area"
          @touchstart.passive="onDragStart"
          @touchmove.passive="onDragMove"
          @touchend="onDragEnd"
          @touchcancel="onDragEnd"
        >
          <div class="bs-handle" aria-hidden="true" />
        </div>

        <div
          v-if="title || $slots['header-actions'] || showClose"
          class="bs-header"
        >
          <h2 v-if="title" class="bs-title">
            {{ title }}
          </h2>
          <div class="bs-header-actions">
            <slot name="header-actions" />
            <button
              v-if="showClose"
              type="button"
              class="bs-close"
              aria-label="Close"
              @click="open = false"
            >
              <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
                <path d="M1 1l10 10M11 1L1 11" />
              </svg>
            </button>
          </div>
        </div>

        <div class="bs-body">
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.bs-scrim {
  position: fixed;
  inset: 0;
  z-index: 699;
  background: oklch(0% 0 0 / 0.5);
  backdrop-filter: blur(1px);
}
.bs-scrim-enter-active {
  transition: opacity 0.2s ease-out;
}
.bs-scrim-leave-active {
  transition: opacity 0.15s ease-in;
}
.bs-scrim-from {
  opacity: 0;
}

.bs-sheet {
  position: fixed;
  inset-inline: 0;
  bottom: 0;
  z-index: 700;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  border-top: 1px solid var(--color-border);
  box-shadow: 0 -16px 48px oklch(0% 0 0 / 0.4);
  padding-bottom: env(safe-area-inset-bottom, 0);
  overscroll-behavior: contain;
}
.bs-sheet-enter-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.bs-sheet-leave-active {
  transition: transform 0.2s ease-in;
}
.bs-sheet-from {
  transform: translateY(100%);
}

.bs-handle-area {
  display: flex;
  justify-content: center;
  padding: 10px 0 4px;
  touch-action: none;
  flex-shrink: 0;
}
.bs-handle {
  width: 40px;
  height: 4px;
  border-radius: 999px;
  background: var(--color-border);
}

.bs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 20px 12px;
  flex-shrink: 0;
}
.bs-title {
  font: 600 13px/1 var(--font-mono, inherit);
  letter-spacing: 0.04em;
  color: var(--color-text);
  margin: 0;
}
.bs-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}
.bs-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 6px;
  color: var(--color-muted);
  background: transparent;
  cursor: pointer;
  transition:
    color 0.12s ease-out,
    background 0.12s ease-out;
}
.bs-close:hover {
  color: var(--color-accent);
  background: color-mix(in oklch, var(--color-accent) 10%, transparent);
}
.bs-close:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.bs-body {
  overflow-y: auto;
  padding: 0 20px 24px;
  flex: 1;
  min-height: 0;
  -webkit-overflow-scrolling: touch;
}
</style>
