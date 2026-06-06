<script setup lang="ts">
import type { ApiBuild } from '~/composables/useApi'
import { useApi } from '~/composables/useApi'
import { loadBuildContext, peekVersionId, useCdnClient } from '~/composables/useBuildData'
import { extractBuildMeta } from '~/lib/build/build-meta'
import { computeBuild } from '~/lib/build/compute-build'
import { stripMarkdown } from '~/lib/build/markdown'
import { decodeRawBuild } from '~/lib/codec/build-codec'
import { useAuthStore } from '~/stores/auth'
import { useBuildStore } from '~/stores/build'

// Stable page key prevents remounts when URL params change within this route
definePageMeta({ key: 'saved-build' })

const route = useRoute()
const router = useRouter()
const api = useApi()
const auth = useAuthStore()
const store = useBuildStore()

const id = computed(() => String(route.params.id))
const config = useRuntimeConfig()

const { data: build, error } = await useAsyncData<ApiBuild>(
  () => `build-${id.value}`,
  () => api.getBuild(id.value),
  { watch: [id] },
)

if (error.value || !build.value) {
  await navigateTo('/')
  throw createError({ statusCode: 404 })
}

const isOwner = computed(() =>
  !!auth.user && !!build.value?.owner && build.value.owner.id === auth.user.id,
)

const { data: buildMeta } = await useAsyncData(
  () => `build-meta-${id.value}`,
  async () => {
    const hash = build.value?.buildString
    if (!hash)
      return null
    try {
      const client = useCdnClient()
      const versionId = peekVersionId(hash)
      const loaded = await loadBuildContext(client, versionId)
      const recipes = loaded.ctx.craftContext?.recipes
      const WEAPON_RECIPE_TYPES = new Set(['spear', 'wand', 'dagger', 'bow', 'relik'])
      const raw = decodeRawBuild(hash, () => ({
        enc: loaded.enc,
        atreeData: loaded.ctx.atreeData,
        weaponType: loaded.weaponType,
        recipeIsWeapon: recipes
          ? (rid: number) => {
              const rec = recipes.get(rid)
              return rec ? WEAPON_RECIPE_TYPES.has(rec.type) : false
            }
          : () => false,
      }))
      const result = computeBuild(raw, loaded.ctx)
      return extractBuildMeta(raw, loaded.ctx, loaded.weaponType, result, build.value?.name ?? null)
    }
    catch {
      return null
    }
  },
  { watch: [id] },
)

const ogTitle = computed(() =>
  build.value ? `${build.value.name} — wynn.tools` : 'Build — wynn.tools',
)

const itemDescription = computed(() =>
  buildMeta.value?.items.filter(i => i.name !== '—').map(i => i.name).join(' · ') ?? '',
)

const seoDescription = computed(() => {
  const notes = stripMarkdown(build.value?.notes ?? '', 200)
  return notes || itemDescription.value
})

useSeoMeta({
  title: ogTitle,
  ogTitle,
  description: seoDescription,
  ogDescription: seoDescription,
  twitterCard: 'summary_large_image',
  ogImage: computed(() => `${config.public.apiBaseUrl}/v1/og/build/${id.value}`),
})

function syncBuild(b: ApiBuild | null | undefined) {
  if (b?.buildString)
    store.loadFromHash(b.buildString, useCdnClient())
}

onMounted(() => syncBuild(build.value))
watch(build, syncBuild)

function fork() {
  if (build.value?.buildString)
    router.push(`/builder/${build.value.buildString}`)
}

async function onRemoveMeCredit() {
  if (!build.value)
    return
  try {
    await api.removeMyCreditFromBuild(build.value.id)
    const fresh = await api.getBuild(build.value.id)
    build.value = fresh
  }
  catch (err) {
    console.error('Failed to remove credit', err)
  }
}
</script>

<template>
  <div>
    <BuildDetailsHeader
      v-if="build"
      :build="build"
      :viewer-id="auth.user?.id ?? null"
      :is-owner="isOwner"
      @fork="fork"
      @remove-me-credit="onRemoveMeCredit"
    />
    <BuilderWorkspace :saved-id="isOwner ? id : undefined" :is-owner="isOwner" :visibility="build?.visibility" />
  </div>
</template>
