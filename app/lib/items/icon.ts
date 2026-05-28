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

const EMBLEM_CDN = 'https://cdn.wynn.tools/nextgen/items/v2/emblem'

/**
 * URL for an item's emblem (the decorative shape rendered behind the icon),
 * mirrored on our CDN, or null when the item has no emblem.
 */
export function emblemUrl(emblem: string | null | undefined): string | null {
  return emblem ? `${EMBLEM_CDN}/${emblem}.png` : null
}
