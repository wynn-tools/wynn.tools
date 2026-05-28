import { BASE_MAP, DAMAGE_BASE_KEYS, IDENTIFICATION_MAP, REQUIREMENT_MAP } from './key-maps'

/**
 * Shorthand identification ids that wynnbuilder marks `{static:true, raw}` on
 * a *rolling* item (i.e. not fixID, but this single id is held flat). atkTier
 * is the only id that broadly hits this case in wb's data (140 weapons).
 *
 * eDamPct / rDamPct / expd are static on exactly one item (Iron Medallion) and
 * are NOT a global rule — applying them universally pins ids like Ingress's
 * eDamPct at raw=7 when wb rolls it to max 9. Per-id static is now detected
 * positionally below (min === max === raw on the entry) instead of via a list.
 */
const WB_PERID_STATIC_IDS: ReadonlySet<string> = new Set(['atkTier'])

// ---------------------------------------------------------------------------
// Input types (new normalized CDN schema)
// ---------------------------------------------------------------------------

export interface NormalizedText {
  color?: string
  font?: string
  text: string
}

export interface DamageRange {
  min: number
  max: number
  raw: number
}

export interface MajorId {
  name: string
  description: NormalizedText[]
}

export interface IdentificationEntry {
  min: number
  max: number
  raw: number
}

export interface OutputItem {
  id: number
  name: string
  displayName: string
  type: 'weapon' | 'armour' | 'accessory'
  subType: string
  tier: string
  attackSpeed: string | null
  powderSlots: number
  dropRestriction: string
  restriction?: string | null
  icon?: unknown
  set: string | null
  sets?: string[]
  emblem?: string | null
  averageDps?: number | null
  elements?: string[]
  lore: NormalizedText[] | null
  majorIds: MajorId[]
  base: Record<string, DamageRange | number>
  requirements: {
    level: number
    classRequirement: string | null
    strength: number
    dexterity: number
    intelligence: number
    defence: number
    agility: number
    quest?: string | null
  }
  identifications: Record<string, IdentificationEntry>
}

// ---------------------------------------------------------------------------
// camelCase → UPPER_SNAKE for attack speed values
// ---------------------------------------------------------------------------

function toUpperSnake(s: string): string {
  return s.replace(/([A-Z])/g, '_$1').toUpperCase()
}

// ---------------------------------------------------------------------------
// adaptCdnItem — convert one OutputItem to the hppeng raw record
// ---------------------------------------------------------------------------

export function adaptCdnItem(item: OutputItem): Record<string, unknown> {
  const out: Record<string, unknown> = {}

  // Pass-throughs
  out.id = item.id
  out.name = item.name
  out.displayName = item.displayName
  out.tier = item.tier
  out.set = item.set
  // Preserve the icon ({ format, value: { name } }) for the UI icon resolver.
  if (item.icon !== undefined)
    out.icon = item.icon

  // category: "armour" → "armor"; others unchanged
  out.category = item.type === 'armour' ? 'armor' : item.type

  // type (output) = subType
  out.type = item.subType

  // slots / drop
  out.slots = item.powderSlots
  out.drop = item.dropRestriction

  // atkSpd: camelCase → UPPER_SNAKE, or '' if null/undefined
  out.atkSpd = item.attackSpeed != null ? toUpperSnake(item.attackSpeed) : ''

  // lore: join all .text values; '' if null
  out.lore = item.lore != null ? item.lore.map(n => n.text).join('') : ''

  // majorIds: array of name strings
  out.majorIds = item.majorIds.map(m => m.name)

  // base stats
  for (const [cdnKey, value] of Object.entries(item.base ?? {})) {
    const shortKey = BASE_MAP[cdnKey]
    if (shortKey === undefined)
      continue
    if (DAMAGE_BASE_KEYS.has(shortKey)) {
      // Damage range → "min-max" string
      const range = value as DamageRange
      out[shortKey] = `${range.min}-${range.max}`
    }
    else {
      // Defensive/health → plain number
      out[shortKey] = value as number
    }
  }

  // requirements
  for (const [reqKey, reqVal] of Object.entries(item.requirements)) {
    const shortKey = REQUIREMENT_MAP[reqKey]
    if (shortKey === undefined || reqVal == null)
      continue
    out[shortKey] = reqVal
  }

  // identifications: map official id → wb shorthand, decide flat vs rolling.
  //
  // CDN strips wb's `identified`/`fixID` flag (the v3-API "this item never
  // rolls" marker), and also collapses any single-value id to `min === max
  // === raw`. We restore the two flags wb's math needs:
  //
  //   1. fixID: if every entry has min === max === raw, the whole item is
  //      identified — wb's expandItem fixID branch then flattens all rolled
  //      ids to their stored value (no static wrappers needed).
  //   2. Per-id static: for items that still roll, an id with min === max
  //      === raw is held flat by wb only when it appears in
  //      `WB_PERID_STATIC_IDS` (currently just atkTier, which wb tags on 140
  //      rolling weapons). Other collapsed ids on a rolling item are
  //      skillpoints or other non-rolled fields that wb handles separately.
  //
  // Known false-positive: Iron Medallion. CDN flattens its rolling str=15 to
  // min === max === raw, which trips the heuristic into marking it fixID and
  // pins str at 15 instead of rolling 5-20. Fix lives upstream in
  // cdn.wynn.tools/src/transform/items.ts (don't collapse rolling ids).
  const idEntries = Object.entries(item.identifications)
  const allCollapsed = idEntries.length > 0
    && idEntries.every(([, e]) => e.min === e.max && e.max === e.raw)
  if (allCollapsed)
    out.fixID = true
  for (const [officialKey, entry] of idEntries) {
    const shortKey = IDENTIFICATION_MAP[officialKey]
    if (shortKey === undefined)
      continue
    if (allCollapsed) {
      out[shortKey] = entry.raw
      continue
    }
    const isStatic = WB_PERID_STATIC_IDS.has(shortKey)
      && entry.min === entry.max
      && entry.max === entry.raw
    out[shortKey] = isStatic
      ? { static: true, raw: entry.raw }
      : entry.raw
  }

  return out
}
