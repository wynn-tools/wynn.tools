<script setup lang="ts">
import { HoverCardContent, HoverCardPortal, HoverCardRoot, HoverCardTrigger } from 'reka-ui'

withDefaults(defineProps<{
  side?: 'top' | 'right' | 'bottom' | 'left'
  sideOffset?: number
  align?: 'start' | 'center' | 'end'
  avoidCollisions?: boolean
  openDelay?: number
  closeDelay?: number
  /** Suppress the popper entirely (no preview to show). Trigger still renders. */
  disabled?: boolean
  /** Skip the zoom: 0.7 scale wrapper (use when the preview is already compact). */
  unscaled?: boolean
}>(), {
  side: 'right',
  sideOffset: 8,
  align: 'start',
  avoidCollisions: true,
  openDelay: 120,
  closeDelay: 0,
  disabled: false,
  unscaled: false,
})

const emit = defineEmits<{ openChange: [open: boolean] }>()
</script>

<template>
  <HoverCardRoot
    :open-delay="openDelay"
    :close-delay="closeDelay"
    @update:open="o => emit('openChange', o)"
  >
    <HoverCardTrigger as-child>
      <slot name="trigger" />
    </HoverCardTrigger>
    <HoverCardPortal v-if="!disabled">
      <HoverCardContent
        :side="side"
        :side-offset="sideOffset"
        :align="align"
        :avoid-collisions="avoidCollisions"
        class="quickview-content"
      >
        <div :class="unscaled ? null : 'quickview-scale'">
          <slot />
        </div>
      </HoverCardContent>
    </HoverCardPortal>
  </HoverCardRoot>
</template>

<style scoped>
.quickview-scale {
  zoom: 0.7;
}
</style>

<style>
/* Hover quickviews are a desktop affordance. On touch a tap fires it stuck
   open and blocks the underlying tap target. Portaled — must live unscoped. */
@media (hover: none), (pointer: coarse) {
  .quickview-content {
    display: none !important;
  }
}
</style>
