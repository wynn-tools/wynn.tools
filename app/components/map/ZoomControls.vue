<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{ zoomIn: [], zoomOut: [] }>()

const inKey = ref<number | null>(null)
const outKey = ref<number | null>(null)

function handleZoomIn() {
  emit('zoomIn')
  inKey.value = (inKey.value ?? -1) + 1
}
function handleZoomOut() {
  emit('zoomOut')
  outKey.value = (outKey.value ?? -1) + 1
}
</script>

<template>
  <div
    class="flex flex-col overflow-hidden rounded-md bg-bg/90 ring-1 ring-copper/20 backdrop-blur"
  >
    <button
      type="button"
      class="relative px-3 py-2 text-base font-light leading-none text-copper transition-colors hover:bg-copper/10"
      aria-label="Zoom in"
      @click="handleZoomIn"
    >
      +
      <span v-if="inKey !== null" :key="inKey" class="ring-pulse" aria-hidden="true" />
    </button>
    <div class="border-t border-copper/10" />
    <button
      type="button"
      class="relative px-3 py-2 text-base font-light leading-none text-copper transition-colors hover:bg-copper/10"
      aria-label="Zoom out"
      @click="handleZoomOut"
    >
      −
      <span v-if="outKey !== null" :key="outKey" class="ring-pulse" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.ring-pulse {
  position: absolute;
  inset: 0;
  pointer-events: none;
  animation: ring-pulse 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes ring-pulse {
  0% {
    box-shadow: 0 0 0 0 oklch(62% 0.11 245 / 0.5);
  }
  100% {
    box-shadow: 0 0 0 9px oklch(62% 0.11 245 / 0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .ring-pulse {
    animation: none;
  }
}
</style>
