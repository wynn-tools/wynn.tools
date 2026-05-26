import type { MapFeature } from '~/types/map'
import { findWorldByPosition } from '~/config/worlds'

export function tagFeaturesByWorld<T extends MapFeature>(features: T[]): T[] {
  for (const f of features) {
    f.worldId = findWorldByPosition(f.location)?.id ?? 'main'
  }
  return features
}
