<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import NotesView from './NotesView.vue'

const props = defineProps<{ notes: string | null }>()
const emit = defineEmits<{ save: [notes: string | null] }>()

const MAX = 8000
const draft = ref(props.notes ?? '')
const editing = ref(false)
const tab = ref<'edit' | 'preview'>('edit')

watch(() => props.notes, (n) => {
  if (!editing.value)
    draft.value = n ?? ''
})

const overCap = computed(() => draft.value.length > MAX)
const counter = computed(() => `${draft.value.length} / ${MAX}`)

let timer: ReturnType<typeof setTimeout> | null = null
function scheduleSave() {
  if (timer)
    clearTimeout(timer)
  timer = setTimeout(commit, 1500)
}

function commit() {
  if (overCap.value)
    return
  const next = draft.value.trim() ? draft.value : null
  if (next === props.notes)
    return
  emit('save', next)
}

function onBlur() {
  if (timer)
    clearTimeout(timer)
  commit()
}

function done() {
  if (timer)
    clearTimeout(timer)
  commit()
  editing.value = false
}

function startEdit() {
  draft.value = props.notes ?? ''
  editing.value = true
  tab.value = 'edit'
}
</script>

<template>
  <div class="notes-editor">
    <div v-if="!editing">
      <NotesView v-if="notes" :markdown="notes" />
      <button type="button" class="edit-trigger" @click="startEdit">
        {{ notes ? 'Edit notes' : '+ Add notes' }}
      </button>
    </div>
    <div v-else class="editor-shell">
      <div class="editor-tabs">
        <button
          type="button"
          class="tab"
          :class="{ active: tab === 'edit' }"
          @click="tab = 'edit'"
        >
          Edit
        </button>
        <button
          type="button"
          class="tab"
          :class="{ active: tab === 'preview' }"
          @click="tab = 'preview'"
        >
          Preview
        </button>
        <span class="counter" :class="{ over: overCap }">{{ counter }}</span>
        <button type="button" class="done" @click="done">
          Done
        </button>
      </div>
      <textarea
        v-if="tab === 'edit'"
        v-model="draft"
        class="editor-textarea"
        :class="{ over: overCap }"
        rows="6"
        placeholder="Build notes (markdown supported)…"
        @input="scheduleSave"
        @blur="onBlur"
      />
      <div v-else class="preview-pane">
        <NotesView :markdown="draft" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.notes-editor {
  width: 100%;
}
.edit-trigger {
  background: transparent;
  border: 1px dashed var(--color-border);
  border-radius: 6px;
  color: var(--color-faint);
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  margin-top: 6px;
}
.edit-trigger:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.editor-shell {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  padding: 8px;
}
.editor-tabs {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}
.tab {
  background: transparent;
  border: none;
  font-size: 12px;
  color: var(--color-faint);
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 4px;
}
.tab.active {
  color: var(--color-text);
  background: var(--color-surface-hi);
}
.counter {
  margin-left: auto;
  font-size: 11px;
  color: var(--color-faint);
}
.counter.over {
  color: oklch(70% 0.18 25);
}
.done {
  background: var(--color-accent);
  border: none;
  color: oklch(15% 0.01 265);
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
}
.editor-textarea {
  width: 100%;
  min-height: 120px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 8px 10px;
  color: var(--color-text);
  font-family: inherit;
  font-size: 13px;
  resize: vertical;
}
.editor-textarea.over {
  border-color: oklch(70% 0.18 25);
}
.preview-pane {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 8px 10px;
  min-height: 120px;
}
</style>
