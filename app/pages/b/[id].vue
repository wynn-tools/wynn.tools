<script setup lang="ts">
import type { ApiBuild } from '~/composables/useApi'
import { useApi } from '~/composables/useApi'
import { loadBuildContext, peekVersionId, useCdnClient } from '~/composables/useBuildData'
import { extractBuildMeta } from '~/lib/build/build-meta'
import { computeBuild } from '~/lib/build/compute-build'
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

useSeoMeta({
  title: ogTitle,
  ogTitle,
  description: itemDescription,
  ogDescription: itemDescription,
  twitterCard: 'summary_large_image',
})

if (import.meta.server && buildMeta.value)
  defineOgImage('BuildCard', buildMeta.value)

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
</script>

<template>
  <div>
    <div v-if="build && !isOwner" class="fork-bar">
      <span class="fork-label">
        Viewing build by
        <NuxtLink v-if="build.owner" :to="`/u/${build.owner.id}`" class="fork-owner-link">{{ build.owner.name }}</NuxtLink>
        <span v-else>Anonymous</span>
      </span>
      <button class="fork-btn" type="button" @click="fork">
        Fork this build →
      </button>
    </div>
    <BuilderWorkspace :saved-id="isOwner ? id : undefined" :is-owner="isOwner" :visibility="build?.visibility" />
  </div>
</template>

<style scoped>
.fork-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 40px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  font-size: 12px;
}

.fork-label {
  color: var(--color-muted);
}

.fork-btn {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-accent);
  background: none;
  border: 1px solid color-mix(in oklch, var(--color-accent) 40%, transparent);
  border-radius: 5px;
  padding: 4px 12px;
  cursor: pointer;
  transition: border-color 0.12s ease-out;
}

.fork-btn:hover {
  border-color: var(--color-accent);
}

.fork-owner-link {
  color: var(--color-accent);
  text-decoration: none;
}
.fork-owner-link:hover {
  text-decoration: underline;
}
</style>
