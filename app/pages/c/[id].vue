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

const visibilityLabel = computed(() => {
  const v = item.value?.visibility
  return v === 'public' ? 'Public' : v === 'unlisted' ? 'Unlisted' : 'Private'
})

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
    <header v-if="item" class="craft-header">
      <div class="header-inner">
        <div class="header-row header-row-1">
          <h1 class="header-name">
            {{ item.name }}
          </h1>
          <div class="header-actions">
            <span class="visibility-chip" :data-visibility="item.visibility">{{ visibilityLabel }}</span>
            <button v-if="!isOwner" type="button" class="fork-btn" @click="fork">
              Fork <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
        <div class="header-row header-row-2">
          <span class="byline">
            By
            <NuxtLink v-if="item.owner" :to="`/u/${item.owner.username ?? item.owner.id}`" class="byline-owner">{{ item.owner.name }}</NuxtLink>
            <span v-else class="byline-owner">Anonymous</span>
          </span>
        </div>
      </div>
    </header>
    <CrafterWorkspace :saved-id="isOwner ? id : undefined" :is-owner="isOwner" :visibility="item?.visibility" />
  </div>
</template>

<style scoped>
.craft-header {
  width: 100vw;
  margin-inline: calc(50% - 50vw);
  border-bottom: 1px solid var(--color-border);
  padding: 14px max(40px, calc(50vw - var(--shell-max) / 2 + 40px));
  display: flex;
  justify-content: center;
}
.header-inner {
  width: 100%;
  max-width: var(--shell-max);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.header-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.header-row-1 {
  justify-content: space-between;
}
.header-name {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.2;
}
.header-actions {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}
.visibility-chip {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  color: var(--color-faint);
}
.visibility-chip[data-visibility='public'] {
  color: var(--color-accent);
  border-color: color-mix(in oklch, var(--color-accent) 40%, var(--color-border));
}
.fork-btn {
  background: transparent;
  border: none;
  color: var(--color-faint);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  padding: 4px 8px;
  display: inline-flex;
  gap: 6px;
  align-items: center;
}
.fork-btn:hover {
  color: var(--color-accent);
}
.byline {
  font-size: 13px;
  color: var(--color-muted);
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}
.byline-owner {
  color: var(--color-text);
  text-decoration: none;
}
.byline-owner:hover {
  color: var(--color-accent);
}

@media (max-width: 720px) {
  .craft-header {
    padding-inline: var(--shell-pad-mobile, 14px);
  }
}
</style>
