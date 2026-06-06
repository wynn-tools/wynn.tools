import type { RawBuild } from '../codec/build-codec'
import type { DamagePartResult, SpellPartResult } from '../math/spell-calc'
import type { BuildContext, BuildResult, SpellOutput } from './compute-build'
import { slotItemId } from '../codec/build-codec'
import { WEP_TO_CLASS } from '../codec/wep-to-class'
import { POWDER_NAME_BY_ID } from '../data/powder-constants'
import { attributeUrl, itemIconUrl, spUrl } from '../items/icon'
import { critChance } from '../math/dps'
import { classWeaponUrl } from './class-theme'

export interface BuildMetaItem {
  slot: string
  name: string
  tier?: string | null
  icon?: string | null
  powders?: string
}
export interface BuildMetaSp {
  skill: string
  value: number
  active: boolean
  discUrl: string
  iconUrl: string
}
export interface BuildMetaDef {
  element: string
  iconUrl: string
  value: string
  positive: boolean
}
export interface BuildMetaCombat {
  name: string
  dps: number
}

export interface BuildMetaCredit { username: string, name: string }

export interface BuildMeta {
  name: string | null
  level: number
  className: string
  weaponIconUrl: string
  items: BuildMetaItem[]
  totalHp: number
  ehp: number
  /** Top damage lines (melee + spells) by output, highest first, max 4. */
  combatLines: BuildMetaCombat[]
  sp: BuildMetaSp[]
  elementalDefenses: BuildMetaDef[]
  owner: string | null
  credits: BuildMetaCredit[]
  tags: string[]
}

/** Equipment slot index → index in raw.powders array (matches POWDERABLE in equipment-codec). */
const POWDER_INDEX = new Map([
  [0, 0],
  [1, 1],
  [2, 2],
  [3, 3],
  [8, 4],
])

const SLOT_LABELS = [
  'Helmet',
  'Chestplate',
  'Leggings',
  'Boots',
  'Ring 1',
  'Ring 2',
  'Bracelet',
  'Necklace',
  'Weapon',
]

// Builder slot order: helmet, chest, legs, boots, ring1, ring2, bracelet,
// necklace, weapon — mirrors EquipmentGrid's grid-template-areas.
const DISPLAY_ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8]

const SP_SKILLS = [
  'strength',
  'dexterity',
  'intelligence',
  'defence',
  'agility',
] as const

const DEF_ELEMENTS = ['earth', 'thunder', 'water', 'fire', 'air'] as const

// Per-spell headline damage, mirroring DpsOutput.vue: melee uses its averageDps;
// each spell uses the crit-weighted average of its display damage part.
function isDamagePart(p: SpellPartResult): p is DamagePartResult {
  return p.type === 'damage'
}
function spellPartAvg(part: DamagePartResult, crit: number): number {
  const nonCrit = (part.normalTotal[0] + part.normalTotal[1]) / 2 || 0
  const critAvg = (part.critTotal[0] + part.critTotal[1]) / 2 || 0
  return (1 - crit) * nonCrit + crit * critAvg || 0
}
function spellDisplayPart(out: SpellOutput): DamagePartResult | undefined {
  const damage = out.parts.filter(isDamagePart)
  return damage.find(p => p.name === out.spell.display) ?? damage[damage.length - 1]
}

export function extractBuildMeta(
  raw: RawBuild,
  ctx: BuildContext,
  weaponTypeFn: (id: number) => string | null,
  result: BuildResult,
  name: string | null,
  owner: string | null = null,
  credits: BuildMetaCredit[] = [],
  tags: string[] = [],
): BuildMeta {
  const weaponSlot = raw.equipment[8]
  const wid = slotItemId(weaponSlot)
  const wtype = wid != null ? weaponTypeFn(wid) : null
  const className = wtype ? (WEP_TO_CLASS[wtype] ?? 'Build') : 'Build'

  const items: BuildMetaItem[] = DISPLAY_ORDER.map((slot) => {
    const slotEntry = raw.equipment[slot]
    const isCrafted = slotEntry?.kind === 'crafted'
    const id = slotItemId(slotEntry)
    const item = id != null ? ctx.rawItemIndex.resolveId(id) : null
    const isNone = !isCrafted && (item == null || (item.id as number) >= 10000) // ids 10000–10008 are NONE_RAW_ITEMS (empty slots)

    const powderIdx = POWDER_INDEX.get(slot)
    const powderIds = powderIdx !== undefined ? (raw.powders[powderIdx] ?? []) : []
    const powders = powderIds.map(pid => POWDER_NAME_BY_ID.get(pid) ?? '').join('') || undefined

    return {
      slot: SLOT_LABELS[slot]!,
      name: isCrafted ? 'Crafted' : (isNone ? '—' : String(item!.displayName)),
      tier: isCrafted ? 'Crafted' : (isNone ? null : String(item!.tier ?? 'Normal')),
      icon: !isCrafted && !isNone ? itemIconUrl(item) : null,
      powders,
    }
  })

  const final = result.skillpoints.finalSkillpoints
  const sp: BuildMetaSp[] = SP_SKILLS.map((skill, i) => {
    const value = final[i] ?? 0
    const active = value > 0
    return {
      skill,
      value,
      active,
      discUrl: spUrl(active ? 'unique' : 'disabled'),
      iconUrl: spUrl(active ? skill : `${skill}_off`),
    }
  })

  const defs = result.defense.elementalDefenses
  const elementalDefenses: BuildMetaDef[] = DEF_ELEMENTS.map((element, i) => ({
    element,
    n: Math.round(defs[i] ?? 0),
  }))
    .filter(d => d.n !== 0)
    .map(d => ({
      element: d.element,
      iconUrl: attributeUrl(d.element),
      value: `${d.n > 0 ? '+' : ''}${d.n}`,
      positive: d.n > 0,
    }))

  const crit = critChance(result.stats)
  const combatLines: BuildMetaCombat[] = result.spells
    .map((out) => {
      const dps = out.spell.baseSpell === 0
        ? result.melee.averageDps
        : (() => {
            const part = spellDisplayPart(out)
            return part ? spellPartAvg(part, crit) : 0
          })()
      return { name: out.spell.name, dps }
    })
    .filter(line => line.dps > 0)
    .sort((a, b) => b.dps - a.dps)
    .slice(0, 4)

  return {
    name,
    level: raw.level,
    className,
    weaponIconUrl: classWeaponUrl(className),
    items,
    totalHp: result.defense.totalHp,
    ehp: result.defense.ehp.withAgi,
    combatLines,
    sp,
    elementalDefenses,
    owner,
    credits,
    tags,
  }
}
