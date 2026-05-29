<script setup lang="ts">
import type { ApiBuildSummary, ApiItemSummary, ApiProfile, ApiProfilePrivate } from '~/composables/useApi'
import { useApi } from '~/composables/useApi'

const route = useRoute()
const api = useApi()
const userId = computed(() => String(route.params.id))

// Profile
const { data: profileData, error: profileError } = await useAsyncData<ApiProfile | ApiProfilePrivate>(
  () => `profile-${userId.value}`,
  () => api.getProfile(userId.value),
  { watch: [userId] },
)

if (profileError.value) {
  await navigateTo('/')
  throw createError({ statusCode: 404 })
}

const isPrivate = computed(() => !!profileData.value && 'private' in profileData.value)
const profile = computed(() =>
  !isPrivate.value && profileData.value ? (profileData.value as ApiProfile) : null,
)

function avatarUrl(discordId: string, avatar: string) {
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.webp?size=80`
}

useSeoMeta({
  title: computed(() =>
    profile.value ? `${profile.value.name} — wynn.tools` : 'User Profile — wynn.tools',
  ),
})

type Tab = 'builds' | 'items'
const activeTab = ref<Tab>('builds')

// Builds
const builds = ref<ApiBuildSummary[]>([])
const buildsNextCursor = ref<string | null>(null)
const buildsLoading = ref(false)

async function loadBuilds(cursor?: string) {
  buildsLoading.value = true
  try {
    const res = await api.getUserBuilds(userId.value, undefined, cursor, 20)
    builds.value = cursor ? [...builds.value, ...res.data] : res.data
    buildsNextCursor.value = res.nextCursor
  }
  finally {
    buildsLoading.value = false
  }
}

// Items
const items = ref<ApiItemSummary[]>([])
const itemsNextCursor = ref<string | null>(null)
const itemsLoading = ref(false)

async function loadItems(cursor?: string) {
  itemsLoading.value = true
  try {
    const res = await api.getUserItems(userId.value, undefined, cursor, 20)
    items.value = cursor ? [...items.value, ...res.data] : res.data
    itemsNextCursor.value = res.nextCursor
  }
  finally {
    itemsLoading.value = false
  }
}

if (!isPrivate.value) {
  await useAsyncData(
    () => `user-content-${userId.value}`,
    () => Promise.all([loadBuilds(), loadItems()]),
    { watch: [userId] },
  )
}
</script>

<template>
  <div class="profile-page">
    <!-- Private profile -->
    <div v-if="isPrivate" class="private-state">
      <p class="private-message">
        This profile is private.
      </p>
    </div>

    <!-- Public profile -->
    <template v-else-if="profile">
      <header class="profile-header">
        <img
          v-if="profile.avatar"
          :src="avatarUrl(profile.discordId, profile.avatar)"
          :alt="profile.name"
          class="profile-avatar"
          width="56"
          height="56"
        >
        <div class="profile-info">
          <h1 class="profile-name">
            {{ profile.name }}
          </h1>
          <p v-if="profile.bio" class="profile-bio">
            {{ profile.bio }}
          </p>
        </div>
      </header>

      <div class="tabs" role="tablist">
        <button
          class="tab"
          :class="{ 'tab--active': activeTab === 'builds' }"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'builds'"
          @click="activeTab = 'builds'"
        >
          Builds
        </button>
        <button
          class="tab"
          :class="{ 'tab--active': activeTab === 'items' }"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'items'"
          @click="activeTab = 'items'"
        >
          Items
        </button>
      </div>

      <div v-if="activeTab === 'builds'" role="tabpanel">
        <div v-if="builds.length === 0 && !buildsLoading" class="empty-state">
          No public builds.
        </div>
        <div v-else class="card-grid">
          <BuildCard
            v-for="b in builds"
            :id="b.id"
            :key="b.id"
            :name="b.name"
            :game-version="b.gameVersion"
            :owner-id="b.owner?.id"
            :owner-name="b.owner?.name"
          />
        </div>
        <div v-if="buildsNextCursor" class="load-more">
          <button
            class="load-more-btn"
            type="button"
            :disabled="buildsLoading"
            @click="loadBuilds(buildsNextCursor ?? undefined)"
          >
            {{ buildsLoading ? 'Loading…' : 'Load more' }}
          </button>
        </div>
      </div>

      <div v-if="activeTab === 'items'" role="tabpanel">
        <div v-if="items.length === 0 && !itemsLoading" class="empty-state">
          No public items.
        </div>
        <div v-else class="card-grid">
          <ItemCard
            v-for="i in items"
            :id="i.id"
            :key="i.id"
            :name="i.name"
            :game-version="i.gameVersion"
            :owner-id="i.owner?.id"
            :owner-name="i.owner?.name"
            :craft-hash="i.craftHash"
          />
        </div>
        <div v-if="itemsNextCursor" class="load-more">
          <button
            class="load-more-btn"
            type="button"
            :disabled="itemsLoading"
            @click="loadItems(itemsNextCursor ?? undefined)"
          >
            {{ itemsLoading ? 'Loading…' : 'Load more' }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 32px 0;
}

.private-state {
  padding: 48px 0;
}
.private-message {
  font-size: 14px;
  color: var(--color-muted);
  margin: 0;
}

.profile-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.profile-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid var(--color-border);
  flex-shrink: 0;
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.profile-name {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}
.profile-bio {
  font-size: 13px;
  color: var(--color-muted);
  margin: 0;
}

.tabs {
  display: flex;
  gap: 2px;
  border-bottom: 1px solid var(--color-border);
}

.tab {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-muted);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 8px 16px;
  margin-bottom: -1px;
  cursor: pointer;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out;
}

.tab:hover {
  color: var(--color-text);
}
.tab--active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}
.empty-state {
  font-size: 14px;
  color: var(--color-muted);
  padding: 24px 0;
}

.load-more {
  display: flex;
  justify-content: center;
  margin-top: 12px;
}
.load-more-btn {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 8px 20px;
  cursor: pointer;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out;
}
.load-more-btn:not(:disabled):hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.load-more-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
