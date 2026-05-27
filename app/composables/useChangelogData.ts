import type { VersionEntry } from '~/lib/data/cdn-adapter/version-paths'
import type { CdnClient } from '~/lib/data/cdn-client'
// app/composables/useChangelogData.ts
import type { ChangelogView, RawChangelog } from '~/lib/data/changelog/types'
import { cdnPathFor } from '~/lib/data/cdn-adapter/version-paths'
import { normalizeChangelog } from '~/lib/data/changelog/normalize'

export interface PickableVersion {
  gameVersion: string
  /** The predecessor version this changelog diffs against (for display). */
  from: string | null
}

function fetchVersions(client: CdnClient): Promise<VersionEntry[]> {
  return client.fetchJson<VersionEntry[]>('versions.json')
}

export async function loadChangelog(
  client: CdnClient,
  gameVersion: string,
): Promise<ChangelogView> {
  const raw = await client.fetchJson<RawChangelog>(
    cdnPathFor(gameVersion, 'changelog.json'),
  )
  return normalizeChangelog(raw)
}

/** Newest-first list of versions that have a changelog to show (base excluded). */
export async function pickableVersions(
  client: CdnClient,
): Promise<PickableVersion[]> {
  const versions = await fetchVersions(client)
  const tagged = versions.filter(v => v.gameVersion != null)
  const result: PickableVersion[] = []
  for (let i = 0; i < tagged.length; i++) {
    const gv = tagged[i]!.gameVersion!
    const prev = i > 0 ? tagged[i - 1]!.gameVersion : null
    if (prev === null)
      continue // base version has no predecessor diff
    result.push({ gameVersion: gv, from: prev })
  }
  return result.reverse()
}

export async function latestGameVersion(client: CdnClient): Promise<string> {
  const versions = await fetchVersions(client)
  const tagged = versions.filter(v => v.gameVersion != null)
  const last = tagged[tagged.length - 1]
  if (!last)
    throw new Error('versions.json has no version-tagged snapshot')
  return last.gameVersion!
}
