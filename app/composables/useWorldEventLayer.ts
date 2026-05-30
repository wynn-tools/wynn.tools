import type { Map as LMap } from 'leaflet'
import type { Ref } from 'vue'
import type { WorldEvent } from '~/types/map'
import { onUnmounted, watch } from 'vue'
import { worldToLatLng } from '~/composables/useMapProjection'

export function useWorldEventLayer(
  map: Ref<LMap | null>,
  events: Ref<WorldEvent[]>,
  onMarkerClick: (event: WorldEvent) => void,
) {
  let layerGroup: import('leaflet').LayerGroup | null = null

  async function render() {
    const L = await import('leaflet')
    const lmap = map.value
    if (!lmap)
      return

    if (layerGroup) {
      layerGroup.clearLayers()
    }
    else {
      layerGroup = L.layerGroup().addTo(lmap)
    }

    const icon = L.divIcon({
      className: '',
      html: '<div class="world-event-marker"></div>',
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    })

    for (const event of events.value) {
      for (const loc of event.location) {
        const ll = worldToLatLng(loc.event)
        const marker = L.marker([ll.lat, ll.lng], { icon })
        marker.on('click', (e) => {
          e.originalEvent?.stopPropagation()
          onMarkerClick(event)
        })
        layerGroup.addLayer(marker)
      }
    }
  }

  watch([map, events], render)

  onUnmounted(() => {
    layerGroup?.remove()
    layerGroup = null
  })
}
