<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const props = defineProps<{
  screenPos: { x: number, y: number } | null
}>()

function tooltipStyle(): Record<string, string> {
  if (!props.screenPos)
    return {}
  const { x, y } = props.screenPos
  const vw = typeof window !== 'undefined' ? window.innerWidth : 800
  const top = `${Math.max(8, y - 8)}px`

  // Right 45% of viewport: anchor at click, grow leftward via transform
  // so popup stays in bounds regardless of its actual width
  if (x > vw * 0.55) {
    return { left: `${x}px`, top, transform: 'translateX(calc(-100% - 12px))' }
  }
  return { left: `${x + 12}px`, top }
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-100 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="screenPos"
      v-bind="$attrs"
      class="pointer-events-auto absolute z-[600] rounded-md bg-bg/95 p-3 text-xs shadow-lg ring-1 ring-copper/20 backdrop-blur"
      :style="tooltipStyle()"
    >
      <slot />
    </div>
  </Transition>
</template>
