import type { Map as LMap } from 'leaflet'
import type { Container } from 'pixi.js'
import { worldToLatLng } from '~/composables/useMapProjection'

export async function renderCoordPin(
  map: LMap,
  container: Container,
  pin: { x: number, z: number } | null,
) {
  container.removeChildren()
  if (!pin)
    return

  const { Graphics } = await import('pixi.js')
  const ll = worldToLatLng({ x: pin.x, y: 64, z: pin.z })
  const pt = map.latLngToContainerPoint([ll.lat, ll.lng])

  const g = new Graphics()
  g.position.set(pt.x, pt.y)

  // Outer ring
  g.setStrokeStyle({ width: 2, color: 0xC47B3A, alpha: 0.9 })
  g.circle(0, 0, 10)
  g.stroke()

  // Crosshair lines
  g.setStrokeStyle({ width: 1.5, color: 0xC47B3A, alpha: 0.9 })
  g.moveTo(-6, 0)
  g.lineTo(6, 0)
  g.moveTo(0, -6)
  g.lineTo(0, 6)
  g.stroke()

  // Center dot
  g.setFillStyle({ color: 0xC47B3A, alpha: 1 })
  g.circle(0, 0, 2)
  g.fill()

  container.addChild(g)
}

export function repositionCoordPin(
  map: LMap,
  container: Container,
  pin: { x: number, z: number } | null,
) {
  if (!pin || container.children.length === 0)
    return
  const ll = worldToLatLng({ x: pin.x, y: 64, z: pin.z })
  const pt = map.latLngToContainerPoint([ll.lat, ll.lng])
  const child = container.children[0] as any
  if (child)
    child.position.set(pt.x, pt.y)
}
