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

useSeoMeta({
  title: ogTitle,
  ogTitle,
  description: itemDescription,
  ogDescription: itemDescription,
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
</script>

<template>
  <div>
    <div v-if="build && !isOwner" class="fork-bar">
      <span class="fork-label">
        <span class="fork-kicker">Viewing build by</span>
        <NuxtLink v-if="build.owner" :to="`/u/${build.owner.id}`" class="fork-owner-link">{{ build.owner.name }}</NuxtLink>
        <span v-else class="fork-owner-anon">Anonymous</span>
      </span>
      <button class="fork-btn" type="button" @click="fork">
        Fork this build <span class="fork-btn-arrow" aria-hidden="true">→</span>
      </button>
    </div>
    <BuilderWorkspace :saved-id="isOwner ? id : undefined" :is-owner="isOwner" :visibility="build?.visibility" />
  </div>
</template>

<style scoped>
.fork-bar {
  width: 100vw;
  margin-inline: calc(50% - 50vw);
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  max-width: none;
  padding: 10px max(40px, calc(50vw - var(--shell-max) / 2 + 40px));
  border-bottom: 1px solid var(--color-border);
}

.fork-label {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  color: var(--color-muted);
  font-size: 13px;
}

.fork-kicker {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-faint);
}

.fork-owner-link {
  color: var(--color-text);
  text-decoration: none;
  font-weight: 600;
  transition: color 0.12s ease-out;
}

.fork-owner-link:hover,
.fork-owner-link:focus-visible {
  color: var(--color-accent);
  outline: none;
}

.fork-owner-anon {
  color: var(--color-muted);
  font-style: italic;
}

.fork-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-faint);
  background: transparent;
  border: none;
  padding: 4px 0;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.12s ease-out;
}

.fork-btn:hover {
  color: var(--color-accent);
}

.fork-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: 3px;
  color: var(--color-accent);
}

.fork-btn-arrow {
  display: inline-block;
  transition: transform 0.12s ease-out;
}

.fork-btn:hover .fork-btn-arrow,
.fork-btn:focus-visible .fork-btn-arrow {
  transform: translateX(3px);
}

@media (max-width: 720px) {
  .fork-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 10px max(14px, calc(50vw - var(--shell-max) / 2 + 14px));
  }
}

@media (max-width: 600px) {
  .fork-bar {
    padding-inline: var(--shell-pad-mobile, 14px);
  }
  .fork-kicker {
    font-size: 10px;
  }
}
</style>
