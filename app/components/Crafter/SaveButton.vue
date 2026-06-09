<script setup lang="ts">
import { useApi } from '~/composables/useApi'
import { resolveLatestVersion, useCdnClient } from '~/composables/useBuildData'
import { useCraftStore } from '~/stores/craft'

const props = defineProps<{
  savedId?: string
  isOwner?: boolean
  visibility?: 'public' | 'unlisted' | 'private'
}>()

const store = useCraftStore()
const api = useApi()
const router = useRouter()
const client = useCdnClient()

async function onCreate({ name, visibility }: { name: string, visibility: 'public' | 'unlisted' | 'private' }) {
  if (!store.shareHash)
    return
  const { gameVersion } = await resolveLatestVersion(client)
  const res = await api.createItem({
    name,
    itemData: { craftHash: store.shareHash },
    gameVersion,
    visibility,
  })
  await router.push(`/c/${res.id}`)
}

async function onUpdate({ visibility }: { visibility: 'public' | 'unlisted' | 'private' }) {
  if (!store.shareHash || !props.savedId)
    return
  await api.updateItem(props.savedId, {
    itemData: { craftHash: store.shareHash },
    visibility,
  })
}
</script>

<template>
  <SaveEntityButton
    noun="item"
    default-name="My Item"
    :saved-id="savedId"
    :is-owner="isOwner"
    :visibility="visibility"
    :disabled="!store.shareHash || store.loading"
    :on-create="onCreate"
    :on-update="onUpdate"
  />
</template>
