<script setup lang="ts">
import { useCdnClient } from '~/composables/useBuildData'
import { useCraftStore } from '~/stores/craft'

// Stable page key so editing — which the workspace reflects into the URL via
// history.replaceState — doesn't remount the component tree. (See the matching
// pattern in pages/builder/[hash].vue.)
definePageMeta({ key: 'crafter' })

const route = useRoute()
const store = useCraftStore()
const hash = computed(() => String(route.params.hash))

useSeoMeta({
  title: 'Wynncraft Crafted Item — wynn.tools',
  ogTitle: 'Wynncraft Crafted Item — wynn.tools',
  description: 'Shared Wynncraft crafted item.',
  ogDescription: 'Shared Wynncraft crafted item.',
  twitterCard: 'summary_large_image',
})

function syncFromRoute(h: string): void {
  // Skip when the store already matches — avoids reloading on our own
  // replaceState writes (workspace updates the URL on every store mutation).
  if (h && h !== store.shareHash)
    store.loadFromHash(h, useCdnClient())
}

onMounted(() => syncFromRoute(hash.value))
watch(hash, syncFromRoute)
</script>

<template>
  <CrafterWorkspace />
</template>
