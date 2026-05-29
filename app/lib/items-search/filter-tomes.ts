import type { SearchTome, TomeCriteria } from './types'

const SENTINEL = 99999

function matches(tome: SearchTome, c: TomeCriteria): boolean {
  if (c.name && !tome.displayName.toLowerCase().includes(c.name.toLowerCase()))
    return false
  if (c.types.length && !c.types.includes(tome.type))
    return false
  if (c.tiers.length && !c.tiers.includes(tome.tier.toLowerCase()))
    return false
  if (tome.level < c.levelRange[0] || tome.level > c.levelRange[1])
    return false
  if (c.sources.length) {
    const src = tome.dropMeta?.type ?? 'none'
    const coords = tome.dropMeta?.coordinates
    const isSentinel = coords && coords[0] === SENTINEL
    const effectiveSrc = isSentinel ? 'none' : src
    if (!c.sources.includes(effectiveSrc))
      return false
  }
  return true
}

export function filterTomes(list: SearchTome[], c: TomeCriteria): SearchTome[] {
  return list.filter(t => matches(t, c))
}
