import type { RawAspectData } from '../types/aspect'
import type { CdnClient } from './cdn-client'

export async function loadAspectData(client: CdnClient, path = 'aspects.json'): Promise<RawAspectData> {
  return client.fetchJson<RawAspectData>(path)
}
