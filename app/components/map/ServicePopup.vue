<script setup lang="ts">
import type { MapFeature } from '~/types/map'
import { computed } from 'vue'
import { getCategory } from '~/config/categories'

const props = defineProps<{
  feature: MapFeature | null
  screenPos: { x: number, y: number } | null
}>()
const emit = defineEmits<{ close: [] }>()

const label = computed(() => (props.feature ? getCategory(props.feature.categoryId)?.label : ''))

function copyCoords() {
  if (!props.feature)
    return
  const { x, y, z } = props.feature.location
  navigator.clipboard.writeText(`${x}, ${y}, ${z}`)
}
</script>

<template>
  <MapTooltip v-if="feature" :screen-pos="screenPos">
    <div class="mb-1 font-medium text-copper">
      {{ label }}
    </div>
    <div class="text-muted">
      {{ feature.location.x }}, {{ feature.location.y }}, {{ feature.location.z }}
    </div>
    <div class="mt-1.5 flex items-center gap-1">
      <button
        type="button"
        class="rounded bg-copper/10 px-2 py-0.5 text-copper transition-colors hover:bg-copper/20"
        @click="copyCoords"
      >
        Copy
      </button>
      <MapCloseBtn aria-label="Close" @click="emit('close')" />
    </div>
  </MapTooltip>
</template>
