import type { Interaction, InteractionResponse } from './types'
import { BUILD_TAGS } from '../../lib/build-tags'
import { EPHEMERAL_FLAG } from './embed'
import { handleBuilds, handleBuildsComponent } from './handlers/builds'
import { autocompleteItem, handleItem } from './handlers/item'
import { handlePrice } from './handlers/price'
import { getItemIndex } from './item-index'
import { getFocusedOption, InteractionType, ResponseType } from './types'

function autocompleteTag(interaction: Interaction): InteractionResponse {
  const focused = getFocusedOption(interaction)
  const q = (focused?.value ?? '').toLowerCase().trim()
  const entries = Object.entries(BUILD_TAGS)
  const matches = entries.filter(([slug, def]) =>
    !q || slug.includes(q) || def.label.toLowerCase().includes(q) || (def.aliases ?? []).some(a => a.toLowerCase().includes(q)),
  )
  const choices = matches.slice(0, 25).map(([slug, def]) => ({ name: `${def.label} (${def.axis})`, value: slug }))
  return { type: ResponseType.AUTOCOMPLETE_RESULT, data: { choices } }
}

export async function dispatch(interaction: Interaction): Promise<InteractionResponse> {
  if (interaction.type === InteractionType.PING)
    return { type: ResponseType.PONG }

  if (interaction.type === InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE) {
    const focused = getFocusedOption(interaction)
    if (focused?.name === 'tag')
      return autocompleteTag(interaction)
    let index
    try {
      index = getItemIndex()
    }
    catch {
      return ephemeral('Items unavailable, try again in a moment.')
    }
    return autocompleteItem(interaction, index)
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    let index
    try {
      index = getItemIndex()
    }
    catch {
      return ephemeral('Items unavailable, try again in a moment.')
    }
    switch (interaction.data?.name) {
      case 'item': return await handleItem(interaction, index, 'name')
      case 'price': return await handlePrice(interaction, index)
      case 'builds': return await handleBuilds(interaction, index)
      default: return ephemeral(`Unknown command: ${interaction.data?.name}`)
    }
  }

  if (interaction.type === InteractionType.MESSAGE_COMPONENT)
    return await handleBuildsComponent(interaction)

  return ephemeral('Unknown interaction type')
}

export function ephemeral(message: string): InteractionResponse {
  return { type: ResponseType.CHANNEL_MESSAGE, data: { content: message, flags: EPHEMERAL_FLAG } }
}
