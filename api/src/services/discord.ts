import { env } from '../env'

export interface DiscordProfile {
  id: string
  username: string
  avatar: string | null
}

type FetchImpl = typeof fetch

export function buildAuthorizeUrl(state: string): string {
  const e = env()
  const url = new URL('https://discord.com/oauth2/authorize')
  url.searchParams.set('client_id', e.DISCORD_CLIENT_ID)
  url.searchParams.set('redirect_uri', e.DISCORD_REDIRECT_URI)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'identify')
  url.searchParams.set('state', state)
  return url.toString()
}

export async function exchangeCode(code: string, fetchImpl: FetchImpl = fetch): Promise<string> {
  const e = env()
  const res = await fetchImpl('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: e.DISCORD_CLIENT_ID,
      client_secret: e.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: e.DISCORD_REDIRECT_URI,
    }),
  })
  if (!res.ok)
    throw new Error(`Discord token exchange failed: ${res.status}`)
  const json = await res.json() as { access_token: string }
  return json.access_token
}

export async function fetchProfile(accessToken: string, fetchImpl: FetchImpl = fetch): Promise<DiscordProfile> {
  const res = await fetchImpl('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok)
    throw new Error(`Discord profile fetch failed: ${res.status}`)
  const json = await res.json() as { id: string, username: string, avatar: string | null }
  return { id: json.id, username: json.username, avatar: json.avatar }
}
