import type { MapFeature } from '~/types/map'
import { getNearestPlace } from '~/composables/useNearestPlace'
import { isServiceCategory } from '~/config/categories'

let primaryIndex: any | null = null
let extendedIndex: any | null = null

export async function buildIndexes(features: MapFeature[]) {
  const { default: MiniSearch } = await import('minisearch')
  const opts = {
    fields: ['label', 'nearestPlace'],
    storeFields: [
      'featureId',
      'label',
      'categoryId',
      'worldId',
      'location',
      'level',
      'nearestPlace',
    ],
    searchOptions: { fuzzy: 0.2, prefix: true, boost: { label: 2 } },
  }
  const enrich = (f: MapFeature, i: number) => ({
    id: i,
    ...f,
    nearestPlace: isServiceCategory(f.categoryId) ? getNearestPlace(f.featureId) : undefined,
  })
  primaryIndex = new MiniSearch(opts)
  extendedIndex = new MiniSearch(opts)
  primaryIndex.addAll(features.filter(f => !isServiceCategory(f.categoryId)).map(enrich))
  extendedIndex.addAll(features.map(enrich))
}

export function search(q: string, opts: { includeServices: boolean }): any[] {
  const idx = opts.includeServices ? extendedIndex : primaryIndex
  if (!idx || !q.trim())
    return []
  return idx.search(q).slice(0, 12)
}

// Matches [x, y, z], x, y, z, and x y z — y is ignored for 2D navigation
const COORD_RE = /^\s*(?:\[\s*)?(-?\d+)\s*(?:,\s*|\s)(-?\d+)\s*(?:,\s*|\s)(-?\d+)\s*(?:\]\s*)?$/

export function parseCoords(q: string): { x: number, z: number } | null {
  const m = q.match(COORD_RE)
  if (!m)
    return null
  return { x: Number.parseInt(m[1], 10), z: Number.parseInt(m[3], 10) }
}
