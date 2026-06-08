<script setup lang="ts">
defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [v: string] }>()

function onInput(e: Event) {
  const t = (e.target as HTMLTextAreaElement).value.trim()
  emit('update:modelValue', t)
}
function onClear() {
  emit('update:modelValue', '')
}
</script>

<template>
  <section class="paste-box">
    <header class="kicker">
      Paste item string
    </header>
    <textarea
      :value="modelValue"
      placeholder="Paste a Wynntils-encoded item from in-game chat…"
      spellcheck="false"
      autocomplete="off"
      @input="onInput"
    />
    <button v-if="modelValue" type="button" class="clear" @click="onClear">
      Clear
    </button>
  </section>
</template>

<style scoped>
.paste-box {
  display: grid;
  gap: 0.5rem;
}
textarea {
  width: 100%;
  min-height: 6rem;
  padding: 0.6rem 0.7rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  font: 0.85rem/1.4 var(--font-mono, monospace);
  resize: vertical;
}
.clear {
  justify-self: start;
}
</style>
