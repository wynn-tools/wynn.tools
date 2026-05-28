import type { ChangelogView, FieldDelta } from '~/lib/data/changelog/types'

export interface HistoryEntry {
  version: string
  kind: 'added' | 'removed' | 'modified'
  fields?: FieldDelta[]
}

/** `changelogs` must be newest-first and already scoped to v2 snapshots. */
export function itemHistory(name: string, changelogs: ChangelogView[]): HistoryEntry[] {
  const entries: HistoryEntry[] = []
  for (const view of changelogs) {
    const section = view.items
    if (!section)
      continue
    if (section.added.includes(name)) {
      entries.push({ version: view.to, kind: 'added' })
      continue
    }
    if (section.removed.includes(name)) {
      entries.push({ version: view.to, kind: 'removed' })
      continue
    }
    const changed = section.changed.find(c => c.name === name)
    if (changed)
      entries.push({ version: view.to, kind: 'modified', fields: changed.fields })
  }
  return entries
}
