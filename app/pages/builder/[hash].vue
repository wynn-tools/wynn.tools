<script setup lang="ts">
import { useCdnClient } from '~/composables/useBuildData'
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
