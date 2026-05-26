import type { CaveJsonEntry } from '~/composables/useMapData'
import type { MapFeature } from '~/types/map'

export interface FeatureDetail {
  featureId: string
  label: string
  categoryId: string
  location: { x: number, y: number, z: number }
  level?: number
  description?: string
  rewards?: string[]
  length?: string
  difficulty?: string
  specialInfo?: string
}

export function detailFromFeature(
  f: MapFeature,
  caves: CaveJsonEntry[],
): FeatureDetail {
  const base: FeatureDetail = {
    featureId: f.featureId,
    label: f.label,
    categoryId: f.categoryId,
    location: f.location,
    level: f.level,
  }
  if (f.categoryId === 'wynntils:content:cave') {
    const cave = caves.find(
      c => c.location.x === f.location.x && c.location.z === f.location.z,
    )
    if (cave) {
      base.description = cave.description
      base.rewards = cave.rewards
      base.length = cave.length
      base.difficulty = cave.difficulty
      base.specialInfo = cave.specialInfo
      base.level = cave.requirements
    }
  }
  return base
}
