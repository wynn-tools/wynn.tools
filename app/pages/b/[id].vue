<script setup lang="ts">
import type { ApiBuild } from '~/composables/useApi'
import { useApi } from '~/composables/useApi'
import { useCdnClient } from '~/composables/useBuildData'
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

useSeoMeta({
  title: computed(() => build.value ? `${build.value.name} — wynn.tools` : 'Build — wynn.tools'),
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
  border: 1px solid oklch(65% 0.15 48 / 0.4);
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
