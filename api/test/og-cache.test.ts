import type { Buffer } from 'node:buffer'
import { beforeEach, describe, expect, it } from 'vitest'
import { getOgCache, setOgCache } from '../src/services/og-cache'
import { resetDb } from './helpers/db'

describe('og cache', () => {
  beforeEach(resetDb)

  it('returns null on cache miss', async () => {
    expect(await getOgCache('build:missing')).toBeNull()
  })

  it('stores and retrieves bytes', async () => {
    const data = Buffer.from('fake-png-bytes')
    await setOgCache('build:abc', data, 'image/png')
    const result = await getOgCache('build:abc')
    expect(result).not.toBeNull()
    expect(result!.data).toEqual(data)
    expect(result!.contentType).toBe('image/png')
  })

  it('upserts on conflict (replaces stale bytes)', async () => {
    await setOgCache('build:abc', Buffer.from('v1'), 'image/png')
    await setOgCache('build:abc', Buffer.from('v2'), 'image/png')
    const result = await getOgCache('build:abc')
    expect(result!.data).toEqual(Buffer.from('v2'))
  })

  it('stores different keys independently', async () => {
    await setOgCache('build:x', Buffer.from('build'), 'image/png')
    await setOgCache('item:sword', Buffer.from('item'), 'image/png')
    expect((await getOgCache('build:x'))!.data).toEqual(Buffer.from('build'))
    expect((await getOgCache('item:sword'))!.data).toEqual(Buffer.from('item'))
  })
})
