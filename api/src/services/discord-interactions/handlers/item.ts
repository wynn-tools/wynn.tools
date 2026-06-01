import type { ItemIndex, ItemSummary } from '../item-index'
import type { Interaction, InteractionResponse } from '../types'
import { env } from '../../../env'
import { getCachedPrice } from '../../market-cache'
import { createWynnventoryClient } from '../../wynnventory'
import { ephemeral } from '../dispatch'
import { rarityColor } from '../embed'
import { formatEmeraldsCompact } from '../format-emeralds'
import { getFocusedOption, getOption, ResponseType } from '../types'

function em(v: unknown): string | null {
  return typeof v === 'number' && v > 0 ? formatEmeraldsCompact(v) : null
}

export function autocompleteItem(interaction: Interaction, index: ItemIndex): InteractionResponse {
  const focused = getFocusedOption(interaction)
  const choices = index.suggest(focused?.value ?? '').map(i => ({ name: i.displayName, value: i.name }))
  return { type: ResponseType.AUTOCOMPLETE_RESULT, data: { choices } }
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s
}

function itemFields(item: ItemSummary): { name: string, value: string, inline?: boolean }[] {
  const fields: { name: string, value: string, inline?: boolean }[] = []
  if (item.classRequirement)
    fields.push({ name: 'Class', value: capitalize(item.classRequirement), inline: true })
  if (item.level !== null && item.level > 0)
    fields.push({ name: 'Level', value: String(item.level), inline: true })
  if (item.powderSlots !== null && item.powderSlots > 0)
    fields.push({ name: 'Powder Slots', value: String(item.powderSlots), inline: true })
  if (item.majorIds.length)
    fields.push({ name: 'Major IDs', value: item.majorIds.join(', '), inline: false })
  return fields
}

function priceFields(payload: Record<string, unknown> | null): { name: string, value: string, inline?: boolean }[] {
  if (!payload || Object.keys(payload).length === 0)
    return []
  const avg = em(payload.average_p50_ema_price ?? payload.average_mid_80_percent_price)
  const lowest = em(payload.lowest_price)
  const highest = em(payload.highest_price)
  const listings = typeof payload.total_count === 'number' ? String(payload.total_count) : null
  const fields: { name: string, value: string, inline?: boolean }[] = []
  if (avg)
    fields.push({ name: 'Average', value: avg, inline: true })
  if (lowest)
    fields.push({ name: 'Lowest', value: lowest, inline: true })
  if (highest)
    fields.push({ name: 'Highest', value: highest, inline: true })
  if (listings)
    fields.push({ name: 'Listings', value: listings, inline: true })
  return fields
}

export async function handleItem(
  interaction: Interaction,
  index: ItemIndex,
  optionName: 'name' | 'item' = 'name',
): Promise<InteractionResponse> {
  const name = getOption(interaction, optionName)
  if (!name)
    return ephemeral('Missing item name')
  const item = index.get(name)
  if (!item)
    return ephemeral(`Item not found: ${name}`)

  const e = env()
  const frontend = e.FRONTEND_URL.replace(/\/$/, '')
  const slug = slugify(item.displayName)
  const pageUrl = `${frontend}/items/${slug}`
  const ogUrl = `${e.API_PUBLIC_URL.replace(/\/$/, '')}/v1/og/item/${slug}`
  const subtype = item.subType ? capitalize(item.subType) : capitalize(item.type)

  const upstream = createWynnventoryClient({ apiKey: e.WYNNVENTORY_API_KEY, baseUrl: e.WYNNVENTORY_BASE_URL })
  const priceData = await getCachedPrice({ name: item.name }, upstream).catch(() => null)
  const prices = priceFields(priceData)

  const fields = [
    ...itemFields(item),
    ...(prices.length
      ? [{ name: '​', value: '**Market Prices** _(via WynnVentory)_', inline: false }, ...prices]
      : []),
  ]

  return {
    type: ResponseType.CHANNEL_MESSAGE,
    data: {
      embeds: [{
        title: item.displayName,
        url: pageUrl,
        color: rarityColor(item.rarity),
        description: `**${item.tier ?? 'Common'}** ${subtype}`,
        fields,
        image: { url: ogUrl },
      }],
      components: [{
        type: 1,
        components: [{ type: 2, style: 5, label: 'Open in wynn.tools', url: pageUrl }],
      }],
    },
  }
}
