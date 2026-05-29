import type { CdnClient } from '~/lib/data/cdn-client'
import type { ChangelogView } from '~/lib/data/changelog/types'
import { useCdnClient } from '~/composables/useBuildData'
import { loadChangelog, pickableVersions } from '~/composables/useChangelogData'

/** Normalized changelogs for every v2 snapshot, newest-first. */
export async function loadV2Changelogs(client: CdnClient): Promise<ChangelogView[]> {
  const versions = await pickableVersions(client)
  return Promise.all(
    versions.map(async (v) => {
      const view = await loadChangelog(client, v.gameVersion)
      return { ...view, to: v.gameVersion }
    }),
  )
}

export function useItemHistorySource() {
  return useAsyncData<ChangelogView[]>('item-history-source', () => loadV2Changelogs(useCdnClient()), { server: false })
}
