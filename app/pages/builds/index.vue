<script setup lang="ts">
import type { ApiBuildSummary } from '~/composables/useApi'
import { useApi } from '~/composables/useApi'

useSeoMeta({
  title: 'Public Builds — wynn.tools',
  description: 'Browse Wynncraft builds shared by the community.',
})

const api = useApi()
const builds = ref<ApiBuildSummary[]>([])
const nextCursor = ref<string | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)

async function load(cursor?: string) {
  loading.value = true
  loadError.value = null
  try {
    const res = await api.listPublicBuilds(cursor, 20)
    builds.value = cursor ? [...builds.value, ...res.data] : res.data
    nextCursor.value = res.nextCursor
  }
  catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load builds'
  }
  finally {
    loading.value = false
  }
}

await useAsyncData('public-builds', () => load())
</script>

<template>
  <div class="list-page">
    <header class="list-header">
      <h1 class="list-title">
        Public Builds
      </h1>
    </header>

    <p v-if="loadError" class="error-text">
      {{ loadError }}
    </p>

    <div v-else-if="builds.length === 0 && !loading" class="empty-state">
      No builds shared yet.
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

    <div v-if="nextCursor" class="load-more">
      <button class="load-more-btn" type="button" :disabled="loading" @click="load(nextCursor ?? undefined)">
        {{ loading ? 'Loading…' : 'Load more' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.list-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 32px 0;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.list-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.empty-state {
  font-size: 14px;
  color: var(--color-muted);
  padding: 32px 0;
}

.error-text {
  color: oklch(62% 0.15 20);
  font-size: 14px;
}

.load-more {
  display: flex;
  justify-content: center;
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
