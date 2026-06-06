<script setup lang="ts">
import type { IdConstraint } from '~/lib/items-search/types'
import { allIdentificationKeys, filterLabel } from '~/lib/data/identifications'

const model = defineModel<{ constraints: IdConstraint[] }>({ required: true })

const _options = allIdentificationKeys
  .map(key => ({ key, label: filterLabel(key) }))
  .sort((a, b) => a.label.localeCompare(b.label))

const labelToKey = Object.fromEntries(_options.map(o => [o.label, o.key]))

const idRows = computed(() => model.value.constraints.filter(
  (c): c is Extract<IdConstraint, { kind: 'id' }> => c.kind === 'id',
))

const availableLabels = computed(() =>
  _options.filter(o => !idRows.value.some(c => c.key === o.key)).map(o => o.label),
)

const addModel = ref<string | null>(null)
watch(addModel, (v) => {
  if (!v)
    return
  const key = labelToKey[v]
  if (key)
    addRow(key)
  addModel.value = null
})

function update(constraints: IdConstraint[]) {
  model.value = { constraints }
}

function addRow(key: string) {
  if (key && !idRows.value.some(c => c.key === key))
    update([...model.value.constraints, { kind: 'id', key }])
}

function removeRow(key: string) {
  update(model.value.constraints.filter(c => !(c.kind === 'id' && c.key === key)))
}

function toggleExclude(key: string) {
  update(model.value.constraints.map((c) => {
    if (c.kind !== 'id' || c.key !== key)
      return c
    const nowExclude = !c.exclude
    return nowExclude
      ? { kind: 'id', key, exclude: true }
      : { kind: 'id', key }
  }))
}

function toggleSort(key: string) {
  update(model.value.constraints.map((c) => {
    if (c.kind !== 'id' || c.key !== key)
      return c
    const cur = c.sort
    if (!cur)
      return { ...c, sort: 'desc' }
    if (cur === 'desc')
      return { ...c, sort: 'asc' }
    const { sort: _drop, ...rest } = c
    return rest
  }))
}

function label(key: string) {
  return filterLabel(key)
}

function sortDir(key: string) {
  return idRows.value.find(c => c.key === key)?.sort ?? null
}

function isExcluded(key: string) {
  return idRows.value.find(c => c.key === key)?.exclude ?? false
}
</script>

<template>
  <div class="idlist">
    <FilterCombobox
      v-if="availableLabels.length"
      v-model="addModel"
      :options="availableLabels"
      placeholder="+ Add identification…"
    />
    <ul class="idlist-rows">
      <li v-for="f in idRows" :key="f.key" class="idlist-row">
        <span class="idlist-label">{{ label(f.key) }}</span>
        <button type="button" :class="{ on: f.exclude }" @click="toggleExclude(f.key)">
          {{ f.exclude ? 'exclude' : 'include' }}
        </button>
        <button type="button" :disabled="isExcluded(f.key)" @click="toggleSort(f.key)">
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
