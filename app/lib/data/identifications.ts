// app/lib/data/identifications.ts

import { IDENTIFICATION_MAP as _V3_TO_SHORT } from './cdn-adapter/key-maps'

export interface FieldLabel {
  label: string
  unit: string
}

/** Curated identification labels + units, ported from Wynnpool itemUtils. */
export const IDENTIFICATION_MAP: Record<string, FieldLabel> = {
  // base stats
  'baseHealth': { label: 'Health', unit: '' },
  'baseDamage': { label: 'Neutral Damage', unit: '' },
  'baseEarthDamage': { label: 'Earth Damage', unit: '' },
  'baseEarthDefence': { label: 'Earth Defence', unit: '' },
  'baseThunderDamage': { label: 'Thunder Damage', unit: '' },
  'baseThunderDefence': { label: 'Thunder Defence', unit: '' },
  'baseWaterDamage': { label: 'Water Damage', unit: '' },
  'baseWaterDefence': { label: 'Water Defence', unit: '' },
  'baseFireDamage': { label: 'Fire Damage', unit: '' },
  'baseFireDefence': { label: 'Fire Defence', unit: '' },
  'baseAirDamage': { label: 'Air Damage', unit: '' },
  'baseAirDefence': { label: 'Air Defence', unit: '' },
  // required
  'strength': { label: 'Strength Min', unit: '' },
  'dexterity': { label: 'Dexterity Min', unit: '' },
  'intelligence': { label: 'Intelligence Min', unit: '' },
  'defence': { label: 'Defence Min', unit: '' },
  'agility': { label: 'Agility Min', unit: '' },
  'level': { label: 'Combat Level', unit: '' },
  'classRequirement': { label: 'Class Req', unit: '' },
  'quest': { label: 'Quest Req', unit: '' },
  // main attack %
  'mainAttackDamage': { label: 'Main Attack Damage', unit: '%' },
  'mainAttackElementalDamage': {
    label: 'Main Attack Elemental Damage',
    unit: '%',
  },
  'mainAttackNeutraDamageBonus': {
    label: 'Main Attack Neutral Damage Bonus',
    unit: '%',
  },
  'elementalMainAttackDamage': {
    label: 'Elemental Main Attack Damage',
    unit: '%',
  },
  'neutralMainAttackDamage': { label: 'Neutral Main Attack Damage', unit: '%' },
  'earthMainAttackDamage': { label: 'Earth Main Attack Damage', unit: '%' },
  'thunderMainAttackDamage': { label: 'Thunder Main Attack Damage', unit: '%' },
  'waterMainAttackDamage': { label: 'Water Main Attack Damage', unit: '%' },
  'fireMainAttackDamage': { label: 'Fire Main Attack Damage', unit: '%' },
  'airMainAttackDamage': { label: 'Air Main Attack Damage', unit: '%' },
  // main attack raw
  'rawMainAttackDamage': { label: 'Main Attack Damage', unit: '' },
  'rawElementalMainAttackDamage': {
    label: 'Elemental Main Attack Damage',
    unit: '',
  },
  'rawNeutralMainAttackDamage': { label: 'Neutral Main Attack Damage', unit: '' },
  'rawEarthMainAttackDamage': { label: 'Earth Main Attack Damage', unit: '' },
  'rawThunderMainAttackDamage': { label: 'Thunder Main Attack Damage', unit: '' },
  'rawWaterMainAttackDamage': { label: 'Water Main Attack Damage', unit: '' },
  'rawFireMainAttackDamage': { label: 'Fire Main Attack Damage', unit: '' },
  'rawAirMainAttackDamage': { label: 'Air Main Attack Damage', unit: '' },
  // damage %
  'damage': { label: 'Damage', unit: '%' },
  'neutralDamage': { label: 'Neutral Damage', unit: '%' },
  'spellDamage': { label: 'Spell Damage', unit: '%' },
  'elementalDamage': { label: 'Elemental Damage', unit: '%' },
  'criticalDamageBonus': { label: 'Critical Damage Bonus', unit: '%' },
  'earthDamage': { label: 'Earth Damage', unit: '%' },
  'thunderDamage': { label: 'Thunder Damage', unit: '%' },
  'waterDamage': { label: 'Water Damage', unit: '%' },
  'fireDamage': { label: 'Fire Damage', unit: '%' },
  'airDamage': { label: 'Air Damage', unit: '%' },
  // damage raw
  'rawDamage': { label: 'Damage', unit: '' },
  'rawNeutralDamage': { label: 'Neutral Damage', unit: '' },
  'rawSpellDamage': { label: 'Spell Damage', unit: '' },
  'rawElementalDamage': { label: 'Elemental Damage', unit: '' },
  'rawEarthDamage': { label: 'Earth Damage', unit: '' },
  'rawThunderDamage': { label: 'Thunder Damage', unit: '' },
  'rawWaterDamage': { label: 'Water Damage', unit: '' },
  'rawFireDamage': { label: 'Fire Damage', unit: '' },
  'rawAirDamage': { label: 'Air Damage', unit: '' },
  // spell damage %
  'elementalSpellDamage': { label: 'Elemental Spell Damage', unit: '%' },
  'neutralSpellDamage': { label: 'Neutral Spell Damage', unit: '%' },
  'earthSpellDamage': { label: 'Earth Spell Damage', unit: '%' },
  'thunderSpellDamage': { label: 'Thunder Spell Damage', unit: '%' },
  'waterSpellDamage': { label: 'Water Spell Damage', unit: '%' },
  'fireSpellDamage': { label: 'Fire Spell Damage', unit: '%' },
  'airSpellDamage': { label: 'Air Spell Damage', unit: '%' },
  // spell damage raw
  'rawElementalSpellDamage': { label: 'Elemental Spell Damage', unit: '' },
  'rawEarthSpellDamage': { label: 'Earth Spell Damage', unit: '' },
  'rawNeutralSpellDamage': { label: 'Neutral Spell Damage', unit: '' },
  'rawThunderSpellDamage': { label: 'Thunder Spell Damage', unit: '' },
  'rawWaterSpellDamage': { label: 'Water Spell Damage', unit: '' },
  'rawFireSpellDamage': { label: 'Fire Spell Damage', unit: '' },
  'rawAirSpellDamage': { label: 'Air Spell Damage', unit: '' },
  // survivability
  'rawHealth': { label: 'Health Bonus', unit: '' },
  'healthRegenRaw': { label: 'Health Regen Raw', unit: '' },
  'healthRegen': { label: 'Health Regen', unit: '%' },
  'thorns': { label: 'Thorns', unit: '%' },
  'elementalDefence': { label: 'Elemental Defence', unit: '%' },
  'earthDefence': { label: 'Earth Defence', unit: '%' },
  'thunderDefence': { label: 'Thunder Defence', unit: '%' },
  'waterDefence': { label: 'Water Defence', unit: '%' },
  'fireDefence': { label: 'Fire Defence', unit: '%' },
  'airDefence': { label: 'Air Defence', unit: '%' },
  // skill points
  'rawStrength': { label: 'Strength', unit: '' },
  'rawDexterity': { label: 'Dexterity', unit: '' },
  'rawIntelligence': { label: 'Intelligence', unit: '' },
  'rawDefence': { label: 'Defence', unit: '' },
  'rawAgility': { label: 'Agility', unit: '' },
  // utility
  'manaRegen': { label: 'Mana Regen', unit: '/5s' },
  'manaSteal': { label: 'Mana Steal', unit: '/3s' },
  'walkSpeed': { label: 'Walk Speed', unit: '%' },
  'xpBonus': { label: 'Combat Experience', unit: '%' },
  'exploding': { label: 'Exploding', unit: '%' },
  'lifeSteal': { label: 'Life Steal', unit: '/3s' },
  'reflection': { label: 'Reflection', unit: '%' },
  'lootBonus': { label: 'Loot Bonus', unit: '%' },
  'poison': { label: 'Poison', unit: '/3s' },
  'healingEfficiency': { label: 'Healing Efficiency', unit: '%' },
  'stealing': { label: 'Stealing', unit: '%' },
  'jumpHeight': { label: 'Jump Height', unit: '' },
  'knockback': { label: 'Knockback', unit: '%' },
  'slowEnemy': { label: 'Slow Enemy', unit: '%' },
  'weakenEnemy': { label: 'Weaken Enemy', unit: '%' },
  'leveledXpBonus': { label: 'Leveled XP Bonus', unit: '' },
  'damageFromMobs': { label: 'Damage From Mobs', unit: '' },
  'leveledLootBonus': { label: 'Leveled Loot Bonus', unit: '' },
  'gatherXpBonus': { label: 'Gather XP Bonus', unit: '%' },
  'gatherSpeed': { label: 'Gather Speed', unit: '%' },
  'lootQuality': { label: 'Loot Quality', unit: '%' },
  'rawMaxMana': { label: 'Max Mana', unit: '' },
  'sprintRegen': { label: 'Sprint Regen', unit: '%' },
  'sprint': { label: 'Sprint', unit: '%' },
  'mainAttackRange': { label: 'Main Attack Range', unit: '%' },
  'rawAttackSpeed': { label: 'Attack Speed', unit: '' },
  // spell cost
  '1stSpellCost': { label: '1st Spell Cost', unit: '%' },
  '2ndSpellCost': { label: '2nd Spell Cost', unit: '%' },
  '3rdSpellCost': { label: '3rd Spell Cost', unit: '%' },
  '4thSpellCost': { label: '4th Spell Cost', unit: '%' },
  'raw1stSpellCost': { label: '1st Spell Cost', unit: '' },
  'raw2ndSpellCost': { label: '2nd Spell Cost', unit: '' },
  'raw3rdSpellCost': { label: '3rd Spell Cost', unit: '' },
  'raw4thSpellCost': { label: '4th Spell Cost', unit: '' },
}

