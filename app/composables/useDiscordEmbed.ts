import type { DiscordContainer } from '~/lib/discord/component-embed'

export function useDiscordEmbed(component: () => DiscordContainer | null | undefined) {
  useHead(() => {
    const container = component()
    if (!container)
      return {}
    return {
      script: [{ id: 'discord:component-embed', type: 'application/json', innerHTML: { component: container } }],
    }
  })
}
