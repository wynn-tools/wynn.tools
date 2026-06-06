import type { RollBasis } from './roll-basis'
import type { IdConstraint, IngredientCriteria, ItemCriteria, MaterialCriteria, StatSumPresetKey, TomeCriteria } from './types'
import { canonicalKey } from '~/lib/data/identifications'

export type Query = Record<string, string>

export function defaultItemCriteria(): ItemCriteria {
  return { name: '', types: [], tiers: [], sets: [], levelRange: [1, 120], restrictions: [], majorId: null, constraints: [], rollBasis: 'possible' }
}

export function defaultIngredientCriteria(): IngredientCriteria {
  return { name: '', tiers: [], levelRange: [1, 120], skills: [], mob: '', constraints: [], rollBasis: 'possible' }
}

export function defaultTomeCriteria(): TomeCriteria {
  return { name: '', types: [], tiers: [], sources: [], levelRange: [1, 120] }
}

export function defaultMaterialCriteria(): MaterialCriteria {
  return { name: '', subTypes: [], levelRange: [1, 120] }
}

const VALID_SUM_KEYS = new Set<StatSumPresetKey>(['spSum', 'spellDmgTotal', 'elemDmgTotal', 'elemDefTotal'])

function decodeIdParam(raw: string | undefined): IdConstraint[] {
  if (!raw)
    return []
  const out: IdConstraint[] = []
  for (const token of raw.split(',')) {
    if (!token)
      continue
    const [rawKey, mod] = token.split(':')
    if (!rawKey)
      continue
    const key = canonicalKey(rawKey) ?? rawKey
    if (mod === 'excl')
      out.push({ kind: 'id', key, exclude: true })
    else if (mod === 'asc' || mod === 'desc')
      out.push({ kind: 'id', key, sort: mod })
    else
      out.push({ kind: 'id', key })
  }
  return out
}

function decodeMinParam(raw: string | undefined): Record<string, number> {
  const out: Record<string, number> = {}
  if (!raw)
    return out
  for (const token of raw.split(',')) {
    if (!token)
      continue
    const [rawKey, val] = token.split(':')
    const n = Number(val)
    if (!rawKey || !Number.isFinite(n))
      continue
    const key = canonicalKey(rawKey) ?? rawKey
    out[key] = n
  }
  return out
}

function decodeSumParam(raw: string | undefined): IdConstraint[] {
  if (!raw)
    return []
  const out: IdConstraint[] = []
  for (const token of raw.split(',')) {
    if (!token)
      continue
    const [preset, val] = token.split(':')
    const n = Number(val)
    if (preset && VALID_SUM_KEYS.has(preset as StatSumPresetKey) && Number.isFinite(n))
      out.push({ kind: 'sum', preset: preset as StatSumPresetKey, min: n })
  }
  return out
}

function decodeExprParam(raw: string | undefined): IdConstraint[] {
  return raw && raw.trim() ? [{ kind: 'expr', source: raw }] : []
}

function decodeRollParam(raw: string | undefined): RollBasis {
  return raw === 'guaranteed' ? 'guaranteed' : 'possible'
}

function mergeConstraints(
  idList: IdConstraint[],
  thresholds: Record<string, number>,
  sums: IdConstraint[],
  exprs: IdConstraint[],
): IdConstraint[] {
  const byKey = new Map<string, Extract<IdConstraint, { kind: 'id' }>>()
  const ordered: IdConstraint[] = []
  for (const c of idList) {
    if (c.kind === 'id') {
      byKey.set(c.key, c)
      ordered.push(c)
    }
  }
  for (const [key, min] of Object.entries(thresholds)) {
    const existing = byKey.get(key)
    if (existing) {
      existing.min = min
    }
    else {
      const c: Extract<IdConstraint, { kind: 'id' }> = { kind: 'id', key, min }
      byKey.set(key, c)
      ordered.push(c)
    }
  }
  return [...ordered, ...sums, ...exprs]
}

