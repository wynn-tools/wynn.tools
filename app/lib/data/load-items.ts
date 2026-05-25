import type { RawItemData } from '../types/item'
import type { CdnClient } from './cdn-client'
import type { ItemDb } from './item-db'
import { buildItemDb } from './item-db'

export async function loadItemData(client: CdnClient, path = 'items.json'): Promise<ItemDb> {
  const data = await client.fetchJson<RawItemData>(path)
  return buildItemDb(data)
}
