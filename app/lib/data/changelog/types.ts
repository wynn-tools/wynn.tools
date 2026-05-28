/** A single field-level delta within a changed item/tome (scalar values). */
export interface RawFieldDelta {
  from?: number
  to?: number
}

/**
 * Added/removed entries. Newer changelogs use an array of names; older
 * (≈1.17.x–1.18.0) snapshots use an object keyed by name → a legacy stat blob.
 * Either way the names are what we display.
 */
export type RawNameList = string[] | Record<string, unknown>

export interface RawCategory {
  added: RawNameList
  removed: RawNameList
  changed: Record<string, Record<string, RawFieldDelta>>
}

/** Raw changelog.json shape. Any category may be null; note is optional. */
export interface RawChangelog {
  from?: string
  to: string
  note?: string
  items: RawCategory | null
  tomes: RawCategory | null
  aspects: Record<string, RawCategory> | null
  atree: Record<string, RawCategory> | null
}

export interface FieldDelta {
  label: string
  unit: string
  from: number | null
  to: number | null
  direction: 'up' | 'down' | 'none'
  good: boolean | null
}

export interface ChangedEntry {
  name: string
  fields: FieldDelta[]
}

export interface CategorySection {
  added: string[]
  removed: string[]
  changed: ChangedEntry[]
}

/** A per-class section for aspects/atree. */
export interface ClassGroup {
  className: string
  section: CategorySection
}

export interface ChangelogView {
  to: string
  note: string | null
  items: CategorySection | null
  tomes: CategorySection | null
  aspects: ClassGroup[] | null
  atree: ClassGroup[] | null
  isEmpty: boolean
}
