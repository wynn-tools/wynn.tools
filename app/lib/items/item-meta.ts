import type { DamageRange } from '~/lib/data/cdn-adapter/item-adapter'
import type { SearchItem } from '~/lib/items-search/types'
import { humanizeField, isInverted } from '~/lib/data/identifications'
import {
  attributeUrl,
  emblemUrl,
  itemIconUrl,
  miscUrl,
  spriteUrl,
  spUrl,
} from '~/lib/items/icon'
import {
  attackSpeedLabel,
  baseStatMeta,
  hitsPerSecond,
  ID_BAD_COLOR,
  ID_GOOD_COLOR,
  idIsGood,
  tierTheme,
  weaponClass,
} from '~/lib/items/tooltip'

const SKILLS = [
  'strength',
  'dexterity',
  'intelligence',
  'defence',
  'agility',
] as const
const ELEMENT_ORDER = ['neutral', 'earth', 'thunder', 'water', 'fire', 'air']

export interface BaseLine {
  iconUrl: string | null
  text: string
}
export interface DefLine {
  iconUrl: string
  value: string
}
export interface SpCircle {
  skill: string
  active: boolean
  value: number
  discUrl: string
  iconUrl: string
  checkUrl: string
  valueColor: string
}
export interface IdRow {
  label: string
  left: string
  right: string
  color: string
}
export interface MajorIdMeta {
  name: string
  text: string
}
export interface LoreSeg {
  text: string
  color: string
}

export interface ItemMeta {
  name: string
  tier: string
  subType: string
  type: 'weapon' | 'armour' | 'accessory'
  isWeapon: boolean
  level: number
  combatLevel: number
  classReq: string | null
  // colors / assets
  color: string
  light: string
  bg: string
  icon: string
  emblem: string | null
  elementIcons: string[]
  // base block
  dps: number | null
  attackSpeed: string | null
  hits: number | null
  damageLines: BaseLine[]
  health: number | null
  defenceLines: DefLine[]
  // requirements + ids
  sp: SpCircle[]
  idRows: IdRow[]
  majorIds: MajorIdMeta[]
  powderSlots: number
  lore: LoreSeg[]
}

function isRange(v: DamageRange | number): v is DamageRange {
  return typeof v === 'object'
}

export function extractItemMeta(item: SearchItem): ItemMeta {
  const theme = tierTheme(item.tier)
  const isWeapon = item.type === 'weapon'
  const tierLower = item.tier.toLowerCase()

  const damageWithEl = Object.entries(item.base)
    .filter(([key]) => key === 'damage' || key.endsWith('Damage'))
    .map(([key, v]) => {
      // Matches Item/Tooltip.vue: any element (including 'neutral') renders an
      // icon; only non-elemental stats (element === null) have no icon.
      const element = baseStatMeta(key).element
      return {
        element,
        iconUrl: element ? attributeUrl(element) : null,
        text: isRange(v)
          ? v.min === v.max
            ? String(v.raw)
            : `${v.min}-${v.max}`
          : String(v),
      }
    })
    .sort(
      (a, b) =>
        ELEMENT_ORDER.indexOf(a.element ?? '')
        - ELEMENT_ORDER.indexOf(b.element ?? ''),
    )
    .map(({ iconUrl, text }) => ({ iconUrl, text }))

  const health = typeof item.base.health === 'number' ? item.base.health : null

  const defenceLines: DefLine[] = Object.entries(item.base)
    .filter(([key]) => key.endsWith('Defence'))
    .map(([key, v]) => {
      const n = typeof v === 'number' ? v : v.raw
      const element = baseStatMeta(key).element ?? ''
      return {
        iconUrl: attributeUrl(element),
        element,
        value: `${n > 0 ? '+' : ''}${n}`,
      }
    })
    .sort(
      (a, b) =>
        ELEMENT_ORDER.indexOf(a.element) - ELEMENT_ORDER.indexOf(b.element),
    )
    .map(({ iconUrl, value }) => ({ iconUrl, value }))

  const sp: SpCircle[] = SKILLS.map((skill) => {
    const value
      = (item.requirements as Record<string, number> | undefined)?.[skill] ?? 0
    const active = value > 0
    return {
      skill,
      active,
      value,
      discUrl: spUrl(active ? tierLower : 'disabled'),
      iconUrl: spUrl(active ? skill : `${skill}_off`),
      checkUrl: miscUrl(active ? 'check' : 'blank'),
      valueColor: active ? ID_GOOD_COLOR : '#5c5c5c',
    }
  })

  const classReq = isWeapon
    ? weaponClass(item.subType)
    : (() => {
        const c = item.requirements?.classRequirement
        return c ? c.charAt(0).toUpperCase() + c.slice(1) : null
      })()

  const idRows: IdRow[] = Object.entries(item.identifications).map(
    ([key, r]) => {
      const { label, unit } = humanizeField(key)
      const color = idIsGood(r.raw, isInverted(key))
        ? ID_GOOD_COLOR
        : ID_BAD_COLOR
      if (r.min === r.max)
        return { label, left: '', right: `${r.raw}${unit}`, color }
      return {
        label,
        left: `${r.min}${unit}`,
        right: `${r.max}${unit}`,
        color,
      }
    },
  )

  const majorIds: MajorIdMeta[] = item.majorIds.map(m => ({
    name: m.name,
    text: Array.isArray(m.description)
      ? m.description.map(n => n.text).join('')
      : String(m.description ?? ''),
  }))

  const lore: LoreSeg[] = (item.lore ?? []).map(seg => ({
    text: seg.text,
    color: seg.color ?? '#aaaaaa',
  }))

  return {
    name: item.displayName,
    tier: item.tier,
    subType: item.subType,
    type: item.type,
    isWeapon,
    level: item.level,
    combatLevel: item.requirements?.level ?? item.level,
    classReq,
    color: theme.color,
    light: theme.light,
    bg: theme.bg,
    icon: itemIconUrl(item) ?? spriteUrl(item.subType),
    emblem: emblemUrl(item.emblem),
    elementIcons: item.elements.map(attributeUrl),
    dps: isWeapon ? item.averageDps : null,
    attackSpeed: item.attackSpeed ? attackSpeedLabel(item.attackSpeed) : null,
    hits: item.attackSpeed ? hitsPerSecond(item.attackSpeed) : null,
    damageLines: damageWithEl,
    health: isWeapon ? null : health,
    defenceLines: isWeapon ? [] : defenceLines,
    sp,
    idRows,
    majorIds,
    powderSlots: item.powderSlots,
    lore,
  }
}
