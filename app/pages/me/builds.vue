<script setup lang="ts">
import type { ApiBuildSummary } from '~/composables/useApi'
import { useApi } from '~/composables/useApi'

definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'My Builds — wynn.tools' })

const api = useApi()
const builds = ref<ApiBuildSummary[]>([])
const nextCursor = ref<string | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)
const mutateError = ref<string | null>(null)

async function load(cursor?: string) {
  loading.value = true
  loadError.value = null
  try {
    const res = await api.listMyBuilds(undefined, cursor, 20)
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

await useAsyncData('my-builds', () => load())

// Inline rename
const editingId = ref<string | null>(null)
const editingName = ref('')

function startRename(b: ApiBuildSummary) {
  editingId.value = b.id
  editingName.value = b.name
}

async function commitRename(b: ApiBuildSummary) {
  const name = editingName.value.trim()
  if (!name || name === b.name) {
    editingId.value = null
    return
  }
  try {
    await api.updateBuild(b.id, { name })
    b.name = name
  }
  catch (e: unknown) {
    mutateError.value = e instanceof Error ? e.message : 'Failed to rename'
  }
  editingId.value = null
}

// Visibility
const visibilities = ['public', 'unlisted', 'private'] as const

async function setVisibility(b: ApiBuildSummary, v: string) {
  try {
    await api.updateBuild(b.id, { visibility: v })
    b.visibility = v as 'public' | 'unlisted' | 'private'
  }
  catch (e: unknown) {
    mutateError.value = e instanceof Error ? e.message : 'Failed to update visibility'
  }
}

// Delete
const confirmDeleteId = ref<string | null>(null)

async function deleteBuild(id: string) {
  try {
    await api.deleteBuild(id)
    builds.value = builds.value.filter(b => b.id !== id)
  }
  catch (e: unknown) {
    mutateError.value = e instanceof Error ? e.message : 'Failed to delete'
  }
  confirmDeleteId.value = null
}
</script>

<template>
  <div class="list-page">
    <header class="list-header">
      <h1 class="list-title">
        My Builds
      </h1>
    </header>

    <p v-if="mutateError" class="mutate-error" role="alert">
      {{ mutateError }}
      <button type="button" @click="mutateError = null">
        ✕
      </button>
    </p>

    <p v-if="loadError" class="load-error" role="alert">
      {{ loadError }}
    </p>

    <div v-if="builds.length === 0 && !loading && !loadError" class="empty-state">
      No builds yet.
      <NuxtLink to="/builder">
        Create your first build →
      </NuxtLink>
    </div>

    <div v-else class="card-list">
      <div v-for="b in builds" :key="b.id" class="manage-card">
        <NuxtLink :to="`/b/${b.id}`" class="card-link">
          <input
            v-if="editingId === b.id"
            v-model="editingName"
            class="rename-input"
            type="text"
            maxlength="100"
            autofocus
            @keydown.enter="commitRename(b)"
            @keydown.escape="editingId = null"
            @blur="commitRename(b)"
            @click.prevent.stop
          >
          <span v-else class="card-name" @click.prevent.stop="startRename(b)">{{ b.name }}</span>
        </NuxtLink>

        <div class="card-actions">
          <span class="card-version">{{ b.gameVersion }}</span>
          <select
            class="visibility-select"
            :value="b.visibility ?? 'private'"
            @change="setVisibility(b, ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="v in visibilities" :key="v" :value="v">
              {{ v }}
            </option>
          </select>

          <template v-if="confirmDeleteId === b.id">
            <button class="action-btn action-btn--danger" type="button" @click="deleteBuild(b.id)">
              Confirm
            </button>
            <button class="action-btn" type="button" @click="confirmDeleteId = null">
              Cancel
            </button>
          </template>
          <button v-else class="action-btn action-btn--delete" type="button" @click="confirmDeleteId = b.id">
            Delete
          </button>
        </div>
      </div>
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

.card-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.manage-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.card-link {
  flex: 1;
  min-width: 0;
  text-decoration: none;
}

.card-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  cursor: text;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-name:hover {
  color: var(--color-accent);
}

.rename-input {
  width: 100%;
  background: var(--color-bg);
  color: var(--color-text);
  border: 1px solid oklch(65% 0.15 48 / 0.5);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 14px;
  font-weight: 500;
  outline: none;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.card-version {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-faint);
}

.visibility-select {
  font-size: 11px;
  color: var(--color-muted);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 3px 6px;
  cursor: pointer;
}

.action-btn {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-faint);
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 4px 10px;
  cursor: pointer;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out;
}

.action-btn:hover {
  color: var(--color-muted);
  border-color: var(--color-muted);
}

.action-btn--danger {
  color: oklch(62% 0.15 20);
  border-color: oklch(62% 0.15 20 / 0.4);
}

.action-btn--danger:hover {
  background: oklch(62% 0.15 20 / 0.06);
}

.action-btn--delete:hover {
  color: oklch(62% 0.15 20);
  border-color: oklch(62% 0.15 20 / 0.4);
}

.mutate-error {
  background: oklch(62% 0.15 20 / 0.08);
  border: 1px solid oklch(62% 0.15 20 / 0.3);
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 13px;
  color: oklch(62% 0.15 20);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0;
}

.mutate-error button {
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  font-size: 14px;
  padding: 0 2px;
  opacity: 0.7;
}

.load-error {
  font-size: 13px;
  color: oklch(62% 0.15 20);
  margin: 0;
  padding: 10px 14px;
  background: oklch(62% 0.15 20 / 0.08);
  border: 1px solid oklch(62% 0.15 20 / 0.3);
  border-radius: 6px;
}

.empty-state {
  font-size: 14px;
  color: var(--color-muted);
  padding: 32px 0;
}

.empty-state a {
  color: var(--color-accent);
  text-decoration: none;
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
