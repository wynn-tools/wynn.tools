import type { WynndleMode } from '../db/schema'
import type { WynndleItem } from '../lib/wynndle/feedback'

interface Deps {
  cdnBase: string
  fetch?: typeof fetch
}

const RARITY_MAP: Record<string, WynndleItem['rarity']> = {
  common: 'Common',
  unique: 'Unique',
  rare: 'Rare',
  legendary: 'Legendary',
  fabled: 'Fabled',
  mythic: 'Mythic',
  set: 'Set',
}

const SPEED_LABELS: Record<string, string> = {
  superSlow: 'Super Slow',
  verySlow: 'Very Slow',
  slow: 'Slow',
  normal: 'Normal',
  fast: 'Fast',
  veryFast: 'Very Fast',
  superFast: 'Super Fast',
}

const SKILL_NAMES = ['strength', 'dexterity', 'intelligence', 'defence', 'agility'] as const

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' ? v as Record<string, unknown> : null
}

function rangeAverage(v: unknown): number {
  const r = asRecord(v)
  if (!r)
    return 0
  const min = typeof r.min === 'number' ? r.min : 0
  const max = typeof r.max === 'number' ? r.max : 0
  return (min + max) / 2
}

function healthValue(v: unknown): number {
  if (typeof v === 'number')
    return v
  const r = asRecord(v)
  if (!r)
    return 0
  if (typeof r.raw === 'number')
    return r.raw
  return 0
}

function toWynndle(raw: Record<string, unknown>): WynndleItem | null {
  const type = typeof raw.type === 'string' ? raw.type : null
  const tierRaw = typeof raw.tier === 'string' ? raw.tier.toLowerCase() : null
  if (!tierRaw)
    return null
  const rarity = RARITY_MAP[tierRaw]
  if (!rarity)
    return null

  const id = typeof raw.id === 'number' ? String(raw.id) : (typeof raw.name === 'string' ? raw.name : null)
  const name = typeof raw.name === 'string' && raw.name.length > 0
    ? raw.name
    : (typeof raw.displayName === 'string' ? raw.displayName : null)
  if (!id || !name)
    return null

  const requirements = asRecord(raw.requirements) ?? {}
  const level = typeof requirements.level === 'number' ? requirements.level : 0
  const powders = typeof raw.powderSlots === 'number' ? raw.powderSlots : 0
  const base = asRecord(raw.base) ?? {}
  const elementsTop = Array.isArray(raw.elements)
    ? (raw.elements as unknown[]).filter((e): e is string => typeof e === 'string')
    : []

  if (type === 'weapon') {
    const attackSpeed = typeof raw.attackSpeed === 'string' ? raw.attackSpeed : ''
    const speed = SPEED_LABELS[attackSpeed] ?? ''
    const classReq = typeof requirements.classRequirement === 'string'
      ? capitalize(requirements.classRequirement)
      : ''
    let dps = typeof raw.averageDps === 'number' ? raw.averageDps : 0
    if (!dps) {
      let total = 0
      for (const [k, v] of Object.entries(base)) {
        if (!k.endsWith('Damage'))
          continue
        total += rangeAverage(v)
      }
      dps = Math.round(total)
    }
    return {
      id,
      name,
      mode: 'weapon',
      rarity,
      level,
      powders,
      elements: elementsTop,
      class: classReq,
      dps,
      speed,
    }
  }

  if (type === 'armour') {
    const subType = typeof raw.subType === 'string' ? raw.subType.toLowerCase() : ''
    if (subType !== 'helmet' && subType !== 'chestplate' && subType !== 'leggings' && subType !== 'boots')
      return null
    const skillReqs: string[] = []
    for (const s of SKILL_NAMES) {
      const v = requirements[s]
      if (typeof v === 'number' && v > 0)
        skillReqs.push(s)
    }
    return {
      id,
      name,
      mode: 'armor',
      rarity,
      level,
      powders,
      elements: elementsTop,
      armorType: subType,
      health: healthValue(base.health),
      skillReqs,
    }
  }

  return null
}

export function createPoolService({ cdnBase, fetch: f = fetch }: Deps) {
  const cache = new Map<string, { weapon: WynndleItem[], armor: WynndleItem[] }>()

  async function load(gameVersion: string) {
    const existing = cache.get(gameVersion)
    if (existing)
      return existing
    const url = new URL(`data/${gameVersion}/items.json`, cdnBase).toString()
    const res = await f(url)
    if (!res.ok)
      throw new Error(`pool fetch ${res.status}`)
    const raw = await res.json() as Record<string, unknown>
    const items = Array.isArray(raw.items) ? raw.items : []
    const split = { weapon: [] as WynndleItem[], armor: [] as WynndleItem[] }
    for (const item of items) {
      const rec = asRecord(item)
      if (!rec)
        continue
      const w = toWynndle(rec)
      if (!w || w.rarity === 'Common')
        continue
      split[w.mode].push(w)
    }
    cache.set(gameVersion, split)
    return split
  }

  return {
    async getPool(mode: WynndleMode, gameVersion: string): Promise<WynndleItem[]> {
      const all = await load(gameVersion)
      return all[mode]
    },
  }
}
