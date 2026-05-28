<script setup lang="ts">
import { useCdnClient } from '~/composables/useBuildData'
import { useCraftStore } from '~/stores/craft'

useSeoMeta({
  title: 'Wynncraft Item Crafter — wynn.tools',
  ogTitle: 'Wynncraft Item Crafter — wynn.tools',
  description: 'Plan and share Wynncraft crafted items.',
  ogDescription: 'Plan and share Wynncraft crafted items.',
  twitterCard: 'summary_large_image',
})

const store = useCraftStore()

onMounted(async () => {
  // -1 → "latest snapshot"; the store resolves it via resolveLatestVersionId.
  await store.loadFresh(-1, useCdnClient())
})
</script>

<template>
  <CrafterWorkspace />
</template>
