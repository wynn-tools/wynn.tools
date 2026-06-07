<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import MarkdownTextarea from '~/components/MarkdownTextarea.vue'
import NotesView from './NotesView.vue'

const props = defineProps<{ notes: string | null }>()
const emit = defineEmits<{ save: [notes: string | null] }>()

const MAX = 8000
const draft = ref(props.notes ?? '')
const editing = ref(false)

watch(() => props.notes, (n) => {
  if (!editing.value)
    draft.value = n ?? ''
})

const overCap = computed(() => draft.value.length > MAX)

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
      <MarkdownTextarea
        v-model="draft"
        :max-length="MAX"
        placeholder="Build notes (markdown supported)…"
        @update:model-value="scheduleSave"
        @blur="onBlur"
      >
        <template #actions>
          <button type="button" class="done" @click="done">
            Done
          </button>
        </template>
      </MarkdownTextarea>
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
.done {
  background: var(--color-accent);
  border: none;
  color: oklch(15% 0.01 265);
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
}
</style>
