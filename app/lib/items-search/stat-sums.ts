import type { RollBasis } from './roll-basis'
import type { SearchItem, StatSumPresetKey } from './types'
import { playerFavoredValue } from './roll-basis'

interface PresetDef {
  label: string
  members: string[]
  unit: '' | '%'
}

// Members use the v3 official names the search path stores on items
// (see app/lib/items-search/item-search-adapter.ts and the CDN payload).
export const STAT_SUM_PRESETS: Record<StatSumPresetKey, PresetDef> = {
  spSum: {
    label: 'Skillpoint Sum',
    members: ['rawStrength', 'rawDexterity', 'rawIntelligence', 'rawDefence', 'rawAgility'],
    unit: '',
  },
  spellDmgTotal: {
    label: 'Total Spell Damage %',
    members: ['spellDamage', 'earthSpellDamage', 'thunderSpellDamage', 'waterSpellDamage', 'fireSpellDamage', 'airSpellDamage'],
    unit: '%',
  },
  elemDmgTotal: {
    label: 'Total Elemental Damage %',
    members: ['earthDamage', 'thunderDamage', 'waterDamage', 'fireDamage', 'airDamage'],
    unit: '%',
  },
  elemDefTotal: {
    label: 'Total Elemental Defense %',
    members: ['earthDefence', 'thunderDefence', 'waterDefence', 'fireDefence', 'airDefence'],
    unit: '%',
  },
}

export const STAT_SUM_PRESET_KEYS = Object.keys(STAT_SUM_PRESETS) as StatSumPresetKey[]

export function sumPreset(item: Pick<SearchItem, 'identifications'>, preset: StatSumPresetKey, basis: RollBasis): number {
  const def = STAT_SUM_PRESETS[preset]
  let total = 0
  for (const key of def.members) {
    const entry = item.identifications[key]
    if (entry)
      total += playerFavoredValue(entry, key, basis)
  }
  return total
}
