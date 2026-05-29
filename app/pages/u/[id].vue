<script setup lang="ts">
import type { ApiBuildSummary, ApiItemSummary } from '~/composables/useApi'
import { useApi } from '~/composables/useApi'

const route = useRoute()
const api = useApi()
const userId = computed(() => String(route.params.id))

type Tab = 'builds' | 'items'
const activeTab = ref<Tab>('builds')

// Builds
const builds = ref<ApiBuildSummary[]>([])
const buildsNextCursor = ref<string | null>(null)
const buildsLoading = ref(false)

async function loadBuilds(cursor?: string) {
  buildsLoading.value = true
  try {
    const res = await api.getUserBuilds(userId.value, cursor, 20)
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
    const res = await api.getUserItems(userId.value, cursor, 20)
    items.value = cursor ? [...items.value, ...res.data] : res.data
    itemsNextCursor.value = res.nextCursor
  }
  finally {
    itemsLoading.value = false
  }
}

await useAsyncData(
  () => `user-${userId.value}`,
  () => Promise.all([loadBuilds(), loadItems()]),
  { watch: [userId] },
)

useSeoMeta({ title: 'User Profile — wynn.tools' })
</script>

<template>
  <div class="profile-page">
    <header class="profile-header">
      <h1 class="profile-name">
        User Profile
      </h1>
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

    <!-- Builds tab -->
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
          :owner-name="b.owner?.username"
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

    <!-- Items tab -->
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
          :owner-name="i.owner?.username"
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
  </div>
</template>

<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 32px 0;
}

.profile-header {
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
