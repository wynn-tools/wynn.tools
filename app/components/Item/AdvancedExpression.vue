<script setup lang="ts">
import type { IdConstraint } from '~/lib/items-search/types'
import { parseExpression } from '~/lib/items-search/expression'

const model = defineModel<IdConstraint[]>({ required: true })

const open = ref(false)
const draft = ref(
  (model.value.find(c => c.kind === 'expr') as Extract<IdConstraint, { kind: 'expr' }> | undefined)?.source ?? '',
)
const error = ref<string | null>(null)
let timer: ReturnType<typeof setTimeout> | null = null

function commit() {
  const src = draft.value.trim()
  const others = model.value.filter(c => c.kind !== 'expr')
  if (!src) {
    error.value = null
    model.value = others
    return
  }
  const parsed = parseExpression(src)
  if (parsed.ok) {
    error.value = null
    model.value = [...others, { kind: 'expr', source: src }]
  }
  else {
    error.value = parsed.error
  }
}

function onInput(e: Event) {
  draft.value = (e.target as HTMLInputElement).value
  if (timer)
    clearTimeout(timer)
  timer = setTimeout(commit, 120)
}
</script>

<template>
  <div class="adv">
    <button type="button" class="adv-toggle" :aria-expanded="open" @click="open = !open">
      Advanced expression filter
      <span class="adv-chev" :class="{ open }">›</span>
    </button>
    <div v-if="open" class="adv-body">
      <input
        type="text" class="adv-input" :value="draft" spellcheck="false" autocomplete="off"
        placeholder="str + dex >= 10 and rawSpellDmg > 100"
        @input="onInput"
      >
      <p v-if="error" class="adv-error">
        {{ error }}
      </p>
      <p class="adv-hint">
        Operators: + - * / and or not &gt;= &lt;= &gt; &lt; == !=. Use short codes (str, dex, manaRegen) or canonical keys. Wrap roll ends in min(x) / max(x) / raw(x).
      </p>
    </div>
  </div>
</template>

<style scoped>
.adv {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.adv-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
  background: transparent;
  border: 0;
  padding: 6px 0;
  cursor: pointer;
}
.adv-toggle:hover {
  color: var(--color-text);
}
.adv-chev {
  transition: transform 0.15s ease-out;
}
.adv-chev.open {
  transform: rotate(90deg);
}
.adv-input {
  width: 100%;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 8px 10px;
  color: var(--color-text);
}
.adv-input:focus-visible {
  outline: 0;
  border-color: var(--color-accent);
}
.adv-error {
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.4;
  color: var(--color-faint);
}
.adv-hint {
  font-size: 11px;
  line-height: 1.4;
  color: var(--color-faint);
}
</style>
