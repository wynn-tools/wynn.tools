import type { ImageOverlay, Map as LMap } from 'leaflet'
import type { WorldConfig } from '~/types/map'

export interface MapsJsonEntry {
  name: string
  url: string
  path: string
  x1: number
  z1: number
  x2: number
  z2: number
  md5: string
}

export interface LatLngBounds {
  southWest: { lat: number, lng: number }
  northEast: { lat: number, lng: number }
}

export function tileToLatLngBounds(
  b: { x1: number, z1: number, x2: number, z2: number },
): LatLngBounds {
  // CRS.Simple: lat = -z, lng = x
  return {
    southWest: { lat: -b.z1, lng: b.x1 },
    northEast: { lat: -b.z2, lng: b.x2 },
  }
}

export function entriesForWorld(
  entries: MapsJsonEntry[],
  world: WorldConfig,
): MapsJsonEntry[] {
  return entries.filter(e => world.tilePatterns.some(p => p.test(e.name)))
}

export async function attach2DTiles(
  map: LMap,
  entries: MapsJsonEntry[],
): Promise<ImageOverlay[]> {
  const L = await import('leaflet')
  const overlays: ImageOverlay[] = []
  // Each integer coordinate is the center of a 1-unit block, so the true extent
  // of each tile is 0.5 units beyond its boundary coordinates. Expanding by 0.5
  // on all sides makes adjacent tiles share an exact boundary (no gap, no overlap).
  const PAD = 0.5
  for (const e of entries) {
    const b = tileToLatLngBounds({ x1: e.x1, z1: e.z1, x2: e.x2, z2: e.z2 })
    const overlay = L.imageOverlay(
      e.url,
      [
        [b.southWest.lat + PAD, b.southWest.lng - PAD],
        [b.northEast.lat - PAD, b.northEast.lng + PAD],
      ],
      { interactive: false, className: 'pixelated' },
    )
    overlay.addTo(map)
    overlays.push(overlay)
  }
  return overlays
}

export function detachOverlays(overlays: ImageOverlay[]) {
  for (const o of overlays) o.remove()
}
