import type { SearchItem } from './types'

export type ObtainKind = 'lootchest' | 'mobs' | 'anyLootchest' | 'quest' | 'unknown'

export interface ObtainMethod {
  kind: ObtainKind
  title: string
  description: string
  quest?: string
}

function levelBand(level: number): string {
  return `${Math.max(1, level - 4)}-${level + 4}`
}

export function obtainInfo(item: SearchItem): ObtainMethod[] {
  const level = item.requirements?.level ?? item.level
  switch (item.dropRestriction) {
    case 'lootchest':
      return [{
        kind: 'lootchest',
        title: 'Loot Chest',
        description: `Found in loot chests tier III-IV within level range ${levelBand(level)}.`,
      }]
    case 'normal':
      return [
        { kind: 'mobs', title: 'Mobs', description: `Dropped by mobs within level range ${levelBand(level)}.` },
        { kind: 'anyLootchest', title: 'Loot Chest', description: `Found in any loot chest within level range ${levelBand(level)}.` },
      ]
    case 'never':
      if (item.requirements?.quest)
        return [{ kind: 'quest', title: 'Quest', description: 'Obtained through a quest.', quest: item.requirements.quest }]
      return [{ kind: 'unknown', title: 'Unknown', description: 'Obtain method not recorded in our data.' }]
    default:
      return [{ kind: 'unknown', title: 'Unknown', description: 'Obtain method not recorded in our data.' }]
  }
}
