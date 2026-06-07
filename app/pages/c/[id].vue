<script setup lang="ts">
import type { ApiItem } from '~/composables/useApi'
import { useApi } from '~/composables/useApi'
import { useCdnClient } from '~/composables/useBuildData'
import { useAuthStore } from '~/stores/auth'
import { useCraftStore } from '~/stores/craft'

// Stable page key prevents remounts when URL params change within this route
definePageMeta({ key: 'saved-item' })

const route = useRoute()
const router = useRouter()
const api = useApi()
const auth = useAuthStore()
const store = useCraftStore()

const id = computed(() => String(route.params.id))

const { data: item, error } = await useAsyncData<ApiItem>(
  () => `item-${id.value}`,
  () => api.getItem(id.value),
  { watch: [id] },
)

if (error.value || !item.value) {
  await navigateTo('/')
  throw createError({ statusCode: 404 })
}

const isOwner = computed(() =>
  !!auth.user && !!item.value?.owner && item.value.owner.id === auth.user.id,
)

useSeoMeta({
  title: computed(() => item.value ? `${item.value.name} — wynn.tools` : 'Item — wynn.tools'),
})

function syncItem(i: ApiItem | null | undefined) {
  const craftHash = (i?.itemData as { craftHash?: string })?.craftHash
  if (craftHash)
    store.loadFromHash(craftHash, useCdnClient())
}

onMounted(() => syncItem(item.value))
watch(item, syncItem)

function fork() {
  const craftHash = (item.value?.itemData as { craftHash?: string })?.craftHash
  if (craftHash)
    router.push(`/crafter/${craftHash}`)
}

async function onUpdateTags(tags: string[]) {
  if (!item.value)
    return
  const prev = item.value.tags
  item.value = { ...item.value, tags }
  try {
    const res = await api.updateItem(item.value.id, { tags })
    if (item.value)
      item.value = { ...item.value, tags: res.tags }
  }
  catch (err) {
    console.error('Failed to update tags', err)
    if (item.value)
      item.value = { ...item.value, tags: prev }
  }
}

async function onUpdateNotes(notes: string | null) {
  if (!item.value)
    return
  const prev = item.value.notes
  item.value = { ...item.value, notes }
  try {
    const res = await api.updateItem(item.value.id, { notes })
    if (item.value)
      item.value = { ...item.value, notes: res.notes }
  }
  catch (err) {
    console.error('Failed to update notes', err)
    if (item.value)
      item.value = { ...item.value, notes: prev }
  }
}

async function onUpdateCredits(credits: { id: string, username: string, displayName: string, avatar: string | null }[]) {
  if (!item.value)
    return
  const prev = item.value.credits
  item.value = { ...item.value, credits }
  try {
    const res = await api.replaceItemCredits(item.value.id, credits.map(c => ({ userId: c.id })))
    if (item.value)
      item.value = { ...item.value, credits: res.credits }
  }
  catch (err) {
    console.error('Failed to update credits', err)
    if (item.value)
      item.value = { ...item.value, credits: prev }
  }
}

async function onRemoveMeCredit() {
  if (!item.value)
    return
  try {
    await api.removeMyCreditFromItem(item.value.id)
    const fresh = await api.getItem(item.value.id)
    item.value = fresh
  }
  catch (err) {
    console.error('Failed to remove credit', err)
  }
}
</script>

<template>
  <div>
    <ItemDetailsHeader
      v-if="item"
      :item="item"
      :viewer-id="auth.user?.id ?? null"
      :is-owner="isOwner"
      @fork="fork"
      @remove-me-credit="onRemoveMeCredit"
      @update-tags="onUpdateTags"
      @update-credits="onUpdateCredits"
      @update-notes="onUpdateNotes"
    />
    <CrafterWorkspace :saved-id="isOwner ? id : undefined" :is-owner="isOwner" :visibility="item?.visibility" />
  </div>
</template>
