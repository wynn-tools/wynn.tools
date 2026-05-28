const ICON_CDN = 'https://cdn.wynn.tools/nextgen/itemguide/3.3'

interface ItemIcon {
  format?: string
  value?: { name?: string } | string
}

/**
 * Build the Wynnventory icon URL for an item, or null when there's no usable
 * icon. Most items use the `attribute` format whose `value.name` (e.g.
 * "wand.water3") maps directly to a .webp; `skin` (player-head hash) and
 * iconless items have no webp and return null.
 */
export function itemIconUrl(item: { icon?: unknown } | null | undefined): string | null {
  const icon = item?.icon as ItemIcon | undefined
  if (icon?.format === 'attribute' && typeof icon.value === 'object' && icon.value?.name)
    return `${ICON_CDN}/${icon.value.name}.webp`
  return null
}

const ITEMS_V2_CDN = 'https://cdn.wynn.tools/nextgen/items/v2'

/**
 * URL for an item's emblem (the decorative shape rendered behind the icon),
 * mirrored on our CDN, or null when the item has no emblem.
 */
export function emblemUrl(emblem: string | null | undefined): string | null {
  return emblem ? `${ITEMS_V2_CDN}/emblem/${emblem}.png` : null
}

/** URL for an element / attack-speed attribute icon (e.g. `water`, `attack_speed`). */
export function attributeUrl(name: string): string {
  return `${ITEMS_V2_CDN}/attributes/${name}.png`
}

/** URL for an item type sprite (e.g. `spear`, `helmet`). */
export function spriteUrl(subType: string): string {
  return `${ITEMS_V2_CDN}/sprites/${subType}.png`
}

const TIERS_WITH_FRAME = new Set(['normal', 'unique', 'rare', 'legendary', 'fabled', 'mythic', 'ingredient'])

/** URL for a rarity frame border image, or null when that tier has no frame asset. */
export function frameUrl(tier: string): string | null {
  const t = tier.toLowerCase()
  return TIERS_WITH_FRAME.has(t) ? `${ITEMS_V2_CDN}/frames/${t}.png` : null
}

/** URL for a profession glyph (e.g. `scribing`, `weaponsmithing`, `cooking`). */
export function professionUrl(name: string): string {
  return `${ITEMS_V2_CDN}/professions/${name}.png`
}

/** URL for a skill-point icon (e.g. `mythic`, `disabled`, `intelligence`, `strength_off`). */
export function spUrl(name: string): string {
  return `${ITEMS_V2_CDN}/sp/${name}.png`
}

/** URL for a misc tooltip icon (`check`, `blank`, `line`, `major`). */
export function miscUrl(name: string): string {
  return `${ITEMS_V2_CDN}/${name}.png`
}
