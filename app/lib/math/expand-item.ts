import { NON_ROLLED_IDS, REVERSED_IDS, ROLLED_IDS } from './roll-constants'

export type ExpandedItem = Map<string, unknown>

/** Round an id roll; if it rounds to 0, return the sign (hack). Port of build_utils.js idRound. */
export function idRound(id: number): number {
  const rounded = Math.round(id)
  if (rounded === 0)
    return Math.sign(id)
  return rounded
}

/**
 * Expand a raw item into min/max identification rolls. Port of build_utils.js expandItem.
 * `raw` is a raw item record (number/string/array fields).
 */
export function expandItem(raw: Record<string, unknown>): ExpandedItem {
  const minRolls = new Map<string, number>()
  const maxRolls = new Map<string, number>()
  const expanded: ExpandedItem = new Map()

  if (raw.fixID) {
    expanded.set('fixID', true)
    for (const id of ROLLED_IDS) {
      const val = (raw[id] as number) || 0
      minRolls.set(id, val)
      maxRolls.set(id, val)
    }
  }
  else {
    for (const id of ROLLED_IDS) {
      const rawVal = raw[id]
      const val = (rawVal as number) || 0
      if (typeof rawVal === 'object' && rawVal !== null && (rawVal as { static?: unknown }).static) {
        const rawNum = (rawVal as { raw: number }).raw
        maxRolls.set(id, rawNum)
        minRolls.set(id, rawNum)
      }
      else if (val === 0) {
        maxRolls.set(id, 0)
        minRolls.set(id, 0)
      }
      else if ((val > 0) !== REVERSED_IDS.includes(id)) {
        maxRolls.set(id, idRound(val * 1.3))
        minRolls.set(id, idRound(val * 0.3))
      }
      else {
        maxRolls.set(id, idRound(val * 0.7))
        minRolls.set(id, idRound(val * 1.3))
      }
    }
  }

  for (const id of NON_ROLLED_IDS)
    expanded.set(id, raw[id])

  expanded.set('minRolls', minRolls)
  expanded.set('maxRolls', maxRolls)
  return expanded
}
