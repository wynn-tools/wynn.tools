<script setup lang="ts">
import { loadBuildContext, peekVersionId, useCdnClient } from '~/composables/useBuildData'
import { extractBuildMeta } from '~/lib/build/build-meta'
import { computeBuild } from '~/lib/build/compute-build'
import { decodeRawBuild } from '~/lib/codec/build-codec'
import { WEP_TO_CLASS } from '~/lib/codec/wep-to-class'
import { useBuildStore } from '~/stores/build'

// Stable page key: editing a build calls router.replace('/builder/<newHash>') on
// every change. Without a constant key, Nuxt keys <NuxtPage> by route path and
// remounts the whole page each edit — recreating AtreeCanvas and resetting its
// inner scroll. A fixed key reuses the same component; the hash watcher below
// still reloads when the URL points at a genuinely different build.
definePageMeta({ key: 'builder' })

const route = useRoute()
const router = useRouter()
const store = useBuildStore()
const hash = computed(() => String(route.params.hash))

// --- SSR metadata ---
// Runs server-side on first request; re-runs on SPA navigation when hash changes.
// loadBuildContext has an in-memory cache, so the store's onMounted fetch is a
// cache hit — no double CDN round-trip on the client.
const { data: buildMeta } = await useAsyncData(
  () => `build-meta-${hash.value}`,
  async () => {
    try {
      const client = useCdnClient()
      const versionId = peekVersionId(hash.value)
      const loaded = await loadBuildContext(client, versionId)
      const raw = decodeRawBuild(hash.value, () => ({
        enc: loaded.enc,
        atreeData: loaded.ctx.atreeData,
        weaponType: loaded.weaponType,
      }))
      const result = computeBuild(raw, loaded.ctx)
      return extractBuildMeta(raw, loaded.ctx, loaded.weaponType, result)
    }
    catch {
      return null
    }
  },
  { watch: [hash] },
)

// Derive title from store when available (instant on edits), fall back to
// SSR-decoded meta (covers initial render before store hydrates).
const pageTitle = computed(() => {
  const raw = store.rawBuild
  const ctx = store.ctx
  if (raw && ctx) {
    const wid = raw.equipmentIds[8]
    const item = wid != null ? ctx.rawItemIndex.resolveId(wid) : null
    const wtype = item?.type as string | undefined
    const className = wtype ? (WEP_TO_CLASS[wtype] ?? 'Build') : 'Build'
    return `Level ${raw.level} ${className} — wynn.tools`
  }
  const meta = buildMeta.value
  return meta
    ? `Level ${meta.level} ${meta.className} — wynn.tools`
    : 'Wynncraft Build — wynn.tools'
})

const ogTitle = computed(() => {
  const meta = buildMeta.value
  return meta
    ? `Level ${meta.level} ${meta.className} — wynn.tools`
    : 'Wynncraft Build — wynn.tools'
})

const itemDescription = computed(() =>
  buildMeta.value?.items.filter(i => i.name !== '—').map(i => i.name).join(' · ') ?? '',
)

useSeoMeta({
  title: pageTitle,
  ogTitle,
  description: itemDescription,
  ogDescription: itemDescription,
  twitterCard: 'summary_large_image',
})

if (import.meta.server && buildMeta.value)
  defineOgImage('BuildCard', buildMeta.value)

// --- Existing load-from-hash logic (unchanged) ---
function syncFromRoute(h: string) {
  if (h && h !== store.currentHash)
    store.loadFromHash(h, useCdnClient())
}

onMounted(() => syncFromRoute(hash.value))
watch(hash, syncFromRoute)

// Edit → URL
watch(() => store.currentHash, (h) => {
  if (h && h !== hash.value)
    router.replace(`/builder/${h}`)
})
</script>

<template>
  <BuilderWorkspace />
</template>
