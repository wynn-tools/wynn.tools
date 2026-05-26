import type { WorldPosition } from '~/types/map'

export interface LatLngLike { lat: number, lng: number }

export function worldToLatLng(p: Pick<WorldPosition, 'x' | 'z'>): LatLngLike {
  return { lat: -p.z, lng: p.x }
}

export function latLngToWorld(p: LatLngLike): { x: number, z: number } {
  return { x: p.lng, z: -p.lat }
}

export function useMapProjection() {
  return { worldToLatLng, latLngToWorld }
}
