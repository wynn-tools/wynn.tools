export const InteractionType = { PING: 1, APPLICATION_COMMAND: 2, MESSAGE_COMPONENT: 3, APPLICATION_COMMAND_AUTOCOMPLETE: 4 } as const
export const ResponseType = { PONG: 1, CHANNEL_MESSAGE: 4, DEFERRED_CHANNEL_MESSAGE: 5, UPDATE_MESSAGE: 7, AUTOCOMPLETE_RESULT: 8 } as const

export interface InteractionOption {
  name: string
  type: number
  value?: string | number | boolean
  focused?: boolean
  options?: InteractionOption[]
}

export interface Interaction {
  id: string
  application_id: string
  type: number
  data?: {
    id?: string
    name?: string
    options?: InteractionOption[]
    custom_id?: string
    component_type?: number
  }
  member?: { user: { id: string } }
  user?: { id: string }
}

export interface InteractionResponse {
  type: number
  data?: Record<string, unknown>
}

export function getOption(interaction: Interaction, name: string): string | undefined {
  const opt = interaction.data?.options?.find(o => o.name === name)
  return opt?.value === undefined ? undefined : String(opt.value)
}

export function getFocusedOption(interaction: Interaction): { name: string, value: string } | null {
  const focused = interaction.data?.options?.find(o => o.focused)
  if (!focused)
    return null
  return { name: focused.name, value: String(focused.value ?? '') }
}
