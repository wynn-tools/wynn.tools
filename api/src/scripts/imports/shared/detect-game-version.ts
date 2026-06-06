import process from 'node:process'
import { BitVector, BitVectorCursor } from '../../../../../app/lib/codec/bit-vector'
import { decodeHeader } from '../../../../../app/lib/codec/header'
import { ENCODING_BASE_VERSION } from '../../../../../app/lib/codec/version'

export interface VersionEntry {
  hash: string
  gameVersion: string | null
  fetchedAt: string | null
}

let cache: VersionEntry[] | null = null

async function loadVersions(): Promise<VersionEntry[]> {
  if (cache)
    return cache
  const base = process.env.CDN_BASE_URL ?? 'https://cdn.wynn.tools/'
  const url = base.endsWith('/') ? `${base}versions.json` : `${base}/versions.json`
  const res = await fetch(url)
  cache = await res.json() as VersionEntry[]
  return cache
}

/** For testing: allow injecting a pre-loaded versions array (bypasses fetch). */
export function _setVersionsCache(versions: VersionEntry[] | null) {
  cache = versions
}

function anchorIndex(versions: VersionEntry[]): number {
  const i = versions.findIndex(v => v.gameVersion === ENCODING_BASE_VERSION)
  if (i < 0)
    throw new Error(`versions.json missing anchor version ${ENCODING_BASE_VERSION}`)
  return i
}

export async function detectGameVersion(buildString: string): Promise<string | null> {
  try {
    const bv = new BitVector(buildString, 0)
    const cursor = new BitVectorCursor(bv)
    const versionId = decodeHeader(cursor)
    const versions = await loadVersions()
    const anchor = anchorIndex(versions)
    const entry = versions[anchor + versionId]
    return entry?.gameVersion ?? null
  }
  catch {
    return null
  }
}
