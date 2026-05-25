import type { RawTomeData } from '../types/tome'
import type { CdnClient } from './cdn-client'

export async function loadTomeData(client: CdnClient, path = 'tomes.json'): Promise<RawTomeData> {
  return client.fetchJson<RawTomeData>(path)
}
