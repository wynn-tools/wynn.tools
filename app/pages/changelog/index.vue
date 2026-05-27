<script setup lang="ts">
import { useCdnClient } from '~/composables/useBuildData'
import { latestGameVersion } from '~/composables/useChangelogData'

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
