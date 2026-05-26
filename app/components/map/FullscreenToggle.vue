<script setup lang="ts">
import { useMapStore } from '~/stores/map'

const store = useMapStore()

function toggle() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  }
  else {
    document.exitFullscreen()
  }
}
</script>

<template>
  <button
    type="button"
    class="rounded-md bg-bg/90 p-2 text-copper ring-1 ring-copper/20 backdrop-blur hover:bg-bg"
    :aria-pressed="store.fs"
    :title="store.fs ? 'Exit fullscreen' : 'Enter fullscreen'"
    @click="toggle"
  >
    <svg v-if="!store.fs" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" stroke="currentColor" stroke-width="1.5" />
    </svg>
    <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 2v4H2M10 2v4h4M6 14v-4H2M10 14v-4h4" stroke="currentColor" stroke-width="1.5" />
    </svg>
  </button>
</template>
