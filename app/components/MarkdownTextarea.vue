<script setup lang="ts">
import { computed, ref } from 'vue'
import NotesView from '~/components/BuildDetails/NotesView.vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    maxLength?: number
    rows?: number
    placeholder?: string
    id?: string
  }>(),
  { rows: 6, placeholder: '' },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'blur': [event: FocusEvent]
}>()

const tab = ref<'edit' | 'preview'>('edit')

const overCap = computed(() =>
  props.maxLength != null && props.modelValue.length > props.maxLength,
)
const counter = computed(() =>
  props.maxLength != null ? `${props.modelValue.length} / ${props.maxLength}` : '',
)

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLTextAreaElement).value)
}
</script>

<template>
  <div class="md-textarea">
    <div class="md-tabs">
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
      <span v-if="maxLength != null" class="counter" :class="{ over: overCap }">{{ counter }}</span>
      <slot name="actions" />
    </div>
    <textarea
      v-if="tab === 'edit'"
      :id="id"
      :value="modelValue"
      class="md-editor"
      :class="{ over: overCap }"
      :rows="rows"
      :placeholder="placeholder"
      @input="onInput"
      @blur="emit('blur', $event)"
    />
    <div v-else class="md-preview">
      <NotesView v-if="modelValue.trim()" :markdown="modelValue" />
      <span v-else class="preview-empty">Nothing to preview.</span>
    </div>
  </div>
</template>

<style scoped>
.md-textarea {
  width: 100%;
}
.md-tabs {
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
.md-editor {
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
  outline: none;
  transition: border-color 0.12s ease-out;
}
.md-editor:focus {
  border-color: color-mix(in oklch, var(--color-accent) 55%, transparent);
}
.md-editor.over {
  border-color: oklch(70% 0.18 25);
}
.md-preview {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 8px 10px;
  min-height: 120px;
}
.preview-empty {
  font-size: 12px;
  color: var(--color-faint);
}
</style>
