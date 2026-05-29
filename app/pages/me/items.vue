<script setup lang="ts">
import type { ApiItemSummary } from '~/composables/useApi'
import { useApi } from '~/composables/useApi'

definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'My Items — wynn.tools' })

const api = useApi()
const items = ref<ApiItemSummary[]>([])
const nextCursor = ref<string | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)
const mutateError = ref<string | null>(null)

async function load(cursor?: string) {
  loading.value = true
  loadError.value = null
  try {
    const res = await api.listMyItems(undefined, cursor, 20)
    items.value = cursor ? [...items.value, ...res.data] : res.data
    nextCursor.value = res.nextCursor
  }
  catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load items'
  }
  finally {
    loading.value = false
  }
}

await useAsyncData('my-items', () => load())

// Inline rename
const editingId = ref<string | null>(null)
const editingName = ref('')

function startRename(i: ApiItemSummary) {
  editingId.value = i.id
  editingName.value = i.name
}

async function commitRename(i: ApiItemSummary) {
  const name = editingName.value.trim()
  if (!name || name === i.name) {
    editingId.value = null
    return
  }
  try {
    await api.updateItem(i.id, { name })
    i.name = name
  }
  catch (e: unknown) {
    mutateError.value = e instanceof Error ? e.message : 'Failed to rename'
  }
  editingId.value = null
}

// Visibility
const visibilities = ['public', 'unlisted', 'private'] as const

async function setVisibility(i: ApiItemSummary, v: string) {
  try {
    await api.updateItem(i.id, { visibility: v })
    i.visibility = v as 'public' | 'unlisted' | 'private'
  }
  catch (e: unknown) {
    mutateError.value = e instanceof Error ? e.message : 'Failed to update visibility'
  }
}

// Delete
const confirmDeleteId = ref<string | null>(null)

async function deleteItem(id: string) {
  try {
    await api.deleteItem(id)
    items.value = items.value.filter(i => i.id !== id)
  }
  catch (e: unknown) {
    mutateError.value = e instanceof Error ? e.message : 'Failed to delete'
  }
  confirmDeleteId.value = null
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <div class="tabs" role="tablist">
        <button role="tab" aria-selected="false" @click="navigateTo('/me/builds')">
          My Builds
        </button>
        <button role="tab" class="on" aria-selected="true" @click="navigateTo('/me/items')">
          My Items
        </button>
      </div>
    </div>

    <p v-if="mutateError" class="mutate-error" role="alert">
      {{ mutateError }}
      <button type="button" @click="mutateError = null">
        ✕
      </button>
    </p>

    <p v-if="loadError" class="load-error" role="alert">
      {{ loadError }}
    </p>

    <div v-if="items.length === 0 && !loading && !loadError" class="empty-state">
      No items yet.
      <NuxtLink to="/crafter">
        Craft your first item in the Crafter →
      </NuxtLink>
    </div>

    <div v-else class="row-list">
      <div v-for="i in items" :key="i.id" class="manage-row">
        <div class="row-name-col">
          <input
            v-if="editingId === i.id"
            v-model="editingName"
            class="rename-input"
            type="text"
            maxlength="100"
            autofocus
            @keydown.enter="commitRename(i)"
            @keydown.escape="editingId = null"
            @blur="commitRename(i)"
          >
          <NuxtLink v-else :to="`/c/${i.id}`" class="row-name">
            {{ i.name }}
          </NuxtLink>
        </div>

        <div class="row-actions">
          <span class="row-version">{{ i.gameVersion }}</span>
          <select
            class="visibility-select"
            :value="i.visibility ?? 'private'"
            @change="setVisibility(i, ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="v in visibilities" :key="v" :value="v">
              {{ v }}
            </option>
          </select>

          <button
            v-if="editingId !== i.id"
            class="action-btn"
            type="button"
            @click="startRename(i)"
          >
            Rename
          </button>

          <template v-if="confirmDeleteId === i.id">
            <button class="action-btn action-btn--danger" type="button" @click="deleteItem(i.id)">
              Confirm
            </button>
            <button class="action-btn" type="button" @click="confirmDeleteId = null">
              Cancel
            </button>
          </template>
          <button v-else class="action-btn action-btn--delete" type="button" @click="confirmDeleteId = i.id">
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
.page {
  padding: 20px 0 64px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding-bottom: 20px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--color-border);
}

.tabs {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.tabs button {
  background: transparent;
  border: 0;
  border-radius: 5px;
  color: var(--color-muted);
  padding: 6px 14px;
  cursor: pointer;
  font: 600 12px/1 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  transition:
    color 0.12s ease-out,
    background 0.12s ease-out;
}

.tabs button:hover {
  color: var(--color-text);
}

.tabs button.on {
  color: var(--color-accent);
  background: oklch(65% 0.15 48 / 0.08);
}

.tabs button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.row-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.manage-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  transition: border-color 0.12s ease-out;
}

.manage-row:hover {
  border-color: var(--color-faint);
}

.row-name-col {
  flex: 1;
  min-width: 0;
}

.row-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.12s ease-out;
}

.row-name:hover {
  color: var(--color-accent);
}

.rename-input {
  width: 100%;
  background: var(--color-bg);
  color: var(--color-text);
  border: 1px solid oklch(65% 0.15 48 / 0.5);
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 14px;
  font-weight: 500;
  outline: none;
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.row-version {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-faint);
  margin-right: 4px;
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
  padding: 56px 20px;
  text-align: center;
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
