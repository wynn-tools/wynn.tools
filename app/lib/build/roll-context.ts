// app/lib/build/roll-context.ts
import { idRound } from '../math/expand-item'

export type RollPreset = 'min' | 'avg' | 'max'

export interface RollContext {
  preset: RollPreset
  /** item slot idx (0..8) → idName → raw override value */
  itemOverrides: Map<number, Map<string, number>>
  /** tome slot idx (0..6) → idName → raw override value */
  tomeOverrides: Map<number, Map<string, number>>
}

export const DEFAULT_ROLL_CONTEXT: RollContext = {
  preset: 'max',
  itemOverrides: new Map(),
  tomeOverrides: new Map(),
}

/**
 * Pure: given an item's min/max maps + preset + (optional) per-id overrides,
 *  return the applied roll value for each rolled id.
 */
export function computeAppliedRolls(
  minRolls: Map<string, number>,
  maxRolls: Map<string, number>,
  preset: RollPreset,
  overrides: Map<string, number> | undefined,
): Map<string, number> {
  const applied = new Map<string, number>()
  for (const [id, max] of maxRolls) {
    const min = minRolls.get(id) ?? 0
    let value: number
    if (overrides?.has(id)) {
      value = overrides.get(id)!
    }
    else if (preset === 'max') {
      value = max
    }
    else if (preset === 'min') {
      value = min
    }
    else {
      // avg = midpoint of the numeric range, rounded with idRound
      value = idRound((min + max) / 2)
    }
    applied.set(id, value)
  }
  return applied
}
