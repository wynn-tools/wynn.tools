import type { Interaction, InteractionResponse } from './types'
import { EPHEMERAL_FLAG } from './embed'
import { InteractionType, ResponseType } from './types'

export async function dispatch(interaction: Interaction): Promise<InteractionResponse> {
  if (interaction.type === InteractionType.PING)
    return { type: ResponseType.PONG }

  if (interaction.type === InteractionType.APPLICATION_COMMAND
    || interaction.type === InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE) {
    const name = interaction.data?.name
    // Stubs replaced in later tasks.
    return ephemeral(`Unhandled command: ${name}`)
  }

  if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
    // Component handling lives in Task 4 (builds pagination).
    return ephemeral('Unhandled component')
  }

  return ephemeral('Unknown interaction type')
}

export function ephemeral(message: string): InteractionResponse {
  return { type: ResponseType.CHANNEL_MESSAGE, data: { content: message, flags: EPHEMERAL_FLAG } }
}
