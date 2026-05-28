/** Pure formatting helpers for the item tooltip. No Vue/DOM. */

/** Rarity → name colour (official Wynncraft tooltip palette). */
export const TIER_COLORS: Record<string, string> = {
  Normal: '#ffffff',
  Set: '#55ff55',
  Unique: '#ffff55',
  Rare: '#ff55ff',
  Legendary: '#55ffff',
  Fabled: '#ff5555',
  Mythic: '#c80db1',
  Crafted: '#00bcd4',
}

export const ID_GOOD_COLOR = '#83f7c6'
export const ID_BAD_COLOR = '#f78383'

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
