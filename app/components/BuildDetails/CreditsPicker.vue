<script setup lang="ts">
import type { ApiBuildCredit, ApiUserSearchResult } from '~/composables/useApi'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { computed, ref, watch } from 'vue'
import { useApi } from '~/composables/useApi'

const props = defineProps<{
  credits: readonly ApiBuildCredit[]
  ownerId: string
}>()
const emit = defineEmits<{ change: [credits: ApiBuildCredit[]] }>()

const api = useApi()
const open = ref(false)
const query = ref('')
const results = ref<ApiUserSearchResult[]>([])
const searching = ref(false)
const atCap = computed(() => props.credits.length >= 10)

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(query, (q) => {
  if (searchTimer)
    clearTimeout(searchTimer)
  if (!q.trim()) {
    results.value = []
    return
  }
  searchTimer = setTimeout(async () => {
    searching.value = true
    try {
      const res = await api.searchUsers(q.trim())
      results.value = res.data.filter(u => u.id !== props.ownerId && !props.credits.some(c => c.id === u.id))
    }
    catch {
      results.value = []
    }
    finally {
      searching.value = false
    }
  }, 200)
})

function add(u: ApiUserSearchResult) {
  if (atCap.value)
    return
  emit('change', [...props.credits, { id: u.id, username: u.username, displayName: u.name, avatar: u.avatar }])
  query.value = ''
  results.value = []
}

function remove(id: string) {
  emit('change', props.credits.filter(c => c.id !== id))
}

function moveUp(i: number) {
  if (i === 0)
    return
  const next = [...props.credits]
  ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
  emit('change', next)
}

function moveDown(i: number) {
  if (i === props.credits.length - 1)
    return
  const next = [...props.credits]
  ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
  emit('change', next)
}
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger as-child>
      <button type="button" class="credits-trigger">
        {{ credits.length === 0 ? '+ Add credit' : 'Edit credits' }}
      </button>
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent class="credits-pop" :side-offset="6">
        <input
          v-model="query"
          type="text"
          class="credits-input"
          :placeholder="atCap ? 'Max 10 credits' : 'Search users…'"
          :disabled="atCap"
          autofocus
        >
        <ul v-if="results.length > 0" class="credits-results">
          <li v-for="u in results" :key="u.id">
            <button type="button" class="result-btn" @click="add(u)">
              <img v-if="u.avatar" :src="u.avatar" alt="" class="avatar">
              <span>{{ u.name }}</span>
            </button>
          </li>
        </ul>
        <p v-else-if="query && !searching" class="credits-empty">
          No matches
        </p>

        <ul v-if="credits.length > 0" class="credits-current">
          <li v-for="(c, i) in credits" :key="c.id" class="current-row">
            <img v-if="c.avatar" :src="c.avatar" alt="" class="avatar">
            <span class="current-name">{{ c.displayName }}</span>
            <span class="row-actions">
              <button type="button" class="row-btn" :disabled="i === 0" aria-label="Move up" @click="moveUp(i)">↑</button>
              <button type="button" class="row-btn" :disabled="i === credits.length - 1" aria-label="Move down" @click="moveDown(i)">↓</button>
              <button type="button" class="row-btn remove" aria-label="Remove" @click="remove(c.id)">×</button>
            </span>
          </li>
        </ul>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>

<style scoped>
.credits-trigger {
  background: transparent;
  border: 1px dashed var(--color-border);
  border-radius: 999px;
  padding: 3px 10px;
  color: var(--color-faint);
  font-size: 11px;
  cursor: pointer;
}
.credits-trigger:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.credits-pop {
  width: 340px;
  background: var(--color-surface-hi);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px;
  z-index: 50;
}
.credits-input {
  width: 100%;
  padding: 6px 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  margin-bottom: 8px;
}
.credits-results,
.credits-current {
  list-style: none;
  padding: 0;
  margin: 0 0 8px 0;
}
.credits-current {
  border-top: 1px solid var(--color-border);
  padding-top: 8px;
}
.result-btn,
.current-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  border-radius: 6px;
  width: 100%;
  text-align: left;
}
.result-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-text);
}
.result-btn:hover {
  background: var(--color-surface);
}
.avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}
.result-user,
.current-user {
  color: var(--color-faint);
  font-size: 11px;
}
.current-name {
  color: var(--color-text);
  font-size: 13px;
}
.row-actions {
  margin-left: auto;
  display: inline-flex;
  gap: 2px;
}
.row-btn {
  background: transparent;
  border: none;
  color: var(--color-faint);
  cursor: pointer;
  padding: 2px 6px;
  font-size: 12px;
}
.row-btn:hover:not(:disabled) {
  color: var(--color-text);
}
.row-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.row-btn.remove:hover {
  color: oklch(70% 0.18 25);
}
.credits-empty {
  color: var(--color-muted);
  font-size: 12px;
  margin: 4px 0;
}
</style>
