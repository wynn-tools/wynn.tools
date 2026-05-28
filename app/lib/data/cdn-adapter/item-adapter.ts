import { BASE_MAP, DAMAGE_BASE_KEYS, IDENTIFICATION_MAP, REQUIREMENT_MAP } from './key-maps'

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

  // identifications: use .raw value, map to shorthand key
  for (const [officialKey, entry] of Object.entries(item.identifications)) {
    const shortKey = IDENTIFICATION_MAP[officialKey]
    if (shortKey === undefined)
      continue
    out[shortKey] = entry.raw
  }

  return out
}
