<script setup lang="ts">
import { useApi } from '~/composables/useApi'
import { useBuildStore } from '~/stores/build'

const props = defineProps<{
  savedId?: string
  isOwner?: boolean
  visibility?: 'public' | 'unlisted' | 'private'
}>()

const store = useBuildStore()
const api = useApi()
const router = useRouter()

async function onCreate({ name, visibility }: { name: string, visibility: 'public' | 'unlisted' | 'private' }) {
  if (!store.currentHash)
    return
  const res = await api.createBuild({ name, buildString: store.currentHash, visibility })
  await router.push(`/b/${res.id}`)
}

async function onUpdate({ visibility }: { visibility: 'public' | 'unlisted' | 'private' }) {
  if (!store.currentHash || !props.savedId)
    return
  await api.updateBuild(props.savedId, { buildString: store.currentHash, visibility })
}
</script>

<template>
  <SaveEntityButton
    noun="build"
    default-name="My Build"
    :saved-id="savedId"
    :is-owner="isOwner"
    :visibility="visibility"
    :disabled="!store.currentHash || store.loading"
    :on-create="onCreate"
    :on-update="onUpdate"
  />
</template>
