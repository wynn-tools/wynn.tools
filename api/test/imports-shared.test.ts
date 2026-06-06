import { beforeEach, describe, expect, it } from 'vitest'
import { getDb, schema } from '../src/db/client'
import { newResourceId } from '../src/lib/ids'
import { makeCreditResolver } from '../src/scripts/imports/shared/resolve-credits'
import { resetDb } from './helpers/db'

const credits = {
  'yy7erig': { handle: 'yy7erig', kind: 'person' as const },
  'generic build': { handle: 'anonymous', kind: 'anonymous' as const },
}

describe('resolveCredit', () => {
  beforeEach(resetDb)

  it('creates a synthetic user with sentinel discord_id', async () => {
    const resolve = makeCreditResolver('build-db', credits)
    const id = await resolve('yy7erig')
    const u = await getDb().query.users.findFirst({
      where: (u, { eq }) => eq(u.id, id),
    })
    expect(u!.discordId).toBe('external:yy7erig')
    expect(u!.kind).toBe('person')
    expect(u!.username).toBe('yy7erig')
    expect(u!.profileVisibility).toBe('public')
  })

  it('memoizes within one resolver instance', async () => {
    const resolve = makeCreditResolver('build-db', credits)
    const id1 = await resolve('yy7erig')
    const id2 = await resolve('yy7erig')
    expect(id1).toBe(id2)
  })

  it('shares synthetic users across sources with the same handle', async () => {
    const resolveBd = makeCreditResolver('build-db', credits)
    const resolveSv = makeCreditResolver('sugvon', credits)
    const idBd = await resolveBd('yy7erig')
    const idSv = await resolveSv('yy7erig')
    expect(idBd).toBe(idSv)
  })

  it('aborts on unknown credit', async () => {
    const resolve = makeCreditResolver('build-db', credits)
    await expect(resolve('who?')).rejects.toThrow(/Unknown credit/)
  })

  it('aborts on slug collision with existing user', async () => {
    await getDb().insert(schema.users).values({
      id: newResourceId(),
      discordId: 'real-1',
      username: 'yy7erig',
      kind: 'real',
    })
    const resolve = makeCreditResolver('build-db', credits)
    await expect(resolve('yy7erig')).rejects.toThrow(/collides/)
  })
})
