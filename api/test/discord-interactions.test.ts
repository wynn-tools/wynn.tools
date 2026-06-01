import { Buffer } from 'node:buffer'
import { generateKeyPairSync, sign } from 'node:crypto'
import process from 'node:process'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import { getDb, schema } from '../src/db/client'
import { resetEnvCache } from '../src/env'
import { newResourceId } from '../src/lib/ids'
import { __setItemIndexForTesting, createItemIndex } from '../src/services/discord-interactions/item-index'
import { resetDb } from './helpers/db'

const KP = generateKeyPairSync('ed25519')
const PUB_HEX = KP.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex')

const FIXTURE_ITEMS = [
  { id: 1, name: 'Warp', displayName: 'Warp', rarity: 'legendary', type: 'wand', tier: 'Legendary', requirements: {}, identifications: { spellDamage: 30 } },
  { id: 2, name: 'Warchief', displayName: 'Warchief', rarity: 'fabled', type: 'helmet', tier: 'Fabled', requirements: {}, identifications: {} },
  { id: 3, name: 'Boreal Mantle', displayName: 'Boreal Mantle', rarity: 'legendary', type: 'chestplate', tier: 'Legendary', requirements: {}, identifications: {} },
]

function signed(body: object) {
  const ts = Math.floor(Date.now() / 1000).toString()
  const raw = JSON.stringify(body)
  const sig = sign(null, Buffer.concat([Buffer.from(ts), Buffer.from(raw)]), KP.privateKey).toString('hex')
  return {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-signature-ed25519': sig,
      'x-signature-timestamp': ts,
    },
    body: raw,
  }
}

function makeApp() {
  const a = createApp()
  return (p: string, init?: RequestInit) => a.request(`http://test${p}`, init)
}

describe('discord interactions', () => {
  let app: ReturnType<typeof makeApp>

  beforeAll(() => {
    process.env.DISCORD_PUBLIC_KEY = PUB_HEX
    process.env.DISCORD_APPLICATION_ID = '1234567890'
    resetEnvCache()
    __setItemIndexForTesting(createItemIndex(FIXTURE_ITEMS))
  })

  beforeEach(async () => {
    await resetDb()
    app = makeApp()

    const [userA] = await getDb().insert(schema.users).values({ id: newResourceId(), discordId: '111', username: 'alice' }).returning()
    const [userB] = await getDb().insert(schema.users).values({ id: newResourceId(), discordId: '222', username: 'bob' }).returning()

    await getDb().insert(schema.builds).values([
      { id: newResourceId(), userId: userA.id, name: 'Alpha Strike', buildString: 'AAA', gameVersion: '2.2.0.31', visibility: 'public', playerClass: 'archer', itemIds: [1] },
      { id: newResourceId(), userId: userA.id, name: 'Secret Build', buildString: 'BBB', gameVersion: '2.2.0.31', visibility: 'private', playerClass: 'archer', itemIds: [1] },
      { id: newResourceId(), userId: userB.id, name: 'Bolt Caster', buildString: 'CCC', gameVersion: '2.2.0.31', visibility: 'public', playerClass: 'mage', itemIds: [2] },
    ])
  })

  it('responds to PING with PONG', async () => {
    const res = await app('/v1/discord/interactions', signed({ type: 1 }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ type: 1 })
  })

  it('rejects unsigned requests', async () => {
    const res = await app('/v1/discord/interactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 1 }),
    })
    expect(res.status).toBe(401)
  })

  it('handles /item with a known name', async () => {
    const res = await app('/v1/discord/interactions', signed({
      type: 2,
      data: { name: 'item', options: [{ name: 'name', type: 3, value: 'Warp' }] },
    }))
    const json: any = await res.json()
    // /item replies with just the URL so Discord renders the page's OG preview.
    expect(json.data.content).toContain('/items/warp')
  })

  it('returns ephemeral for unknown /item name', async () => {
    const res = await app('/v1/discord/interactions', signed({
      type: 2,
      data: { name: 'item', options: [{ name: 'name', type: 3, value: 'NoSuch' }] },
    }))
    const json: any = await res.json()
    expect(json.data.content).toMatch(/not found/i)
  })

  it('autocomplete returns ranked suggestions', async () => {
    const res = await app('/v1/discord/interactions', signed({
      type: 4,
      data: { name: 'item', options: [{ name: 'name', type: 3, value: 'war', focused: true }] },
    }))
    const json: any = await res.json()
    expect(json.type).toBe(8)
    expect(json.data.choices[0].name).toBe('Warp')
  })

  it('/builds with no filters returns ephemeral error', async () => {
    const res = await app('/v1/discord/interactions', signed({
      type: 2,
      data: { name: 'builds', options: [] },
    }))
    const json: any = await res.json()
    expect(json.data.content).toMatch(/at least one filter/i)
  })

  it('/builds filters by class and excludes private builds', async () => {
    const res = await app('/v1/discord/interactions', signed({
      type: 2,
      data: { name: 'builds', options: [{ name: 'class', type: 3, value: 'archer' }] },
    }))
    const json: any = await res.json()
    expect(json.data.embeds[0].title).toMatch(/Builds \(1\)/)
    expect(json.data.embeds[0].description).toContain('Alpha Strike')
  })

  it('/builds reports unlinked user for unknown Discord id', async () => {
    const res = await app('/v1/discord/interactions', signed({
      type: 2,
      data: { name: 'builds', options: [{ name: 'user', type: 6, value: '999' }] },
    }))
    const json: any = await res.json()
    expect(json.data.content).toMatch(/hasn't linked/i)
  })

  it('/builds finds builds by linked Discord user', async () => {
    const res = await app('/v1/discord/interactions', signed({
      type: 2,
      data: { name: 'builds', options: [{ name: 'user', type: 6, value: '111' }] },
    }))
    const json: any = await res.json()
    expect(json.data.embeds[0].title).toMatch(/Builds \(1\)/)
  })
})
