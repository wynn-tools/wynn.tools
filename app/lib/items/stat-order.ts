// Mirrors Wynntils/common/src/main/java/com/wynntils/models/stats/StatListOrderer.java::createWynncraftOrdering.
import { IDENTIFICATION_MAP } from '~/lib/data/cdn-adapter/key-maps'

export type StatGroupId = 'skill' | 'misc1' | 'damage' | 'defence' | 'misc2' | 'spell' | 'misc3' | 'extra'

export interface StatOrderEntry {
  group: StatGroupId
  index: number
}

export const GROUP_ORDER: StatGroupId[] = ['skill', 'misc1', 'damage', 'defence', 'misc2', 'spell', 'misc3', 'extra']

const SKILL_ORDER = ['str', 'dex', 'int', 'def', 'agi']

const MISC1_ORDER = [
  'kb',
  'hprPct',
  'mr',
  'ls',
  'ms',
  'xpb',
  'lb',
  'ref',
  'thorns',
  'expd',
  'spd',
  'atkTier',
  'poison',
  'hpBonus',
  'eSteal',
  'hprRaw',
  'maxMana',
  'healPct',
  'slowEnemy',
  'weakenEnemy',
  'mainAttackRange',
]

const ATTACK_ORDER = ['', 'spell', 'mainAttack']
const ELEMENT_ORDER = ['', 'neutral', 'fire', 'water', 'air', 'thunder', 'earth', 'elemental']

function cap(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)
}

function buildDamageOrder(): string[] {
  const shorthands: string[] = []
  for (const attack of ATTACK_ORDER) {
    for (const element of ELEMENT_ORDER) {
      let pctName: string
      let rawName: string
      if (element === '' && attack === '') {
        pctName = 'damage'
        rawName = 'rawDamage'
      }
      else if (element === '') {
        pctName = `${attack}Damage`
        rawName = `raw${cap(attack)}Damage`
      }
      else if (attack === '') {
        pctName = `${element}Damage`
        rawName = `raw${cap(element)}Damage`
      }
      else {
        pctName = `${element}${cap(attack)}Damage`
        rawName = `raw${cap(element)}${cap(attack)}Damage`
      }
      const pctShort = IDENTIFICATION_MAP[pctName]
      if (pctShort)
        shorthands.push(pctShort)
      const rawShort = IDENTIFICATION_MAP[rawName]
      if (rawShort)
        shorthands.push(rawShort)
    }
  }
  const critShort = IDENTIFICATION_MAP.criticalDamageBonus
  if (critShort)
    shorthands.push(critShort)
  const dmgToMobs = IDENTIFICATION_MAP.damageToMobs
  if (dmgToMobs)
    shorthands.push(dmgToMobs)
  return shorthands
}

const DAMAGE_ORDER = buildDamageOrder()

const DEFENCE_ORDER = [
  'earthDefence',
  'thunderDefence',
  'waterDefence',
  'fireDefence',
  'airDefence',
  'elementalDefence',
].map(v3 => IDENTIFICATION_MAP[v3]).filter((s): s is string => !!s)

const MISC2_ORDER = ['sprint', 'sprintReg']

const SPELL_ORDER = ['spRaw1', 'spPct1', 'spRaw2', 'spPct2', 'spRaw3', 'spPct3', 'spRaw4', 'spPct4']

const MISC3_ORDER = ['jh', 'gXp', 'gSpd', 'lq']

const GROUP_LISTS: Record<Exclude<StatGroupId, 'extra'>, string[]> = {
  skill: SKILL_ORDER,
  misc1: MISC1_ORDER,
  damage: DAMAGE_ORDER,
  defence: DEFENCE_ORDER,
  misc2: MISC2_ORDER,
  spell: SPELL_ORDER,
  misc3: MISC3_ORDER,
}

function buildStatOrder(): Record<string, StatOrderEntry> {
  const map: Record<string, StatOrderEntry> = {}
  for (const group of Object.keys(GROUP_LISTS) as Exclude<StatGroupId, 'extra'>[]) {
    const list = GROUP_LISTS[group]
    list.forEach((shorthand, index) => {
      if (!(shorthand in map))
        map[shorthand] = { group, index }
    })
  }
  return map
}

export const STAT_ORDER: Record<string, StatOrderEntry> = buildStatOrder()

export function statOrder(shorthand: string): StatOrderEntry {
  const entry = STAT_ORDER[shorthand]
  if (entry)
    return entry
  return { group: 'extra', index: Number.MAX_SAFE_INTEGER }
}
