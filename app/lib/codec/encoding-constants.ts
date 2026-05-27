import type { CdnClient } from '../data/cdn-client'
import { cdnPathFor } from '../data/cdn-adapter/version-paths'

/**
 * Per-version encoding constants (the `ENC`/`DEC` object from encoding_consts.json).
 * Open record: each field is either a numeric bitlen/const or a flag-map
 * (`{ BITLEN, ...flagName: value }`). Consumers read the fields they need.
 */
export type EncodingConstants = Record<string, number | Record<string, number>>

/** Fetch encoding constants from a resolved CDN snapshot segment (content hash). */
export async function loadEncodingConstants(client: CdnClient, segment: string): Promise<EncodingConstants> {
  return client.fetchJson<EncodingConstants>(cdnPathFor(segment, 'encoding_consts.json'))
}
