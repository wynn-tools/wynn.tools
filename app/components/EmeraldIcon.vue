<script setup lang="ts">
import type { EmeraldUnit } from '~/lib/market/format-emeralds'

const props = withDefaults(defineProps<{
  unit: EmeraldUnit
  size?: number | string
}>(), { size: '1em' })

const SRC: Record<EmeraldUnit, string> = {
  e: '/assets/currency/E.png',
  eb: '/assets/currency/EB.png',
  le: '/assets/currency/LE.png',
  stx: '/assets/currency/STX.png',
}

const LABEL: Record<EmeraldUnit, string> = {
  e: 'emerald',
  eb: 'emerald block',
  le: 'liquid emerald',
  stx: 'stack of liquid emeralds',
}

const dim = computed(() => typeof props.size === 'number' ? `${props.size}px` : props.size)
</script>

<template>
  <img
    :src="SRC[unit]"
    :alt="LABEL[unit]"
    :style="{ width: dim, height: dim }"
    class="emerald-icon"
    draggable="false"
  >
</template>

<style scoped>
.emerald-icon {
  display: inline-block;
  vertical-align: -0.18em;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  flex-shrink: 0;
  user-select: none;
}
</style>
