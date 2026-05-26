import type { MapFeature } from '~/types/map'
import { isServiceCategory } from '~/config/categories'

let cache: Map<string, string> | null = null

function dist2(a: MapFeature, b: MapFeature): number {
  const dx = a.location.x - b.location.x
  const dz = a.location.z - b.location.z
  return dx * dx + dz * dz
}

function nearest(f: MapFeature, candidates: MapFeature[]): MapFeature | null {
  if (!candidates.length)
    return null
  return candidates.reduce((best, p) => (dist2(f, p) < dist2(f, best) ? p : best))
}

export function buildNearestPlaceIndex(features: MapFeature[]) {
  // Cities and towns give more useful names than provinces
  const citiesAndTowns = features.filter(
    f => f.categoryId === 'wynntils:place:city' || f.categoryId === 'wynntils:place:town-or-place',
  )
  const provinces = features.filter(f => f.categoryId === 'wynntils:place:province')

  cache = new Map()
  for (const f of features) {
    if (!isServiceCategory(f.categoryId))
      continue
    const near = nearest(f, citiesAndTowns) ?? nearest(f, provinces)
    if (near)
      cache.set(f.featureId, near.label)
  }
}

export function getNearestPlace(featureId: string): string | undefined {
  return cache?.get(featureId)
}
