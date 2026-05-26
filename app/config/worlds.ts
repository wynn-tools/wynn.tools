import type { WorldConfig, WorldId, WorldPosition } from '~/types/map'

export const WORLDS: WorldConfig[] = [
  {
    id: 'main',
    label: 'Main',
    bounds: { x1: -2560, z1: -6912, x2: 2047, z2: -1 },
    tilePatterns: [/^Main \d-\d$/, /^Realm of Light$/],
    nativeZoom: 0,
    minZoom: -3,
    maxZoom: 4,
  },
  {
    id: 'void',
    label: 'The Void',
    bounds: { x1: 13312, z1: -5120, x2: 14335, z2: -3073 },
    tilePatterns: [/^The Void$/],
    nativeZoom: 0,
    minZoom: -2,
    maxZoom: 4,
  },
]

const byId = new Map(WORLDS.map(w => [w.id, w]))

export function getWorld(id: WorldId): WorldConfig {
  const w = byId.get(id)
  if (!w)
    throw new Error(`Unknown world id: ${id}`)
  return w
}

export function findWorldByPosition(p: WorldPosition): WorldConfig | null {
  for (const w of WORLDS) {
    const { x1, z1, x2, z2 } = w.bounds
    if (p.x >= x1 && p.x <= x2 && p.z >= z1 && p.z <= z2)
      return w
  }
  return null
}

export function findWorldByBbox(
  bbox: { x1: number, z1: number, x2: number, z2: number },
): WorldConfig | null {
  for (const w of WORLDS) {
    if (
      bbox.x1 >= w.bounds.x1
      && bbox.x2 <= w.bounds.x2
      && bbox.z1 >= w.bounds.z1
      && bbox.z2 <= w.bounds.z2
    ) {
      return w
    }
  }
  return null
}
