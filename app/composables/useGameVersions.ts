import type { VersionEntry } from '~/lib/data/cdn-adapter/version-paths'
import type { CdnClient } from '~/lib/data/cdn-client'
import { useCdnClient } from '~/composables/useBuildData'
import { ENCODING_BASE_VERSION } from '~/lib/codec/version'

export interface GameVersionList {
  /** Newest-first list of tagged game versions encodable in build URLs (anchor onward). */
  all: string[]
  /** The newest tagged game version. */
  latest: string
}

async function loadList(client: CdnClient): Promise<GameVersionList> {
  const versions = await client.fetchJson<VersionEntry[]>('versions.json')
  const anchorIdx = versions.findIndex(v => v.gameVersion === ENCODING_BASE_VERSION)
  if (anchorIdx < 0)
    throw new Error(`versions.json missing anchor ${ENCODING_BASE_VERSION}`)
  // From the encoding anchor onward only — earlier snapshots cannot be encoded
  // in build URLs, so no public build will ever match them.
  const tagged = versions
    .slice(anchorIdx)
    .filter(v => v.gameVersion != null)
    .map(v => v.gameVersion!)
  if (tagged.length === 0)
    throw new Error('versions.json has no version-tagged snapshot at or after anchor')
  const newestFirst = tagged.slice().reverse()
  return { all: newestFirst, latest: newestFirst[0]! }
}

/** Newest-first list of CDN-tagged game versions from the encoding anchor onward. Client-only. */
export function useGameVersions() {
  return useAsyncData<GameVersionList>('game-versions-list', () => loadList(useCdnClient()), { server: false })
}
