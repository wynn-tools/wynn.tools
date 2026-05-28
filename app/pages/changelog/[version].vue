<script setup lang="ts">
import { useCdnClient } from '~/composables/useBuildData'
import {
  latestGameVersion,
  loadChangelog,
  pickableVersions,
} from '~/composables/useChangelogData'
import { filterChangelogView } from '~/lib/data/changelog/normalize'

const route = useRoute()
const version = computed(() => String(route.params.version))
const client = useCdnClient()
const query = ref('')

const { data: versions } = await useAsyncData('changelog-versions', () =>
  pickableVersions(client))

const {
  data: view,
  pending,
  error,
  refresh,
} = await useAsyncData(
  () => `changelog-${version.value}`,
  () => loadChangelog(client, version.value),
  { watch: [version] },
)

// A 404 means the version segment doesn't exist → redirect to latest (guarded
// so we never bounce to the version we're already on, which would loop). Any
// other failure (transient/network) is surfaced inline with a retry instead.
const isUnknownVersion = computed(() => /\b404\b/.test(error.value?.message ?? ''))

watchEffect(async () => {
  if (error.value && isUnknownVersion.value) {
    const latest = await latestGameVersion(client)
    if (latest !== version.value)
      navigateTo(`/changelog/${latest}`, { replace: true })
  }
})

const filtered = computed(() =>
  view.value ? filterChangelogView(view.value, query.value) : null,
)
const fromVersion = computed(
  () =>
    versions.value?.find(v => v.gameVersion === version.value)?.from ?? null,
)

useSeoMeta({
  title: () => `Changelog ${version.value} — wynn.tools`,
  description: () => `Data changes in Wynncraft snapshot ${version.value}.`,
})

function go(gameVersion: string) {
  navigateTo(`/changelog/${gameVersion}`)
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6 px-6 py-8">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-text">
          Changelog
        </h1>
        <p v-if="fromVersion" class="text-sm text-muted">
          {{ fromVersion }} → {{ version }}
        </p>
      </div>
      <ChangelogVersionPicker
        v-if="versions"
        :versions="versions"
        :current="version"
        @select="go"
      />
    </header>

    <p v-if="pending" class="text-sm text-muted">
      Loading…
    </p>

    <div
      v-else-if="error && !isUnknownVersion"
      class="flex flex-col items-start gap-2 rounded-md border border-border bg-surface px-4 py-3 text-sm"
    >
      <p class="text-text">
        Couldn't load the changelog for {{ version }}.
      </p>
      <button
        type="button"
        class="rounded-md bg-surface-hi px-3 py-1.5 font-medium text-accent ring-1 ring-border hover:bg-surface"
        @click="refresh()"
      >
        Retry
      </button>
    </div>

    <template v-else-if="filtered">
      <div
        v-if="filtered.note"
        class="rounded-md border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-text"
      >
        {{ filtered.note }}
      </div>

      <input
        v-model="query"
        type="search"
        placeholder="Search by name…"
        class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
      >

      <div class="space-y-8">
        <ChangelogCategory
          v-if="filtered.items"
          title="Items"
          :section="filtered.items"
        />
        <ChangelogCategory
          v-if="filtered.tomes"
          title="Tomes"
          :section="filtered.tomes"
        />
        <template v-if="filtered.aspects">
          <ChangelogCategory
            v-for="g in filtered.aspects"
            :key="`aspect-${g.className}`"
            :title="`Aspects — ${g.className}`"
            :section="g.section"
          />
        </template>
        <template v-if="filtered.atree">
          <ChangelogCategory
            v-for="g in filtered.atree"
            :key="`atree-${g.className}`"
            :title="`Ability Tree — ${g.className}`"
            :section="g.section"
          />
        </template>
      </div>

      <p v-if="filtered.isEmpty && !filtered.note" class="text-sm text-muted">
        No changes in this version.
      </p>
    </template>
  </div>
</template>
