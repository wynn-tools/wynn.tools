import type { IdRange } from './types'
import { isInverted } from '~/lib/data/identifications'

export type RollBasis = 'possible' | 'guaranteed'

export function playerFavoredValue(entry: IdRange | undefined, key: string, basis: RollBasis): number {
  if (!entry)
    return 0
  const inv = isInverted(key)
  const wantHigh = basis === 'possible' ? !inv : inv
  return wantHigh ? entry.max : entry.min
}

export function playerUnfavoredValue(entry: IdRange | undefined, key: string, basis: RollBasis): number {
  return playerFavoredValue(entry, key, basis === 'possible' ? 'guaranteed' : 'possible')
}