/** Title-case a camelCase identifier: `soulPointRegen` → `Soul Point Regen`. */
function camelToTitle(key: string): string {
  return key
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/^./, c => c.toUpperCase())
}

/** Extract the bare identification key from a changelog field path. */
export function fieldKey(path: string): string {
  const withoutPrefix = path.replace(/^identifications\./, '')
  return withoutPrefix.replace(/\.raw$/, '')
}

/** Resolve a changelog field path to a display label + unit. */
export function humanizeField(path: string): FieldLabel {
  const key = fieldKey(path)
  return IDENTIFICATION_MAP[key] ?? { label: camelToTitle(key), unit: '' }
}

// Reverse of cdn-adapter/key-maps.ts IDENTIFICATION_MAP: legacy shorthand
// (e.g. `sdPct`, `tDamRaw`) → v3 API name (e.g. `spellDamage`, `rawThunderDamage`).
// The builder math uses shorthand internally; this lets us reach the curated
// label/unit table without changing every caller.
const _SHORT_TO_V3: Record<string, string> = (() => {
  const reverse: Record<string, string> = {}
  for (const [v3, short] of Object.entries(_V3_TO_SHORT))
    reverse[short] = v3
  return reverse
})()

/** Friendly label + unit for a legacy-shorthand rolled id (e.g. `sdPct` → "Spell Damage", "%"). */
export function humanizeShortId(shorthand: string): FieldLabel {
  const v3 = _SHORT_TO_V3[shorthand]
  if (v3 && IDENTIFICATION_MAP[v3])
    return IDENTIFICATION_MAP[v3]!
  return IDENTIFICATION_MAP[shorthand] ?? { label: camelToTitle(shorthand), unit: '' }
}