function encodeIdConstraints(cs: IdConstraint[]): { id?: string, min?: string, sum?: string, expr?: string } {
  const idTokens: string[] = []
  const minTokens: string[] = []
  const sumTokens: string[] = []
  let expr: string | undefined
  for (const c of cs) {
    if (c.kind === 'id') {
      if (c.exclude)
        idTokens.push(`${c.key}:excl`)
      else if (c.sort)
        idTokens.push(`${c.key}:${c.sort}`)
      else if (c.min === undefined)
        idTokens.push(c.key)
      if (c.min !== undefined)
        minTokens.push(`${c.key}:${c.min}`)
    }
    else if (c.kind === 'sum') {
      if (c.min !== undefined)
        sumTokens.push(`${c.preset}:${c.min}`)
    }
    else if (c.kind === 'expr') {
      expr = c.source
    }
  }
  return {
    id: idTokens.length ? idTokens.join(',') : undefined,
    min: minTokens.length ? minTokens.join(',') : undefined,
    sum: sumTokens.length ? sumTokens.join(',') : undefined,
    expr,
  }
}

function decodeLevel(raw: string | undefined, fallback: [number, number]): [number, number] {
  if (!raw)
    return fallback
  const [a, b] = raw.split('-').map(Number)
  if (Number.isFinite(a) && Number.isFinite(b))
    return [a!, b!]
  return fallback
}

export function itemCriteriaToQuery(c: ItemCriteria): Query {
  const q: Query = {}
  if (c.name)
    q.q = c.name
  if (c.types.length)
    q.type = c.types.join(',')
  if (c.tiers.length)
    q.tier = c.tiers.join(',')
  if (c.sets.length)
    q.set = c.sets.join(',')
  if (c.levelRange[0] !== 1 || c.levelRange[1] !== 120)
    q.lvl = `${c.levelRange[0]}-${c.levelRange[1]}`
  if (c.restrictions.length)
    q.x = c.restrictions.join(',')
  if (c.majorId)
    q.major = c.majorId
  const { id, min, sum, expr } = encodeIdConstraints(c.constraints)
  if (id)
    q.id = id
  if (min)
    q.min = min
  if (sum)
    q.sum = sum
  if (expr)
    q.expr = expr
  if (c.rollBasis === 'guaranteed')
    q.roll = 'guaranteed'
  return q
}

export function queryToItemCriteria(q: Query): ItemCriteria {
  const idList = decodeIdParam(q.id)
  const thresholds = decodeMinParam(q.min)
  const sums = decodeSumParam(q.sum)
  const exprs = decodeExprParam(q.expr)
  return {
    name: q.q ?? '',
    types: q.type ? q.type.split(',') : [],
    tiers: q.tier ? q.tier.split(',') : [],
    sets: q.set ? q.set.split(',') : [],
    levelRange: decodeLevel(q.lvl, [1, 120]),
    restrictions: q.x ? q.x.split(',') : [],
    majorId: q.major ?? null,
    constraints: mergeConstraints(idList, thresholds, sums, exprs),
    rollBasis: decodeRollParam(q.roll),
  }
}

export function ingredientCriteriaToQuery(c: IngredientCriteria): Query {
  const q: Query = {}
  if (c.name)
    q.q = c.name
  if (c.tiers.length)
    q.tier = c.tiers.join(',')
  if (c.levelRange[0] !== 1 || c.levelRange[1] !== 120)
    q.lvl = `${c.levelRange[0]}-${c.levelRange[1]}`
  if (c.skills.length)
    q.skill = c.skills.join(',')
  if (c.mob)
    q.mob = c.mob
  const { id, min, sum, expr } = encodeIdConstraints(c.constraints)
  if (id)
    q.id = id
  if (min)
    q.min = min
  if (sum)
    q.sum = sum
  if (expr)
    q.expr = expr
  if (c.rollBasis === 'guaranteed')
    q.roll = 'guaranteed'
  return q
}

export function queryToIngredientCriteria(q: Query): IngredientCriteria {
  const idList = decodeIdParam(q.id)
  const thresholds = decodeMinParam(q.min)
  const sums = decodeSumParam(q.sum)
  const exprs = decodeExprParam(q.expr)
  return {
    name: q.q ?? '',
    tiers: q.tier ? q.tier.split(',').map(Number).filter(Number.isFinite) : [],
    levelRange: decodeLevel(q.lvl, [1, 120]),
    skills: q.skill ? q.skill.split(',') : [],
    mob: q.mob ?? '',
    constraints: mergeConstraints(idList, thresholds, sums, exprs),
    rollBasis: decodeRollParam(q.roll),
  }
}
