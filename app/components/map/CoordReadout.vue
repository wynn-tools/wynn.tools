<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{ x: number, z: number }>()

function toDigits(n: number): string[] {
  return String(Math.round(n)).split('')
}

const xDigits = computed(() => toDigits(props.x))
const zDigits = computed(() => toDigits(props.z))

const copied = ref(false)

function copyCoords() {
  navigator.clipboard.writeText(`${Math.round(props.x)}, ${Math.round(props.z)}`).then(() => {
    copied.value = true
    setTimeout(() => (copied.value = false), 1400)
  })
}
</script>

<template>
  <button
    type="button"
    class="group relative cursor-pointer rounded-md bg-bg/90 px-3 py-2 ring-1 ring-copper/20 backdrop-blur transition-colors hover:bg-bg hover:ring-copper/40"
    :aria-label="`Coordinates: X ${Math.round(x)}, Z ${Math.round(z)}. Click to copy.`"
    @click="copyCoords"
  >
    <!-- Coords (fade out when copied) -->
    <div :class="copied ? 'opacity-0' : 'opacity-100'" class="transition-opacity duration-150">
      <div class="coord-row">
        <span class="coord-axis" aria-hidden="true">X</span>
        <span class="coord-val">
          <span v-for="(d, i) in xDigits" :key="`x${i}:${d}`" class="digit">{{ d }}</span>
        </span>
      </div>
      <div class="coord-sep" aria-hidden="true" />
      <div class="coord-row">
        <span class="coord-axis" aria-hidden="true">Z</span>
        <span class="coord-val">
          <span v-for="(d, i) in zDigits" :key="`z${i}:${d}`" class="digit">{{ d }}</span>
        </span>
      </div>
    </div>

    <!-- Copied confirmation overlay -->
    <div
      :class="copied ? 'opacity-100' : 'opacity-0'"
      class="absolute inset-0 flex items-center justify-center gap-1.5 transition-opacity duration-150"
      aria-hidden="true"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="text-copper"
      >
        <path d="M2 6l3 3 5-5" />
      </svg>
      <span class="text-xs font-semibold text-copper">Copied</span>
    </div>

    <!-- Hover hint -->
    <span
      class="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-muted/50 opacity-0 transition-opacity group-hover:opacity-100"
      aria-hidden="true"
    >
      click to copy
    </span>
  </button>
</template>

<style scoped>
.coord-row {
  display: flex;
  align-items: baseline;
  gap: 0.45rem;
  font-size: 0.75rem;
  letter-spacing: 0.03em;
}
.coord-sep {
  height: 1px;
  background: oklch(62% 0.11 245 / 0.12);
  margin: 3px 0;
}
.coord-axis {
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: oklch(62% 0.11 245 / 0.6);
  width: 0.75rem;
  flex-shrink: 0;
  user-select: none;
}
.coord-val {
  display: flex;
  font-variant-numeric: tabular-nums;
  color: rgb(237 245 232);
  font-weight: 600;
}
.digit {
  display: inline-block;
  min-width: 0.55em;
  text-align: center;
  animation: digit-rise 0.07s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes digit-rise {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .digit {
    animation: none;
  }
}
</style>
