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

interface RailSection {
  id: string
  label: string
  count: number
}

function sectionTotal(s: { added: unknown[], removed: unknown[], changed: unknown[] }) {
  return s.added.length + s.removed.length + s.changed.length
}

const rail = computed<RailSection[]>(() => {
  const f = filtered.value
  if (!f)
    return []
  const out: RailSection[] = []
  if (f.items)
    out.push({ id: 'sec-items', label: 'Items', count: sectionTotal(f.items) })
  if (f.tomes)
    out.push({ id: 'sec-tomes', label: 'Tomes', count: sectionTotal(f.tomes) })
  for (const g of f.aspects ?? [])
    out.push({ id: `sec-aspects-${g.className}`, label: `Aspects · ${g.className}`, count: sectionTotal(g.section) })
  for (const g of f.atree ?? [])
    out.push({ id: `sec-atree-${g.className}`, label: `Ability Tree · ${g.className}`, count: sectionTotal(g.section) })
  return out
})

useSeoMeta({
  title: () => `Changelog ${version.value} — wynn.tools`,
  ogTitle: () => `Changelog ${version.value} — wynn.tools`,
  description: () => `Data changes in Wynncraft snapshot ${version.value}.`,
  ogDescription: () => `Data changes in Wynncraft snapshot ${version.value}.`,
  twitterCard: 'summary_large_image',
})

function go(gameVersion: string) {
  navigateTo(`/changelog/${gameVersion}`)
}
</script>

<template>
  <div class="mx-auto max-w-[1400px] px-6 py-10 lg:px-10 lg:py-14">
    <!-- Hero -->
    <header class="mb-12 flex flex-wrap items-end justify-between gap-x-10 gap-y-6 border-b border-border pb-8">
      <div class="min-w-0">
        <p class="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
          wynn.tools / changelog
        </p>
        <h1
          class="font-display text-[clamp(48px,8vw,92px)] font-extrabold leading-[0.9] tracking-[-0.035em] text-text"
        >
          {{ version }}
        </h1>
        <p v-if="fromVersion" class="mt-3 font-mono text-sm text-muted">
          <span class="text-faint">{{ fromVersion }}</span>
          <span class="mx-2 text-accent">→</span>
          <span class="text-text">{{ version }}</span>
        </p>
      </div>

      <ChangelogVersionPicker
        v-if="versions"
        :versions="versions"
        :current="version"
        @select="go"
      />
    </header>

    <p v-if="pending" class="font-mono text-sm uppercase tracking-wider text-muted">
      Loading…
    </p>

    <div
      v-else-if="error && !isUnknownVersion"
      class="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface px-5 py-4 text-sm"
    >
      <p class="text-text">
        Couldn't load the changelog for {{ version }}.
      </p>
      <button
        type="button"
        class="rounded-md bg-surface-hi px-3 py-1.5 font-medium text-accent ring-1 ring-border transition hover:bg-surface"
        @click="refresh()"
      >
        Retry
      </button>
    </div>

    <template v-else-if="filtered">
      <div
        v-if="filtered.note"
        class="mb-8 rounded-lg border-l-0 border border-accent/30 bg-accent/[0.06] px-5 py-4 text-sm text-text"
      >
        {{ filtered.note }}
      </div>

      <div class="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-x-14">
        <!-- Left rail -->
        <aside class="mb-10 lg:mb-0">
          <div class="lg:sticky lg:top-20 space-y-6">
            <div class="relative">
              <svg
                class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                v-model="query"
                type="search"
                placeholder="Search by name…"
                class="w-full rounded-md bg-bg/90 py-2 pl-9 pr-3 font-mono text-[13px] text-accent ring-1 ring-border placeholder:text-muted/70 focus:outline-none focus:ring-1 focus:ring-accent"
              >
            </div>

            <nav v-if="rail.length" aria-label="Sections" class="space-y-px">
              <p class="mb-2 px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
                On this page
              </p>
              <a
                v-for="s in rail"
                :key="s.id"
                :href="`#${s.id}`"
                class="group flex items-baseline justify-between gap-3 rounded px-2 py-1.5 text-[13px] text-muted transition hover:bg-accent/[0.06] hover:text-accent"
              >
                <span class="truncate">{{ s.label }}</span>
                <span class="shrink-0 font-mono text-[11px] tabular-nums text-faint group-hover:text-accent/70">
                  {{ s.count }}
                </span>
              </a>
            </nav>
          </div>
        </aside>

        <!-- Sections -->
        <div class="min-w-0 space-y-16">
          <ChangelogCategory
            v-if="filtered.items"
            id="sec-items"
            title="Items"
            :section="filtered.items"
            link-items
          />
          <ChangelogCategory
            v-if="filtered.tomes"
            id="sec-tomes"
            title="Tomes"
            :section="filtered.tomes"
          />
          <template v-if="filtered.aspects">
            <ChangelogCategory
              v-for="g in filtered.aspects"
              :id="`sec-aspects-${g.className}`"
              :key="`aspect-${g.className}`"
              :title="`Aspects · ${g.className}`"
              :section="g.section"
            />
          </template>
          <template v-if="filtered.atree">
            <ChangelogCategory
              v-for="g in filtered.atree"
              :id="`sec-atree-${g.className}`"
              :key="`atree-${g.className}`"
              :title="`Ability Tree · ${g.className}`"
              :section="g.section"
            />
          </template>

          <p v-if="filtered.isEmpty && !filtered.note" class="font-mono text-sm uppercase tracking-wider text-muted">
            No changes in this version.
          </p>
        </div>
      </div>
    </template>
  </div>
</template>
