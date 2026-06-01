import type { ItemIndex } from '../item-index'
import type { Interaction, InteractionResponse } from '../types'
import { env } from '../../../env'
import { getCachedPrice } from '../../market-cache'
import { createWynnventoryClient } from '../../wynnventory'
import { ephemeral } from '../dispatch'
import { POWERED_BY_WYNNVENTORY } from '../embed'
import { getOption, ResponseType } from '../types'

const fmt = new Intl.NumberFormat('en-US')

function num(v: unknown): string {
  return typeof v === 'number' ? fmt.format(Math.round(v)) : 'n/a'
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
          { name: 'Average', value: num(headline(payload)), inline: true },
          { name: 'Lowest', value: num(payload.lowest_price), inline: true },
          { name: 'Highest', value: num(payload.highest_price), inline: true },
          { name: 'Listings', value: num(payload.total_count), inline: true },
        ],
        footer: POWERED_BY_WYNNVENTORY,
      }],
    },
  }
}