/** Cost-type ids invert good/bad direction (lower cost is better). */
export function isCost(key: string): boolean {
  return key.toLowerCase().includes('cost')
}

/** Every known identification key (for filter dropdowns). */
export const allIdentificationKeys: string[] = Object.keys(IDENTIFICATION_MAP)

// Precompute which labels are shared by multiple keys (used for disambiguation).
const _labelCollisions = new Set<string>()
const _labelCount: Record<string, number> = {}
for (const { label } of Object.values(IDENTIFICATION_MAP)) {
  _labelCount[label] = (_labelCount[label] ?? 0) + 1
  if (_labelCount[label] > 1)
    _labelCollisions.add(label)
}

/**
 * Disambiguation suffix for filter dropdowns. Returns a label with a "(raw)",
 * "(%)", or "(base)" suffix when multiple keys share the same base label.
 * humanizeField is left unchanged for tooltips/changelogs.
 */
export function filterLabel(key: string): string {
  const entry = IDENTIFICATION_MAP[key]
  const { label, unit } = entry ?? { label: camelToTitle(key), unit: '' }
  if (!_labelCollisions.has(label))
    return label
  if (unit === '%')
    return `${label} (%)`
  if (key.startsWith('raw'))
    return `${label} (raw)`
  if (key.startsWith('base'))
    return `${label} (base)`
  return label
}

/** Cost-type ids invert the good/bad direction (lower is better). */
export function isInverted(key: string): boolean {
  return isCost(key)
}
