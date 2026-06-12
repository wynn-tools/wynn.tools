<script setup lang="ts">
import type { Map as LMap } from 'leaflet'
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { loadMapsJson } from '~/composables/useMapData'
import { attach2DTiles, detachOverlays, entriesForWorld } from '~/composables/useTileLayer'
import { getWorld } from '~/config/worlds'

const props = withDefaults(defineProps<{ x: number, z: number, zoom?: number }>(), {
  zoom: 1,
})

const containerRef = ref<HTMLDivElement | null>(null)
const lmap = shallowRef<LMap | null>(null)

async function mount() {
  if (!containerRef.value)
    return
  const L = await import('leaflet')
  const map = L.map(containerRef.value, {
    crs: L.CRS.Simple,
    minZoom: -3,
    maxZoom: 4,
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    touchZoom: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    tap: false,
    inertia: false,
  })
  map.setView([-props.z, props.x], props.zoom)
  lmap.value = map
  const entries = await loadMapsJson()
  const overlays = await attach2DTiles(map, entriesForWorld(entries, getWorld('main')))
  const pinIcon = L.divIcon({
    className: 'we-pin',
    html: '<span class="we-pin__dot"></span>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
  L.marker([-props.z, props.x], { icon: pinIcon, interactive: false }).addTo(map)
  onBeforeUnmount(() => {
    detachOverlays(overlays)
    map.remove()
  })
}

onMounted(mount)

watch(() => [props.x, props.z, props.zoom] as const, ([x, z, zoom]) => {
  lmap.value?.setView([-z, x], zoom)
})
</script>

<template>
  <div ref="containerRef" class="map-thumb" aria-hidden="true" />
</template>

<style scoped>
.map-thumb {
  position: relative;
  width: 100%;
  height: 180px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  isolation: isolate;
}
:deep(.leaflet-container) {
  background: var(--color-bg);
}
:deep(.pixelated) {
  image-rendering: pixelated;
}
:deep(.we-pin__dot) {
  display: block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-accent);
  border: 2px solid var(--color-bg);
  box-shadow:
    0 0 0 2px var(--color-accent),
    0 0 12px var(--color-accent);
}
</style>
