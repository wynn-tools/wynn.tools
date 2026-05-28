<script setup lang="ts">
import { useCdnClient } from '~/composables/useBuildData'
import { latestGameVersion } from '~/composables/useChangelogData'

useSeoMeta({
  title: 'Changelog — wynn.tools',
  ogTitle: 'Changelog — wynn.tools',
  description: 'Track data changes across Wynncraft game versions.',
  ogDescription: 'Track data changes across Wynncraft game versions.',
  twitterCard: 'summary_large_image',
})

const { data: latest } = await useAsyncData('changelog-latest', () =>
  latestGameVersion(useCdnClient()))

watchEffect(() => {
  if (latest.value)
    navigateTo(`/changelog/${latest.value}`, { replace: true })
})
</script>

<template>
  <div class="p-10 text-sm text-muted">
    Loading changelog…
  </div>
</template>
