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
</script>

<template>
  <div>
    <div v-if="item && !isOwner" class="fork-bar">
      <span class="fork-label">
        Viewing item by
        <NuxtLink v-if="item.owner" :to="`/u/${item.owner.id}`" class="fork-owner-link">{{ item.owner.name }}</NuxtLink>
        <span v-else>Anonymous</span>
      </span>
      <button class="fork-btn" type="button" @click="fork">
        Fork this item →
      </button>
    </div>
    <CrafterWorkspace :saved-id="isOwner ? id : undefined" :is-owner="isOwner" :visibility="item?.visibility" />
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
