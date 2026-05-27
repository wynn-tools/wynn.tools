import type { ItemSet } from '~/lib/types/item'
import { IDENTIFICATION_MAP } from './key-maps'

interface OutputBonus {
  pieces: number
  identifications: Record<string, number>
  majorIds: string[]
}

interface OutputSet {
  name: string
  items: string[]
  bonuses: OutputBonus[]
}

interface SetsFile {
  sets: OutputSet[]
}

export function adaptCdnSets(file: SetsFile): Map<string, ItemSet> {
  const result = new Map<string, ItemSet>()

  for (const set of file.sets) {
    const maxPieces = Math.max(...set.bonuses.map(b => b.pieces))
    const bonuses: Array<Record<string, number>> = Array.from({ length: maxPieces }, () => ({}))

    for (const bonus of set.bonuses) {
      const converted: Record<string, number> = {}
      for (const [officialKey, value] of Object.entries(bonus.identifications)) {
        const shorthand = IDENTIFICATION_MAP[officialKey]
        if (shorthand !== undefined) {
          converted[shorthand] = value
        }
      }
      bonuses[bonus.pieces - 1] = converted
    }

    result.set(set.name, { items: set.items, bonuses })
  }

  return result
}
