import { env } from '../env'

export interface DiscordProfile {
  id: string
  username: string
  avatar: string | null
  globalName: string | null
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

export function buildJoinAuthorizeUrl(state: string): string {
  const e = env()
  const url = new URL('https://discord.com/oauth2/authorize')
  url.searchParams.set('client_id', e.DISCORD_CLIENT_ID)
  url.searchParams.set('redirect_uri', e.DISCORD_REDIRECT_URI)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'identify guilds.join')
  url.searchParams.set('state', state)
  return url.toString()
}

export type DiscordJoinErrorKind = 'rate_limit' | 'forbidden' | 'banned' | 'network' | 'unknown'

export class DiscordJoinError extends Error {
  constructor(public kind: DiscordJoinErrorKind, message: string) {
    super(message)
    this.name = 'DiscordJoinError'
  }
}

// Discord error codes (https://discord.com/developers/docs/topics/opcodes-and-status-codes#json)
const BANNED_FROM_GUILD = 40007

export async function addGuildMember(
  userAccessToken: string,
  discordUserId: string,
  fetchImpl: FetchImpl = fetch,
): Promise<{ added: boolean }> {
  const e = env()
  let res: Response
  try {
    res = await fetchImpl(`https://discord.com/api/v10/guilds/${e.DISCORD_GUILD_ID}/members/${discordUserId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bot ${e.DISCORD_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ access_token: userAccessToken }),
    })
  }
  catch (err) {
    throw new DiscordJoinError('network', (err as Error).message)
  }

  if (res.status === 201)
    return { added: true }
  if (res.status === 204)
    return { added: false }
  if (res.status === 429)
    throw new DiscordJoinError('rate_limit', 'Discord rate limited (status 429)')
  if (res.status === 403) {
    const body = await res.json().catch(() => ({})) as { code?: number, message?: string }
    if (body.code === BANNED_FROM_GUILD)
      throw new DiscordJoinError('banned', body.message ?? 'User is banned from the guild')
    throw new DiscordJoinError('forbidden', body.message ?? 'Forbidden')
  }
  throw new DiscordJoinError('unknown', `Discord add-member failed (status ${res.status})`)
}

export async function fetchProfile(accessToken: string, fetchImpl: FetchImpl = fetch): Promise<DiscordProfile> {
  const res = await fetchImpl('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok)
    throw new Error(`Discord profile fetch failed: ${res.status}`)
  const json = await res.json() as { id: string, username: string, avatar: string | null, global_name: string | null }
  return { id: json.id, username: json.username, avatar: json.avatar, globalName: json.global_name }
}
