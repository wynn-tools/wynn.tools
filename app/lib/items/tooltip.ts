/** Pure formatting helpers for the item tooltip. No Vue/DOM. */

export interface TierTheme {
  /** Item-name colour. */
  color: string
  /** Lighter accent used for DPS, separators and tags. */
  light: string
  /** Background gradient end colour (start is always near-black). */
  bg: string
  /** Outer margin (official tooltips inset wider for higher rarities). */
  margin: string
}

/** Official Wynncraft tooltip palette per rarity. */
export const TIER_THEME: Record<string, TierTheme> = {
  Normal: { color: '#ffffff', light: '#cccccc', bg: '#303030', margin: '10px 0 0' },
  Unique: { color: '#ffff55', light: '#fdf2b6', bg: '#3e2d1a', margin: '10px 0 0' },
  Rare: { color: '#ff55ff', light: '#fec3f1', bg: '#311a5e', margin: '10px 6px 0' },
  Legendary: { color: '#55ffff', light: '#bef6f6', bg: '#081d5a', margin: '10px 8px 5px' },
  Fabled: { color: '#ff5555', light: '#ffc4c4', bg: '#4d0f20', margin: '10px 15px 6px' },
  Mythic: { color: '#c80db1', light: '#edb7e7', bg: '#53075c', margin: '10px 15px 6px' },
  Set: { color: '#55ff55', light: '#7feb8e', bg: '#143714', margin: '10px 6px 0' },
  Crafted: { color: '#00bcd4', light: '#a8e6ef', bg: '#142637', margin: '10px 10px 0' },
}

export function tierTheme(tier: string): TierTheme {
  return TIER_THEME[tier] ?? TIER_THEME.Normal!
}

/** Item-name / tag colours. */
export const TIER_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(TIER_THEME).map(([k, v]) => [k, v.color]),
)

export const ID_GOOD_COLOR = '#83f7c6'
export const ID_BAD_COLOR = '#f78383'

/** Attacks-per-second per attack-speed tier (shown as "(x hits/s)"). */
const ATTACK_SPEED_HITS: Record<string, number> = {
  superSlow: 0.51,
  verySlow: 0.83,
  slow: 1.5,
  normal: 2.05,
  fast: 2.5,
  veryFast: 3.1,
  superFast: 4.3,
}

export function hitsPerSecond(speed: string): number | null {
  return ATTACK_SPEED_HITS[speed] ?? null
}

/** Weapon subType → the class/archetype that can use it. */
const WEAPON_CLASS: Record<string, string> = {
  spear: 'Warrior/Knight',
  wand: 'Mage/Dark Wizard',
  bow: 'Archer/Hunter',
  dagger: 'Assassin/Ninja',
  relik: 'Shaman/Skyseer',
}

export function weaponClass(subType: string): string | null {
  return WEAPON_CLASS[subType] ?? null
}

const ATTACK_SPEED_LABELS: Record<string, string> = {
  superSlow: 'Super Slow',
  verySlow: 'Very Slow',
  slow: 'Slow',
  normal: 'Normal',
  fast: 'Fast',
  veryFast: 'Very Fast',
  superFast: 'Super Fast',
}

/** `superSlow` → `Super Slow`; unknown values fall back to title-cased input. */
export function attackSpeedLabel(speed: string): string {
  return ATTACK_SPEED_LABELS[speed]
    ?? speed.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase())
}

const ELEMENTS = ['neutral', 'earth', 'thunder', 'water', 'fire', 'air']

export interface BaseStat {
  /** Display label, e.g. "Water Damage" or "Health". */
  label: string
  /** Attribute icon name (element / neutral), or null for non-elemental stats. */
  element: string | null
}

/**
 * Map a base-stat key to a label + element icon.
 * `damage` → neutral damage; `waterDamage` → water; `earthDefence` → earth; `health` → no element.
 */
export function baseStatMeta(key: string): BaseStat {
  if (key === 'damage')
    return { label: 'Neutral Damage', element: 'neutral' }
  if (key === 'health')
    return { label: 'Health', element: null }
  const m = key.match(/^([a-z]+)(Damage|Defence)$/)
  if (m) {
    const element = m[1]!
    const kind = m[2]!
    const known = ELEMENTS.includes(element)
    return {
      label: `${element.charAt(0).toUpperCase()}${element.slice(1)} ${kind}`,
      element: known ? element : null,
    }
  }
  return { label: key, element: null }
}

/** Format an identification value with its unit; negatives keep their sign, positives are bare. */
export function formatIdValue(value: number, unit: string): string {
  return `${value}${unit}`
}

/** A stat is "good" when positive — unless it's an inverted (cost) id, where lower is better. */
export function idIsGood(raw: number, inverted: boolean): boolean {
  return inverted ? raw < 0 : raw > 0
}
