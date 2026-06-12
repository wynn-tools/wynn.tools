import type { ItemSourcesFile, MobDropRef } from './types'

export function mobsForItem(itemName: string, file: ItemSourcesFile): MobDropRef[] {
  const out: MobDropRef[] = []
  for (const [mob, entry] of Object.entries(file.mobs)) {
    if (entry.drops.guaranteed.includes(itemName))
      out.push({ mob, wiki: entry.wiki, kind: 'guaranteed' })
    else if (entry.drops.exclusive.includes(itemName))
      out.push({ mob, wiki: entry.wiki, kind: 'exclusive' })
  }
  return out
}
