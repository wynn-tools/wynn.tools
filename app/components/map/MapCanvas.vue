<script setup lang="ts">
import type { ImageOverlay, Map as LMap } from 'leaflet'
import type { Sprite } from 'pixi.js'
import type { PixiHandle } from '~/composables/usePixiOverlay'
import type { TerritoryLayerHandle } from '~/composables/useTerritoryLayer'
import type { MapFeature, TerritoryEntry } from '~/types/map'
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { renderCoordPin, repositionCoordPin } from '~/composables/useCoordPinLayer'
import { fitToLootrun, renderLootrun } from '~/composables/useLootrunLayer'
import { loadAllFeatures, loadMapsJson } from '~/composables/useMapData'
import { renderClusters, renderMarkers, rerenderPositions } from '~/composables/useMarkerLayer'
import { mountPixiOverlay } from '~/composables/usePixiOverlay'
import { loadCategoryTextures } from '~/composables/usePixiTextures'
import {
  isPlaceCategory,
  renderPlaceLabels,
  repositionPlaceLabels,
} from '~/composables/usePlaceLabels'
import { renderPlayerMarkers, repositionPlayerMarkers } from '~/composables/usePlayerLayer'
import { usePlayerLocations } from '~/composables/usePlayerLocations'
import { ensureTerritoryData } from '~/composables/useTerritoryData'
import {
  attachTerritoryLayer,
  detachTerritoryLayer,
  repositionTerritoryLayer,

} from '~/composables/useTerritoryLayer'
import {
  attach2DTiles,
  detachOverlays,
  entriesForWorld,
  tileToLatLngBounds,
} from '~/composables/useTileLayer'
import { getWorld } from '~/config/worlds'
import { useMapStore } from '~/stores/map'

const emit = defineEmits<{
  ready: [map: LMap]
  featureClick: [featureId: string, screenPos: { x: number, y: number }]
  territoryClick: [territory: TerritoryEntry, screenPos: { x: number, y: number }]
  mapClick: []
  cursorMove: [pos: { x: number, z: number }]
}>()
const containerRef = ref<HTMLDivElement | null>(null)
const lmap = shallowRef<LMap | null>(null)
const pixi = shallowRef<PixiHandle | null>(null)
const overlays = shallowRef<ImageOverlay[]>([])
const allFeatures = shallowRef<MapFeature[]>([])
const sprites = shallowRef<Map<string, Sprite>>(new Map())
const territoryHandle = shallowRef<TerritoryLayerHandle | null>(null)
const territoryData = shallowRef<TerritoryEntry[]>([])
let territoryRefreshInterval: ReturnType<typeof setInterval> | null = null
let territoryClickPending = false
let pixiHandledClick = false
const store = useMapStore()
const { players } = usePlayerLocations()
let zoomSyncing = false
let centerSyncing = false
let playerRenderInFlight = false

async function rebuildClusters() {
  const map = lmap.value
  const p = pixi.value
  if (!map || !p)
    return
  await renderClusters(
    map,
    p.layers.clusters,
    allFeatures.value,
    {
      activeWorld: store.world,
      enabledCategories: store.enabledCategories,
      zoom: store.zoom,
      levelRange: store.levelRange,
    },
    (featureId, screenPos) => {
      pixiHandledClick = true
      setTimeout(() => {
        pixiHandledClick = false
      }, 0)
      emit('featureClick', featureId, screenPos)
    },
    (worldX, worldZ) => {
      const targetZoom = Math.min(map.getZoom() + 2, 4)
      centerSyncing = true
      zoomSyncing = true
      map.flyTo([-worldZ, worldX], targetZoom, { duration: 0.5 })
      map.once('moveend', () => {
        centerSyncing = false
        zoomSyncing = false
      })
    },
  )
  p.layers.clusters.visible = !store.showTerritories
}

async function reseedMarkers() {
  const map = lmap.value
  const p = pixi.value
  if (!map || !p)
    return
  // Place categories render as text labels, everything else as icon sprites
  const nonPlaceFeatures = allFeatures.value.filter(f => !isPlaceCategory(f.categoryId))
  sprites.value = await renderMarkers(
    map,
    p.layers.markers,
    nonPlaceFeatures,
    {
      activeWorld: store.world,
      enabledCategories: store.enabledCategories,
      zoom: store.zoom,
      levelRange: store.levelRange,
    },
    (featureId, screenPos) => {
      pixiHandledClick = true
      setTimeout(() => {
        pixiHandledClick = false
      }, 0)
      emit('featureClick', featureId, screenPos)
    },
  )
  await renderPlaceLabels(
    map,
    p.layers.focus,
    allFeatures.value,
    { activeWorld: store.world, enabledCategories: store.enabledCategories, zoom: store.zoom },
    (featureId, screenPos) => {
      pixiHandledClick = true
      setTimeout(() => {
        pixiHandledClick = false
      }, 0)
      emit('featureClick', featureId, screenPos)
    },
  )
  await rebuildClusters()
  // Respect territory mode — markers/clusters/focus are hidden while territories are active
  if (store.showTerritories) {
    p.layers.markers.visible = false
    p.layers.clusters.visible = false
    p.layers.focus.visible = false
  }
  p.redraw()
}

