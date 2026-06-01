import type { ItemIndex } from '../item-index'
import type { Interaction, InteractionResponse } from '../types'
import { env } from '../../../env'
import { getCachedPrice } from '../../market-cache'
import { createWynnventoryClient } from '../../wynnventory'
import { ephemeral } from '../dispatch'
import { POWERED_BY_WYNNVENTORY } from '../embed'
import { formatEmeraldsCompact } from '../format-emeralds'
import { getOption, ResponseType } from '../types'

function em(v: unknown): string {
  return typeof v === 'number' && v > 0 ? formatEmeraldsCompact(v) : 'n/a'
}

function headline(payload: Record<string, unknown>): unknown {
  return payload.average_p50_ema_price ?? payload.average_mid_80_percent_price ?? null
}

export async function handlePrice(interaction: Interaction, index: ItemIndex): Promise<InteractionResponse> {
  const name = getOption(interaction, 'item')
  if (!name)
    return ephemeral('Missing item name')
  const item = index.get(name)
  if (!item)
    return ephemeral(`Item not found: ${name}`)

  const e = env()
  const upstream = createWynnventoryClient({ apiKey: e.WYNNVENTORY_API_KEY, baseUrl: e.WYNNVENTORY_BASE_URL })
  const payload = await getCachedPrice({ name: item.name }, upstream)

  if (!payload || Object.keys(payload).length === 0) {
    return {
      type: ResponseType.CHANNEL_MESSAGE,
      data: {
        embeds: [{ title: item.name, description: 'No market data available.', footer: POWERED_BY_WYNNVENTORY }],
      },
    }
  }

  return {
    type: ResponseType.CHANNEL_MESSAGE,
    data: {
      embeds: [{
        title: item.name,
        description: 'WynnVentory market summary',
        fields: [
          { name: 'Average', value: em(headline(payload)), inline: true },
          { name: 'Lowest', value: em(payload.lowest_price), inline: true },
          { name: 'Highest', value: em(payload.highest_price), inline: true },
          { name: 'Listings', value: typeof payload.total_count === 'number' ? String(payload.total_count) : 'n/a', inline: true },
        ],
        footer: POWERED_BY_WYNNVENTORY,
      }],
    },
  }
}
