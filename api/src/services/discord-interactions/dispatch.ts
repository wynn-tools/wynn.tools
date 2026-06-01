import type { Interaction, InteractionResponse } from './types'
import { EPHEMERAL_FLAG } from './embed'
import { handleBuilds, handleBuildsComponent } from './handlers/builds'
import { autocompleteItem, handleItem } from './handlers/item'
import { handlePrice } from './handlers/price'
import { getItemIndex } from './item-index'
import { InteractionType, ResponseType } from './types'

export async function dispatch(interaction: Interaction): Promise<InteractionResponse> {
  if (interaction.type === InteractionType.PING)
    return { type: ResponseType.PONG }

  if (interaction.type === InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE) {
    let index
    try {
      index = getItemIndex()
    }
    catch {
      return ephemeral('Items unavailable, try again in a moment.')
    }
    // Every autocompleted option across our commands is an item-name lookup.
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