async function refreshLayer() {
  const map = lmap.value
  if (!map)
    return
  detachOverlays(overlays.value)
  overlays.value = []
  const world = getWorld(store.world)
  const entries = await loadMapsJson()
  overlays.value = await attach2DTiles(map, entriesForWorld(entries, world))
}

onMounted(async () => {
  if (!containerRef.value)
    return

  const container = containerRef.value as any as HTMLElement
  const L = await import('leaflet')
  const world = getWorld(store.world)
  const b = tileToLatLngBounds(world.bounds)
  const map = L.map(container, {
    crs: L.CRS.Simple,
    minZoom: world.minZoom,
    maxZoom: world.maxZoom,
    zoomControl: false,
    attributionControl: false,
    preferCanvas: true,
    maxBounds: [
      [b.southWest.lat, b.southWest.lng],
      [b.northEast.lat, b.northEast.lng],
    ],
    maxBoundsViscosity: 1.0,
  })
  map.setView([-store.center.z, store.center.x], store.zoom)
  map.on('click', () => {
    if (pixiHandledClick)
      return
    if (territoryClickPending) {
      territoryClickPending = false
      return
    }
    emit('mapClick')
  })
  map.on('mousemove', (e) => {
    emit('cursorMove', { x: Math.round(e.latlng.lng), z: Math.round(-e.latlng.lat) })
  })
  // Redraw on every move frame so container-point sprites/labels track the map during pan
  map.on('move', () => {
    // Touch devices: emit map center so CoordReadout updates during pan (no mousemove on touch)
    if (window.matchMedia('(hover: none)').matches) {
      const c = map.getCenter()
      emit('cursorMove', { x: Math.round(c.lng), z: Math.round(-c.lat) })
    }
    if (pixi.value) {
      rerenderPositions(lmap.value!, sprites.value, allFeatures.value)
      repositionPlaceLabels(lmap.value!, pixi.value.layers.focus, allFeatures.value)
      repositionPlayerMarkers(lmap.value!, pixi.value.layers.players)
      if (store.lootrun)
        renderLootrun(lmap.value!, pixi.value.layers.lootrun, store.lootrun)
      // Hide cluster bubbles during pan — they'll be rebuilt correctly on moveend
      pixi.value.layers.clusters.visible = false
      if (store.showTerritories && territoryHandle.value) {
        repositionTerritoryLayer(lmap.value!, territoryHandle.value)
      }
      repositionCoordPin(lmap.value!, pixi.value.layers.coordPin, store.coordPin)
      pixi.value.redraw()
    }
  })
  map.on('moveend zoomend', () => {
    const c = map.getCenter()
    centerSyncing = true
    store.setCenter(c.lng, -c.lat)
    centerSyncing = false
    zoomSyncing = true
    store.setZoom(map.getZoom())
    zoomSyncing = false
    const b = map.getBounds()
    store.setViewBounds({ x1: b.getWest(), z1: -b.getNorth(), x2: b.getEast(), z2: -b.getSouth() })
    if (pixi.value) {
      rerenderPositions(lmap.value!, sprites.value, allFeatures.value)
      repositionPlayerMarkers(lmap.value!, pixi.value.layers.players)
      rebuildClusters()
      pixi.value.redraw()
    }
    if (store.lootrun && pixi.value) {
      renderLootrun(lmap.value!, pixi.value.layers.lootrun, store.lootrun)
      pixi.value.redraw()
    }
    if (store.showTerritories && pixi.value && territoryData.value.length) {
      const p = pixi.value
      const m = lmap.value!
      const data = territoryData.value
      const cb = (t: TerritoryEntry, pos: { x: number, y: number }) => {
        territoryClickPending = true
        emit('territoryClick', t, pos)
      }
      attachTerritoryLayer(m, p.layers.territories, data, cb).then((handle) => {
        if (!pixi.value)
          return
        territoryHandle.value = handle
        p.redraw()
      })
    }
  })
  lmap.value = map
  const ib = map.getBounds()
  store.setViewBounds({
    x1: ib.getWest(),
    z1: -ib.getNorth(),
    x2: ib.getEast(),
    z2: -ib.getSouth(),
  })
  await refreshLayer()
  emit('ready', map)
  pixi.value = await mountPixiOverlay(map)
  await loadCategoryTextures()
  const featureData = await loadAllFeatures()
  allFeatures.value = [...featureData.places, ...featureData.content, ...featureData.services]
  await reseedMarkers()
  await renderPlayerMarkers(map, pixi.value!.layers.players, players.value)
  pixi.value!.redraw()
})

