import { getDb, schema } from '../../src/db/client'
import { newResourceId } from '../../src/lib/ids'

export async function makeUserWithSession(opts: { isAdmin?: boolean } = {}) {
  const id = newResourceId()
  await getDb().insert(schema.users).values({
    id,
    discordId: id,
    username: `u-${id}`,
    isAdmin: opts.isAdmin ?? false,
  })
  const token = newResourceId()
  await getDb().insert(schema.sessions).values({
    id: token,
    userId: id,
    expiresAt: new Date(Date.now() + 60_000),
  })
  return { id, token, cookie: `session=${token}` }
}

export async function makeBearer(opts: { scopes: string[] }) {
  const { createApiKey } = await import('../../src/services/api-keys')
  const id = newResourceId()
  await getDb().insert(schema.users).values({ id, discordId: id, username: `b-${id}` })
  const { plaintext } = await createApiKey(id, 'test', opts.scopes as never)
  return { userId: id, header: `Bearer ${plaintext}` }
}
