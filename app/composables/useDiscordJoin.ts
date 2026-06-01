export function buildJoinUrl(apiBaseUrl: string, currentLocation: string): string {
  const returnTo = encodeURIComponent(currentLocation)
  return `${apiBaseUrl}/v1/auth/discord/join?return_to=${returnTo}`
}

export function useDiscordJoin() {
  const config = useRuntimeConfig()
  const apiBaseUrl = config.public.apiBaseUrl as string
  const inviteUrl = config.public.discordInviteUrl as string

  function join() {
    if (!import.meta.client)
      return
    const here = window.location.pathname + window.location.search + window.location.hash
    window.location.href = buildJoinUrl(apiBaseUrl, here)
  }

  return { join, inviteUrl }
}
