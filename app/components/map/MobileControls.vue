<script setup lang="ts">
import { nextTick, ref } from 'vue'
import WorldPicker from '~/components/map/WorldPicker.vue'
import { useMapStore } from '~/stores/map'

const emit = defineEmits<{ openFilters: [] }>()
const store = useMapStore()
const open = ref(false)

function openFilters() {
  open.value = false
  emit('openFilters')
}

// ── Drag-to-dismiss ──────────────────────────────────────────────────────────

const sheetEl = ref<HTMLElement | null>(null)
const DISMISS_THRESHOLD = 80
// Disables Vue's Transition CSS during drag-dismiss so the element
// is removed instantly with no snap-then-slide glitch
const dragDismissing = ref(false)

let dragStartY = 0
let dragCurrent = 0
let dragging = false

function onDragStart(e: TouchEvent) {
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
    // Scale duration by remaining distance so it feels proportional
    const sheetHeight = el.offsetHeight || 300
    const remaining = Math.max(0, sheetHeight - dragCurrent)
    const duration = Math.max(80, Math.round((remaining / sheetHeight) * 220))

    el.style.transition = `transform ${duration}ms ease-in`
    el.style.transform = 'translateY(100%)'

    await new Promise(r => setTimeout(r, duration))

    // Disable Vue Transition CSS before closing so it removes the element
    // instantly — no reset-then-slide glitch
    dragDismissing.value = true
    open.value = false
    await nextTick()
    dragDismissing.value = false
  }
  else {
    // Snap back with spring easing
    el.style.transition = 'transform 250ms cubic-bezier(0.16,1,0.3,1)'
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
  <div class="pointer-events-auto md:hidden">
    <!-- FAB trigger -->
    <button
      type="button"
      class="fixed bottom-40 right-4 z-[500] flex h-11 w-11 items-center justify-center rounded-full bg-bg shadow-lg ring-1 ring-copper/30 transition-colors hover:bg-card"
      :aria-expanded="open"
      aria-label="Map controls"
      @click="open = true"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        aria-hidden="true"
        class="text-copper"
      >
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="18" x2="20" y2="18" />
        <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" />
        <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
        <circle cx="9" cy="18" r="2" fill="currentColor" stroke="none" />
      </svg>
    </button>

    <Teleport to="body">
      <!-- Backdrop -->
      <Transition
        enter-active-class="transition duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="open"
          class="fixed inset-0 z-[699] bg-bg/50 md:hidden"
          aria-hidden="true"
          @click="open = false"
        />
      </Transition>

      <!-- Bottom sheet — :css="false" during drag-dismiss skips the leave
           animation entirely so Vue removes the element immediately after
           the inline animation has already played from the drag position -->
      <Transition
        :css="!dragDismissing"
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="translate-y-full"
        enter-to-class="translate-y-0"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="translate-y-0"
        leave-to-class="translate-y-full"
      >
        <div
          v-if="open"
          ref="sheetEl"
          role="dialog"
          aria-label="Map controls"
          class="fixed inset-x-0 bottom-0 z-[700] rounded-t-2xl bg-bg pb-safe shadow-2xl ring-1 ring-copper/15 md:hidden"
        >
          <!-- Drag handle — touch target for drag-to-dismiss -->
          <div
            class="flex touch-none justify-center pb-1 pt-3"
            @touchstart.passive="onDragStart"
            @touchmove.passive="onDragMove"
            @touchend="onDragEnd"
          >
            <div class="h-1 w-10 rounded-full bg-border" aria-hidden="true" />
          </div>

          <!-- Header -->
          <div class="flex items-center justify-between px-5 pb-4 pt-2">
            <h2 class="text-sm font-semibold text-text">
              Map Controls
            </h2>
            <MapCloseBtn aria-label="Close map controls" @click="open = false" />
          </div>

          <!-- Controls -->
          <div class="flex flex-col gap-1 px-4 pb-6">
            <!-- Territories -->
            <button
              type="button"
              class="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-medium transition-colors"
              :class="
                store.showTerritories
                  ? 'bg-copper/10 text-copper'
                  : 'text-muted hover:bg-card hover:text-text'
              "
              @click="store.toggleTerritories()"
            >
              <span>Territories</span>
              <span
                class="h-2 w-2 rounded-full transition-colors"
                :class="store.showTerritories ? 'bg-copper' : 'bg-border'"
              />
            </button>

            <!-- World picker row -->
            <div class="flex items-center justify-between rounded-lg px-3 py-2.5">
              <span class="text-sm font-medium text-muted">World</span>
              <WorldPicker />
            </div>

            <!-- Divider -->
            <div class="my-1 border-t border-border" />

            <!-- Filters -->
            <button
              type="button"
              class="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-medium text-muted transition-colors hover:bg-card hover:text-text"
              @click="openFilters"
            >
              <span>Marker Filters</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
