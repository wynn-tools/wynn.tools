import type { ItemIndex, ItemSummary } from '../item-index'
import type { Interaction, InteractionResponse } from '../types'
import { env } from '../../../env'
import { ephemeral } from '../dispatch'
import { getFocusedOption, getOption, ResponseType } from '../types'

export function autocompleteItem(interaction: Interaction, index: ItemIndex): InteractionResponse {
  const focused = getFocusedOption(interaction)
  const choices = index.suggest(focused?.value ?? '').map(i => ({ name: i.displayName, value: i.name }))
  return { type: ResponseType.AUTOCOMPLETE_RESULT, data: { choices } }
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function itemUrl(item: ItemSummary): string {
  const base = env().FRONTEND_URL.replace(/\/$/, '')
  return `${base}/items/${slugify(item.displayName)}`
}

export function handleItem(
  interaction: Interaction,
  index: ItemIndex,
  optionName: 'name' | 'item' = 'name',
): InteractionResponse {
  const name = getOption(interaction, optionName)
  if (!name)
    return ephemeral('Missing item name')
  const item = index.get(name)
  if (!item)
    return ephemeral(`Item not found: ${name}`)

  // Reply with the URL only. Discord fetches the page's OG image (the tooltip
  // card rendered by nuxt-og-image) and renders it inline.
  return {
    type: ResponseType.CHANNEL_MESSAGE,
    data: { content: itemUrl(item) },
  }
}
