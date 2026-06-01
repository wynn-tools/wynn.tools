import type { Map as LMap } from 'leaflet'
import type { Container, Graphics } from 'pixi.js'
import type { WorldEvent } from '~/types/map'
import { worldToLatLng } from '~/composables/useMapProjection'

interface WorldEventDot extends Graphics {
  __world?: { x: number, z: number }
}

export async function renderWorldEvents(
  map: LMap,
  container: Container,
  events: WorldEvent[],
  onClick: (event: WorldEvent) => void,
) {
  const { Graphics } = await import('pixi.js')
  container.removeChildren().forEach(c => c.destroy({ children: true }))

  for (const event of events) {
    for (const loc of event.location) {
      const ll = worldToLatLng(loc.event)
      const pt = map.latLngToContainerPoint([ll.lat, ll.lng])

      const dot = new Graphics() as WorldEventDot
      dot.circle(0, 0, 6).fill({ color: 0x6B9BFF, alpha: 0.95 }).stroke({ color: 0xFFFFFF, width: 1, alpha: 0.6 })
      dot.position.set(pt.x, pt.y)
      dot.eventMode = 'static'
      dot.cursor = 'pointer'
      dot.on('pointertap', (e) => {
        e.stopPropagation()
        e.nativeEvent?.stopPropagation()
        onClick(event)
      })
      dot.__world = { x: loc.event.x, z: loc.event.z }
      container.addChild(dot)
    }
  }
}

export function repositionWorldEvents(map: LMap, container: Container) {
  for (const child of container.children) {
    const w = (child as WorldEventDot).__world
    if (!w)
      continue
    const ll = worldToLatLng({ x: w.x, y: 0, z: w.z })
    const pt = map.latLngToContainerPoint([ll.lat, ll.lng])
    child.position.set(pt.x, pt.y)
  }
}
