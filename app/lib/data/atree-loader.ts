import type { AtreeData } from '../types/atree'
import type { CdnClient } from './cdn-client'

export async function loadAtreeData(client: CdnClient, path = 'atree.json'): Promise<AtreeData> {
  return client.fetchJson<AtreeData>(path)
}
