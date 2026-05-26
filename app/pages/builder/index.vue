<script setup lang="ts">
import { useCdnClient } from '~/composables/useBuildData'
import { useBuildStore } from '~/stores/build'

useSeoMeta({
  title: 'Wynncraft Build Calculator — wynn.tools',
  ogTitle: 'Wynncraft Build Calculator — wynn.tools',
  description: 'Create and share Wynncraft builds.',
  ogDescription: 'Create and share Wynncraft builds.',
  twitterCard: 'summary_large_image',
})

const router = useRouter()
const store = useBuildStore()

// The empty build already has a (stable) hash once loaded; capture it so we can
// tell an actual edit from the initial state and only then move to the hash URL.
let initialHash: string | null = null

onMounted(async () => {
  await store.newBuild(useCdnClient())
  initialHash = store.currentHash
})

// First edit → switch to the canonical /builder/<hash> URL.
watch(() => store.currentHash, (h) => {
  if (h && initialHash !== null && h !== initialHash)
    router.replace(`/builder/${h}`)
})
</script>

<template>
  <BuilderWorkspace />
</template>
