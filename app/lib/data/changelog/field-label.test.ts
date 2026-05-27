// app/lib/data/changelog/field-label.test.ts
import { describe, expect, it } from 'vitest'
import { humanizeField, isCost } from './field-label'

// The 92 identification keys present in real CDN changelogs.
const REAL_KEYS = [
  '1stSpellCost',
  '2ndSpellCost',
  '3rdSpellCost',
  '4thSpellCost',
  'airDamage',
  'airDefence',
  'airMainAttackDamage',
  'airSpellDamage',
  'combatExperience',
  'criticalDamageBonus',
  'damage',
  'defenceToMobs',
  'earthDamage',
  'earthDefence',
  'earthMainAttackDamage',
  'earthSpellDamage',
  'elementalDamage',
  'elementalDefence',
  'elementalMainAttackDamage',
  'elementalSpellDamage',
  'exploding',
  'fireDamage',
  'fireDefence',
  'fireMainAttackDamage',
  'fireSpellDamage',
  'healingEfficiency',
  'healthRegen',
  'healthRegenRaw',
  'jumpHeight',
  'knockback',
  'lifeSteal',
  'lootBonus',
  'mainAttackDamage',
  'mainAttackRange',
  'manaRegen',
  'manaSteal',
  'neutralDamage',
  'neutralMainAttackDamage',
  'neutralSpellDamage',
  'poison',
  'raw1stSpellCost',
  'raw2ndSpellCost',
  'raw3rdSpellCost',
  'raw4thSpellCost',
  'rawAgility',
  'rawAirDamage',
  'rawAirMainAttackDamage',
  'rawAirSpellDamage',
  'rawAttackSpeed',
  'rawDamage',
  'rawDefence',
  'rawDexterity',
  'rawEarthDamage',
  'rawEarthMainAttackDamage',
  'rawEarthSpellDamage',
  'rawElementalDamage',
  'rawElementalMainAttackDamage',
  'rawElementalSpellDamage',
  'rawFireDamage',
  'rawFireMainAttackDamage',
  'rawFireSpellDamage',
  'rawHealth',
  'rawIntelligence',
  'rawMainAttackDamage',
  'rawMaxMana',
  'rawNeutralDamage',
  'rawNeutralMainAttackDamage',
  'rawNeutralSpellDamage',
  'rawSpellDamage',
  'rawStrength',
  'rawThunderDamage',
  'rawThunderMainAttackDamage',
  'rawThunderSpellDamage',
  'rawWaterDamage',
  'rawWaterSpellDamage',
  'reflection',
  'slowEnemy',
  'soulPointRegen',
  'spellDamage',
  'sprint',
  'sprintRegen',
  'stealing',
  'thorns',
  'thunderDamage',
  'thunderDefence',
  'thunderMainAttackDamage',
  'thunderSpellDamage',
  'walkSpeed',
  'waterDamage',
  'waterDefence',
  'waterSpellDamage',
  'weakenEnemy',
]

describe('humanizeField', () => {
  it('strips identifications prefix and trailing .raw', () => {
    expect(humanizeField('identifications.healthRegenRaw.raw')).toEqual({
      label: 'Health Regen Raw',
      unit: '',
    })
  })

  it('returns curated label + unit for mapped keys', () => {
    expect(humanizeField('identifications.healthRegen.raw')).toEqual({
      label: 'Health Regen',
      unit: '%',
    })
    expect(humanizeField('identifications.walkSpeed.raw')).toEqual({
      label: 'Walk Speed',
      unit: '%',
    })
    expect(humanizeField('identifications.manaRegen.raw')).toEqual({
      label: 'Mana Regen',
      unit: '/5s',
    })
  })

  it('falls back to camelCase title-case for unmapped keys', () => {
    expect(humanizeField('identifications.combatExperience.raw')).toEqual({
      label: 'Combat Experience',
      unit: '',
    })
    expect(humanizeField('identifications.soulPointRegen.raw')).toEqual({
      label: 'Soul Point Regen',
      unit: '',
    })
    expect(humanizeField('identifications.defenceToMobs.raw')).toEqual({
      label: 'Defence To Mobs',
      unit: '',
    })
  })

  it('resolves every real key to a non-empty label', () => {
    for (const key of REAL_KEYS) {
      const { label } = humanizeField(`identifications.${key}.raw`)
      expect(label, key).toBeTruthy()
    }
  })
})

describe('isCost', () => {
  it('is true for spell-cost keys, false otherwise', () => {
    expect(isCost('2ndSpellCost')).toBe(true)
    expect(isCost('raw3rdSpellCost')).toBe(true)
    expect(isCost('healthRegen')).toBe(false)
  })
})
