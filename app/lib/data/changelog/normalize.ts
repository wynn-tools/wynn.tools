import type {
  CategorySection,
  ChangedEntry,
  ChangelogView,
  ClassGroup,
  FieldDelta,
  RawCategory,
  RawChangelog,
  RawFieldDelta,
  RawNameList,
} from './types'
import { fieldKey, humanizeField, isCost } from './field-label'

function byName(a: string, b: string): number {
  return a.toLowerCase().localeCompare(b.toLowerCase())
}

/** Both changelog formats reduce to a list of names (array, or object keys). */
function toNames(list: RawNameList | null | undefined): string[] {
  if (!list)
    return []
  return Array.isArray(list) ? [...list] : Object.keys(list)
}

function toFieldDelta(path: string, delta: RawFieldDelta): FieldDelta {
  const { label, unit } = humanizeField(path)
  const from = delta.from ?? null
  const to = delta.to ?? null
  let direction: FieldDelta['direction'] = 'none'
  let good: boolean | null = null
  if (from !== null && to !== null && to !== from) {
    direction = to > from ? 'up' : 'down'
    const improved = to > from
    good = isCost(fieldKey(path)) ? !improved : improved
  }
  return { label, unit, from, to, direction, good }
}

function toSection(raw: RawCategory | null): CategorySection | null {
  if (!raw)
    return null
  const added = toNames(raw.added).sort(byName)
  const removed = toNames(raw.removed).sort(byName)
  const changed: ChangedEntry[] = Object.entries(raw.changed)
    .map(([name, fields]) => ({
      name,
      fields: Object.entries(fields).map(([path, delta]) =>
        toFieldDelta(path, delta),
      ),
    }))
    .sort((a, b) => byName(a.name, b.name))
  if (added.length === 0 && removed.length === 0 && changed.length === 0)
    return null
  return { added, removed, changed }
}

function toGroups(
  raw: Record<string, RawCategory> | null,
): ClassGroup[] | null {
  if (!raw)
    return null
  const groups: ClassGroup[] = Object.entries(raw)
    .map(([className, cat]) => ({ className, section: toSection(cat) }))
    .filter((g): g is ClassGroup => g.section !== null)
    .sort((a, b) => byName(a.className, b.className))
  return groups.length > 0 ? groups : null
}

export function normalizeChangelog(raw: RawChangelog): ChangelogView {
  const items = toSection(raw.items)
  const tomes = toSection(raw.tomes)
  const aspects = toGroups(raw.aspects)
  const atree = toGroups(raw.atree)
  return {
    to: raw.to,
    note: raw.note ?? null,
    items,
    tomes,
    aspects,
    atree,
    isEmpty: !items && !tomes && !aspects && !atree,
  }
}

function filterSection(
  section: CategorySection | null,
  q: string,
): CategorySection | null {
  if (!section)
    return null
  const added = section.added.filter(n => n.toLowerCase().includes(q))
  const removed = section.removed.filter(n => n.toLowerCase().includes(q))
  const changed = section.changed.filter(e =>
    e.name.toLowerCase().includes(q),
  )
  if (added.length === 0 && removed.length === 0 && changed.length === 0)
    return null
  return { added, removed, changed }
}

function filterGroups(
  groups: ClassGroup[] | null,
  q: string,
): ClassGroup[] | null {
  if (!groups)
    return null
  const filtered = groups
    .map(g => ({
      className: g.className,
      section: filterSection(g.section, q),
    }))
    .filter((g): g is ClassGroup => g.section !== null)
  return filtered.length > 0 ? filtered : null
}

export function filterChangelogView(
  view: ChangelogView,
  query: string,
): ChangelogView {
  const q = query.trim().toLowerCase()
  if (!q)
    return view
  const items = filterSection(view.items, q)
  const tomes = filterSection(view.tomes, q)
  const aspects = filterGroups(view.aspects, q)
  const atree = filterGroups(view.atree, q)
  return {
    ...view,
    items,
    tomes,
    aspects,
    atree,
    isEmpty: !items && !tomes && !aspects && !atree,
  }
}
