import { eq } from 'drizzle-orm'
import { getDb, schema } from '../db/client'
import { env } from '../env'
import { buildCreationCard, buildVersionReply } from './discord-components-v2'

const ACCENT: Record<'infobox' | 'custom-bar' | 'bundle', number> = {
  'infobox': 0x4D9AFF,
  'custom-bar': 0xFFB347,
  'bundle': 0xBE93FF,
}

export interface Deps {
  fetch?: typeof globalThis.fetch
}

async function discordCall(deps: Deps, path: string, body: object): Promise<Response> {
  const f = deps.fetch ?? globalThis.fetch
  return f(`https://discord.com/api/v10${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bot ${env().DISCORD_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

export async function createCreationThread(
  creationId: string,
  deps: Deps = {},
): Promise<string | null> {
  const channelId = env().DISCORD_FUNCTION_STOCK_CHANNEL_ID
  if (!channelId) {
    console.warn('[stock-bridge] DISCORD_FUNCTION_STOCK_CHANNEL_ID unset; skipping thread create')
    return null
  }
  const c = await getDb().query.stockCreation.findFirst({
    where: (cc, { eq }) => eq(cc.id, creationId),
    with: {
      author: { columns: { username: true, discordId: true, displayName: true } },
    },
  })
  if (!c)
    return null

  const card = buildCreationCard({
    title: c.title,
    description: c.description,
    kindBadge: c.kind.toUpperCase(),
    classes: c.classes.map(s => s[0].toUpperCase() + s.slice(1)),
    categoryBadge: c.category.toUpperCase(),
    authorMention: c.author.discordId
      ? `<@${c.author.discordId}>`
      : (c.author.displayName ?? c.author.username),
    linkUrl: `${env().FRONTEND_URL}/stock/${c.slug}`,
    accentColor: ACCENT[c.kind],
  })

  try {
    const r = await discordCall(deps, `/channels/${channelId}/threads`, {
      name: c.title.slice(0, 95),
      auto_archive_duration: 10080,
      message: card,
    })
    if (!r.ok) {
      console.warn('[stock-bridge] thread create failed', r.status, await r.text().catch(() => ''))
      return null
    }
    const json = (await r.json()) as { id: string }
    await getDb()
      .update(schema.stockCreation)
      .set({ discordThreadId: json.id })
      .where(eq(schema.stockCreation.id, creationId))
    return json.id
  }
  catch (err) {
    console.warn('[stock-bridge] thread create threw', err)
    return null
  }
}

export async function postVersionReply(
  creationId: string,
  versionNumber: number,
  deps: Deps = {},
): Promise<void> {
  const c = await getDb().query.stockCreation.findFirst({
    where: (cc, { eq }) => eq(cc.id, creationId),
    columns: { slug: true, discordThreadId: true, kind: true },
  })
  if (!c?.discordThreadId)
    return
  const v = await getDb().query.stockVersion.findFirst({
    where: (vv, { and, eq }) => and(eq(vv.creationId, creationId), eq(vv.number, versionNumber)),
    columns: { label: true, changelog: true },
  })
  if (!v)
    return

  const payload = buildVersionReply({
    versionLabel: v.label,
    changelog: v.changelog,
    linkUrl: `${env().FRONTEND_URL}/stock/${c.slug}/v/${versionNumber}`,
    accentColor: ACCENT[c.kind],
  })
  try {
    const r = await discordCall(deps, `/channels/${c.discordThreadId}/messages`, payload)
    if (!r.ok)
      console.warn('[stock-bridge] version reply failed', r.status, await r.text().catch(() => ''))
  }
  catch (err) {
    console.warn('[stock-bridge] version reply threw', err)
  }
}
