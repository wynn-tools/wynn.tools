import type { WynndleItem } from './feedback'

export type Hint
  = | { kind: 'type', value: string }
    | { kind: 'levelRange', value: string }
    | { kind: 'rarity', value: string }
    | { kind: 'letter', value: string }

export function deriveHint(item: WynndleItem, n: 1 | 2 | 3 | 4): Hint {
  switch (n) {
    case 1: return { kind: 'type', value: item.mode === 'weapon' ? (item.class ?? '') : (item.armorType ?? '') }
    case 2: {
      const lo = Math.floor(item.level / 10) * 10
      return { kind: 'levelRange', value: `${lo}-${lo + 9}` }
    }
    case 3: return { kind: 'rarity', value: item.rarity }
    case 4: return { kind: 'letter', value: item.name.charAt(0).toUpperCase() }
  }
}
