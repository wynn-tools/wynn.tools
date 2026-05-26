import type { MapFeature } from '~/types/map'

let resolvedLevels: Map<string, number> | null = null
let datasetRange: { min: number, max: number } = { min: 1, max: 105 }

function dist2(a: MapFeature, b: MapFeature): number {
  const dx = a.location.x - b.location.x
  const dz = a.location.z - b.location.z
  return dx * dx + dz * dz
}

export function buildLevelIndex(features: MapFeature[]) {
  const leveled = features.filter(f => f.level !== undefined)
  resolvedLevels = new Map()

  if (leveled.length > 0) {
    const levels = leveled.map(f => f.level!)
    datasetRange = { min: Math.min(...levels), max: Math.max(...levels) }
  }

  for (const f of features) {
    if (f.level !== undefined) {
      resolvedLevels.set(f.featureId, f.level)
      continue
    }
    if (!leveled.length)
      continue
    const nearest = leveled.reduce((best, p) => (dist2(f, p) < dist2(f, best) ? p : best))
    resolvedLevels.set(f.featureId, nearest.level!)
  }
}

export function getResolvedLevel(featureId: string): number | undefined {
  return resolvedLevels?.get(featureId)
}

export function getDatasetLevelRange(): { min: number, max: number } {
  return datasetRange
}
