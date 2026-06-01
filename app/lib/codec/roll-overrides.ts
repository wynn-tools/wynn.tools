// app/lib/codec/roll-overrides.ts
import { ROLLED_IDS } from '../math/roll-constants'

export const ITEM_SLOT_KEYS = [
  'h',
  'c',
  'l',
  'b',
  'r1',
  'r2',
  'br',
  'n',
  'w',
] as const
export const TOME_SLOT_KEYS = [
  't0',
  't1',
  't2',
  't3',
  't4',
  't5',
  't6',
] as const

const ITEM_KEY_TO_IDX = new Map<string, number>(
  ITEM_SLOT_KEYS.map((k, i) => [k, i]),
)
const TOME_KEY_TO_IDX = new Map<string, number>(
  TOME_SLOT_KEYS.map((k, i) => [k, i]),
)
const ROLLED_ID_SET = new Set(ROLLED_IDS)
const ROLLED_ID_ORDER = new Map<string, number>(
  ROLLED_IDS.map((id, i) => [id, i]),
)

export interface DecodedOverrides {
  itemOverrides: Map<number, Map<string, number>>
  tomeOverrides: Map<number, Map<string, number>>
}

export function encodeRollOverrides(
  itemOverrides: Map<number, Map<string, number>>,
  tomeOverrides: Map<number, Map<string, number>>,
): string {
  const groups: string[] = []
  const emit = (slotKey: string, ids: Map<string, number>) => {
    if (ids.size === 0)
      return
    const filtered = [...ids.entries()].filter(([id]) => ROLLED_ID_SET.has(id))
    if (filtered.length === 0)
      return
    filtered.sort(
      (a, b) =>
        (ROLLED_ID_ORDER.get(a[0]) ?? 1e9) - (ROLLED_ID_ORDER.get(b[0]) ?? 1e9),
    )
    const pairs = filtered.map(([id, v]) => `${id}=${v}`).join(',')
    groups.push(`${slotKey}:${pairs}`)
  }
  ITEM_SLOT_KEYS.forEach((key, idx) => {
    const ids = itemOverrides.get(idx)
    if (ids)
      emit(key, ids)
  })
  TOME_SLOT_KEYS.forEach((key, idx) => {
    const ids = tomeOverrides.get(idx)
    if (ids)
      emit(key, ids)
  })
  return groups.join(';')
}

export function decodeRollOverrides(input: string): DecodedOverrides {
  const itemOverrides = new Map<number, Map<string, number>>()
  const tomeOverrides = new Map<number, Map<string, number>>()
  if (!input)
    return { itemOverrides, tomeOverrides }
  for (const group of input.split(';')) {
    if (!group)
      continue
    const colon = group.indexOf(':')
    if (colon < 0)
      continue
    const slotKey = group.slice(0, colon)
    const body = group.slice(colon + 1)
    const itemIdx = ITEM_KEY_TO_IDX.get(slotKey)
    const tomeIdx = TOME_KEY_TO_IDX.get(slotKey)
    if (itemIdx === undefined && tomeIdx === undefined)
      continue
    const target = itemIdx !== undefined ? itemOverrides : tomeOverrides
    const idx = (itemIdx ?? tomeIdx)!
    const dest = new Map<string, number>()
    for (const pair of body.split(',')) {
      const eq = pair.indexOf('=')
      if (eq < 0)
        continue
      const id = pair.slice(0, eq)
      const valStr = pair.slice(eq + 1)
      if (!ROLLED_ID_SET.has(id))
        continue
      if (!/^-?\d+$/.test(valStr))
        continue
      dest.set(id, Number.parseInt(valStr, 10))
    }
    if (dest.size > 0)
      target.set(idx, dest)
  }
  return { itemOverrides, tomeOverrides }
}
