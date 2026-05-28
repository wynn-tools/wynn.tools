import type { SearchItem } from './types'
import type { OutputItem } from '~/lib/data/cdn-adapter/item-adapter'

interface RawItemFile { items: (OutputItem & { remapID?: number })[] }

export function adaptItems(file: RawItemFile): SearchItem[] {
  const out: SearchItem[] = []
  for (const item of file.items) {
    if (item.remapID !== undefined)
      continue
    out.push({
      id: item.id,
      name: item.name,
      displayName: item.displayName ?? item.name,
      type: item.type,
      subType: item.subType,
      tier: item.tier,
      level: item.requirements?.level ?? 0,
      requirements: item.requirements,
      powderSlots: item.powderSlots ?? 0,
      restriction: item.restriction ?? null,
      dropRestriction: item.dropRestriction,
      attackSpeed: item.attackSpeed ?? null,
      majorIds: item.majorIds ?? [],
      base: item.base ?? {},
      identifications: item.identifications ?? {},
      lore: item.lore ?? null,
      icon: item.icon,
    })
  }
  return out
}
