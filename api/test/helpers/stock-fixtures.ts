import { getDb, schema } from '../../src/db/client'
import { newResourceId } from '../../src/lib/ids'

export interface FixtureCreation {
  id: string
  slug: string
  userId: string
  versionId: string
}

export async function insertCreation(opts: {
  slug: string
  title?: string
  userId?: string
  kind?: 'infobox' | 'custom-bar' | 'bundle'
  category?: 'qol' | 'combat' | 'dps-meter' | 'resource-tracker' | 'party-ui' | 'raid' | 'lootrun' | 'cooldown-tracker'
  classes?: Array<'mage' | 'archer' | 'warrior' | 'shaman' | 'assassin'>
  publishedAt?: Date
  installCount?: number
  parts?: Array<{
    role: 'function' | 'infobox' | 'resourcepack'
    name: string
    textContent?: string
    blobSha256?: string
    group?: string
  }>
}): Promise<FixtureCreation> {
  let userId = opts.userId
  if (!userId) {
    userId = newResourceId()
    await getDb().insert(schema.users).values({ id: userId, discordId: userId, username: `fx-${userId}` })
  }
  const id = newResourceId()
  await getDb().insert(schema.stockCreation).values({
    id,
    slug: opts.slug,
    title: opts.title ?? opts.slug,
    authorUserId: userId,
    kind: opts.kind ?? 'infobox',
    category: opts.category ?? 'qol',
    classes: opts.classes ?? [],
    installCount: opts.installCount ?? 0,
    lastActivityAt: opts.publishedAt ?? new Date(),
  })
  const vid = newResourceId()
  await getDb().insert(schema.stockVersion).values({
    id: vid,
    creationId: id,
    number: 1,
    label: 'v1',
    status: 'published',
    publishedAt: opts.publishedAt ?? new Date(),
  })
  for (let i = 0; i < (opts.parts ?? []).length; i++) {
    const p = opts.parts![i]
    await getDb().insert(schema.stockPart).values({
      id: newResourceId(),
      versionId: vid,
      order: i,
      role: p.role,
      name: p.name,
      group: p.group,
      textContent: p.textContent,
      blobSha256: p.blobSha256,
      blobFilename: p.blobSha256 ? 'pack.zip' : undefined,
    })
  }
  return { id, slug: opts.slug, userId, versionId: vid }
}
