<script setup lang="ts">
import type { IdFilter, IdSort } from '~/lib/items-search/types'
import { allIdentificationKeys, humanizeField } from '~/lib/data/identifications'

const model = defineModel<{ identifications: IdFilter[], idSorts: IdSort[] }>({ required: true })

const options = allIdentificationKeys
  .map(key => ({ key, label: humanizeField(key).label }))
  .sort((a, b) => a.label.localeCompare(b.label))

const ids = computed(() => model.value.identifications)

function update(identifications: IdFilter[], idSorts: IdSort[]) {
  model.value = { identifications, idSorts }
}

function addRow(key: string) {
  if (key && !ids.value.some(f => f.key === key))
    update([...ids.value, { key, exclude: false }], model.value.idSorts)
}
function removeRow(key: string) {
  update(
    ids.value.filter(f => f.key !== key),
    model.value.idSorts.filter(s => s.key !== key),
  )
}
function toggleExclude(key: string) {
  const identifications = ids.value.map(f => f.key === key ? { ...f, exclude: !f.exclude } : f)
  const nowExcluded = identifications.find(f => f.key === key)?.exclude
  const idSorts = nowExcluded
    ? model.value.idSorts.filter(s => s.key !== key)
    : model.value.idSorts
  update(identifications, idSorts)
}
function toggleSort(key: string) {
  const existing = model.value.idSorts.find(s => s.key === key)
  let idSorts: IdSort[]
  if (!existing)
    idSorts = [...model.value.idSorts, { key, dir: 'desc' }]
  else if (existing.dir === 'desc')
    idSorts = model.value.idSorts.map(s => s.key === key ? { ...s, dir: 'asc' } : s)
  else
    idSorts = model.value.idSorts.filter(s => s.key !== key)
  update(ids.value, idSorts)
}
function label(key: string) {
  return humanizeField(key).label
}
function sortDir(key: string) {
  return model.value.idSorts.find(s => s.key === key)?.dir ?? null
}
</script>

<template>
  <div class="idlist">
    <select class="idlist-add" @change="addRow(($event.target as HTMLSelectElement).value); ($event.target as HTMLSelectElement).value = ''">
      <option value="">
        + Add identification…
      </option>
      <option v-for="o in options" :key="o.key" :value="o.key">
        {{ o.label }}
      </option>
    </select>
    <ul class="idlist-rows">
      <li v-for="f in ids" :key="f.key" class="idlist-row">
        <span class="idlist-label">{{ label(f.key) }}</span>
        <button type="button" :class="{ on: f.exclude }" @click="toggleExclude(f.key)">
          {{ f.exclude ? 'exclude' : 'include' }}
        </button>
        <button type="button" :disabled="f.exclude" @click="toggleSort(f.key)">
          {{ sortDir(f.key) === 'desc' ? '↓' : sortDir(f.key) === 'asc' ? '↑' : 'sort' }}
        </button>
        <button type="button" class="idlist-x" @click="removeRow(f.key)">
          ✕
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.idlist {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.idlist-add {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 6px 8px;
  color: var(--color-text);
  font-size: 12px;
}
.idlist-rows {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.idlist-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.idlist-label {
  flex: 1;
  color: var(--color-text);
}
.idlist-row button {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-muted);
  font-size: 11px;
  padding: 2px 6px;
  cursor: pointer;
}
.idlist-row button.on {
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.idlist-row button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
