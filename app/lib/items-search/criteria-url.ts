import type { IdFilter, IdSort, IngredientCriteria, ItemCriteria } from './types'

export type Query = Record<string, string>

export function defaultItemCriteria(): ItemCriteria {
  return { name: '', types: [], tiers: [], sets: [], levelRange: [1, 110], restrictions: [], majorId: null, identifications: [], idSorts: [] }
}

export function defaultIngredientCriteria(): IngredientCriteria {
  return { name: '', tiers: [], levelRange: [1, 110], skills: [], identifications: [], idSorts: [] }
}

function encodeIds(ids: IdFilter[], sorts: IdSort[]): string {
  return ids.map((f) => {
    if (f.exclude)
      return `${f.key}:excl`
    const sort = sorts.find(s => s.key === f.key)
    return sort ? `${f.key}:${sort.dir}` : f.key
  }).join(',')
}

function decodeIds(raw: string | undefined): { ids: IdFilter[], sorts: IdSort[] } {
  const ids: IdFilter[] = []
  const sorts: IdSort[] = []
  if (!raw)
    return { ids, sorts }
  for (const token of raw.split(',')) {
    if (!token)
      continue
    const [key, mod] = token.split(':')
    if (!key)
      continue
    if (mod === 'excl') {
      ids.push({ key, exclude: true })
    }
    else {
      ids.push({ key, exclude: false })
      if (mod === 'asc' || mod === 'desc')
        sorts.push({ key, dir: mod })
    }
  }
  return { ids, sorts }
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
  if (c.levelRange[0] !== 1 || c.levelRange[1] !== 110)
    q.lvl = `${c.levelRange[0]}-${c.levelRange[1]}`
  if (c.restrictions.length)
    q.x = c.restrictions.join(',')
  if (c.majorId)
    q.major = c.majorId
  const ids = encodeIds(c.identifications, c.idSorts)
  if (ids)
    q.id = ids
  return q
}

export function queryToItemCriteria(q: Query): ItemCriteria {
  const { ids, sorts } = decodeIds(q.id)
  return {
    name: q.q ?? '',
    types: q.type ? q.type.split(',') : [],
    tiers: q.tier ? q.tier.split(',') : [],
    sets: q.set ? q.set.split(',') : [],
    levelRange: decodeLevel(q.lvl, [1, 110]),
    restrictions: q.x ? q.x.split(',') : [],
    majorId: q.major ?? null,
    identifications: ids,
    idSorts: sorts,
  }
}

export function ingredientCriteriaToQuery(c: IngredientCriteria): Query {
  const q: Query = {}
  if (c.name)
    q.q = c.name
  if (c.tiers.length)
    q.tier = c.tiers.join(',')
  if (c.levelRange[0] !== 1 || c.levelRange[1] !== 110)
    q.lvl = `${c.levelRange[0]}-${c.levelRange[1]}`
  if (c.skills.length)
    q.skill = c.skills.join(',')
  const ids = encodeIds(c.identifications, c.idSorts)
  if (ids)
    q.id = ids
  return q
}

export function queryToIngredientCriteria(q: Query): IngredientCriteria {
  const { ids, sorts } = decodeIds(q.id)
  return {
    name: q.q ?? '',
    tiers: q.tier ? q.tier.split(',').map(Number).filter(Number.isFinite) : [],
    levelRange: decodeLevel(q.lvl, [1, 110]),
    skills: q.skill ? q.skill.split(',') : [],
    identifications: ids,
    idSorts: sorts,
  }
}
