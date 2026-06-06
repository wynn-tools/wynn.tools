<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { parseYouTubeUrl } from '~/lib/build/youtube'

const props = defineProps<{ tutorialUrl: string | null }>()
const emit = defineEmits<{ save: [url: string | null] }>()

const editing = ref(false)
const draft = ref(props.tutorialUrl ?? '')
const error = ref<string | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

watch(() => props.tutorialUrl, (v) => {
  if (!editing.value)
    draft.value = v ?? ''
})

function startEdit() {
  draft.value = props.tutorialUrl ?? ''
  error.value = null
  editing.value = true
  nextTick(() => inputRef.value?.focus())
}

function commit() {
  const v = draft.value.trim()
  if (!v) {
    emit('save', null)
    error.value = null
    editing.value = false
    return
  }
  const parsed = parseYouTubeUrl(v)
  if (!parsed) {
    error.value = 'Must be a YouTube link'
    return
  }
  emit('save', parsed.canonical)
  error.value = null
  editing.value = false
}

function cancel() {
  draft.value = props.tutorialUrl ?? ''
  error.value = null
  editing.value = false
}

function clear() {
  emit('save', null)
  draft.value = ''
  editing.value = false
}
</script>

<template>
  <span class="tutorial-picker">
    <template v-if="!editing">
      <a
        v-if="tutorialUrl"
        class="tutorial-link"
        :href="tutorialUrl"
        target="_blank"
        rel="noopener"
      >↗ Watch tutorial</a>
      <button type="button" class="trigger" :class="{ secondary: tutorialUrl }" @click="startEdit">
        {{ tutorialUrl ? 'Edit' : '+ Add tutorial' }}
      </button>
      <button v-if="tutorialUrl" type="button" class="trigger secondary" @click="clear">×</button>
    </template>
    <template v-else>
      <input
        ref="inputRef"
        v-model="draft"
        type="text"
        class="inline-input"
        :class="{ invalid: !!error }"
        placeholder="https://youtu.be/…"
        @keydown.enter.prevent="commit"
        @keydown.esc.prevent="cancel"
        @blur="commit"
      >
      <span v-if="error" class="error">{{ error }}</span>
    </template>
  </span>
</template>

<style scoped>
.tutorial-picker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.tutorial-link {
  font-size: 12px;
  color: var(--color-accent);
  text-decoration: none;
  font-family: var(--font-mono);
}
.tutorial-link:hover {
  text-decoration: underline;
}
.trigger {
  background: transparent;
  border: 1px dashed var(--color-border);
  border-radius: 4px;
  padding: 2px 8px;
  color: var(--color-faint);
  font-size: 11px;
  cursor: pointer;
}
.trigger:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.trigger.secondary {
  border-style: solid;
}
.inline-input {
  font-size: 12px;
  padding: 3px 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  min-width: 240px;
}
.inline-input.invalid {
  border-color: oklch(70% 0.18 25);
}
.error {
  font-size: 11px;
  color: oklch(70% 0.18 25);
}
</style>
