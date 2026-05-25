import type { CdnClient } from '../data/cdn-client'
import { WYNN_VERSION_NAMES } from './version'

/**
 * Per-version encoding constants (the `ENC`/`DEC` object from encoding_consts.json).
 * Open record: each field is either a numeric bitlen/const or a flag-map
 * (`{ BITLEN, ...flagName: value }`). Consumers read the fields they need.
 */
export type EncodingConstants = Record<string, number | Record<string, number>>

export async function loadEncodingConstants(client: CdnClient, versionId: number): Promise<EncodingConstants> {
  const versionName = WYNN_VERSION_NAMES[versionId]
  if (versionName === undefined)
    throw new Error(`Unknown encoding version id: ${versionId}`)
  return client.fetchJson<EncodingConstants>(`${versionName}/encoding_consts.json`)
}