watch(
  () => store.world,
  async (id) => {
    const map = lmap.value
    if (!map)
      return
    const world = getWorld(id)
    const b = tileToLatLngBounds(world.bounds)
    map.setMaxBounds([
      [b.southWest.lat, b.southWest.lng],
      [b.northEast.lat, b.northEast.lng],
    ])
    map.setMinZoom(world.minZoom)
    map.setMaxZoom(world.maxZoom)
    const center = {
      x: (world.bounds.x1 + world.bounds.x2) / 2,
      z: (world.bounds.z1 + world.bounds.z2) / 2,
    }
    map.setView([-center.z, center.x], world.nativeZoom)
    await refreshLayer()
  },
)

// Fly the Leaflet map when store.center changes programmatically (e.g. from search or focus).
// Guard against the feedback loop where moveend writes back to the store.
watch(
  () => ({ x: store.center.x, z: store.center.z }),
  ({ x, z }) => {
    const map = lmap.value
    if (!map || centerSyncing)
      return
    const cur = map.getCenter()
    // Only fly if meaningfully different (>1 block) to avoid moveend feedback loop
    if (Math.abs(cur.lng - x) > 1 || Math.abs(-cur.lat - z) > 1) {
      centerSyncing = true
      map.flyTo([-z, x], Math.max(map.getZoom(), 2), { duration: 0.6 })
      map.once('moveend', () => {
        centerSyncing = false
      })
    }
  },
)

// Watch enabledCategories as a joined string so in-place mutations (splice/push) are detected
watch(
  () =>
    [
      store.world,
      store.enabledCategories.join(','),
      store.zoom,
      store.levelRange?.join(',') ?? '',
    ] as const,
  reseedMarkers,
)

watch(
  () => store.zoom,
  (z) => {
    const map = lmap.value
    if (!map || zoomSyncing)
      return
    zoomSyncing = true
    map.setZoom(z)
    zoomSyncing = false
  },
)

watch(players, async () => {
  if (playerRenderInFlight)
    return
  const map = lmap.value
  const p = pixi.value
  if (!map || !p)
    return
  playerRenderInFlight = true
  try {
    await renderPlayerMarkers(map, p.layers.players, players.value)
    p.redraw()
  }
  finally {
    playerRenderInFlight = false
  }
})

watch(
  () => store.lootrun,
  async (lr, prev) => {
    const map = lmap.value
    const p = pixi.value
    if (!map || !p)
      return

    await renderLootrun(map, p.layers.lootrun, lr)
    p.redraw()
    if (lr && !prev)
      fitToLootrun(map, lr)
  },
)

watch(
  () => store.showTerritories,
  async (active) => {
    const map = lmap.value
    const p = pixi.value
    if (!map || !p)
      return
    p.layers.markers.visible = !active
    p.layers.clusters.visible = !active
    p.layers.focus.visible = !active
    detachTerritoryLayer(p.layers.territories)
    territoryHandle.value = null
    if (territoryRefreshInterval !== null) {
      clearInterval(territoryRefreshInterval)
      territoryRefreshInterval = null
    }
    if (active) {
      const cb = (t: TerritoryEntry, pos: { x: number, y: number }) => {
        territoryClickPending = true
        emit('territoryClick', t, pos)
      }
      try {
        const data = await ensureTerritoryData()
        territoryData.value = data
        territoryHandle.value = await attachTerritoryLayer(map, p.layers.territories, data, cb)
        p.redraw()
        territoryRefreshInterval = setInterval(
          async () => {
            if (!lmap.value || !store.showTerritories || !pixi.value)
              return
            try {
              const fresh = await ensureTerritoryData()
              if (!lmap.value || !store.showTerritories || !pixi.value)
                return
              territoryData.value = fresh
              detachTerritoryLayer(pixi.value.layers.territories)
              territoryHandle.value = await attachTerritoryLayer(
                lmap.value,
                pixi.value.layers.territories,
                fresh,
                cb,
              )
              pixi.value.redraw()
            }
            catch {
              // network failure on refresh — keep showing stale data
            }
          },
          5.1 * 60 * 1000,
        )
      }
      catch {
        // network failure on initial load — toggle stays visually active but layer is empty
        store.showTerritories = false
      }
    }
    else {
      p.redraw()
    }
  },
)

watch(
  () => store.coordPin,
  async (pin) => {
    const map = lmap.value
    const p = pixi.value
    if (!map || !p)
      return
    await renderCoordPin(map, p.layers.coordPin, pin)
    p.redraw()
  },
)

onBeforeUnmount(() => {
  if (territoryRefreshInterval !== null)
    clearInterval(territoryRefreshInterval)
  pixi.value?.destroy()
  pixi.value = null
  lmap.value?.remove()
  lmap.value = null
})

defineExpose({ map: lmap, pixi })
</script>

<template>
  <div ref="containerRef" class="h-full w-full pixelated" />
</template>
