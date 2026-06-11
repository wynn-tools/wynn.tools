<script setup lang="ts">
import type { StockCategory, StockClass, StockKind } from '~/lib/types/stock'

definePageMeta({ middleware: ['auth'] })

const KINDS: { value: StockKind, label: string }[] = [
  { value: 'infobox', label: 'Info box' },
  { value: 'custom-bar', label: 'Custom bar' },
  { value: 'bundle', label: 'Bundle' },
]
const CATEGORIES: { value: StockCategory, label: string }[] = [
  { value: 'combat', label: 'Combat' },
  { value: 'party-ui', label: 'Party UI' },
  { value: 'raid', label: 'Raid' },
  { value: 'lootrun', label: 'Lootrun' },
  { value: 'dps-meter', label: 'DPS meter' },
  { value: 'cooldown-tracker', label: 'Cooldowns' },
  { value: 'resource-tracker', label: 'Resources' },
  { value: 'qol', label: 'QoL' },
]
const CLASSES: { value: StockClass, label: string }[] = [
  { value: 'warrior', label: 'Warrior' },
  { value: 'archer', label: 'Archer' },
  { value: 'mage', label: 'Mage' },
  { value: 'assassin', label: 'Assassin' },
  { value: 'shaman', label: 'Shaman' },
]

const form = reactive({
  title: '',
  kind: 'infobox' as StockKind,
  category: 'qol' as StockCategory,
  classes: [] as StockClass[],
  description: '',
})

const api = useStockApi()
const router = useRouter()
const submitting = ref(false)
const error = ref<string | null>(null)

function toggleClass(c: StockClass) {
  const i = form.classes.indexOf(c)
  if (i === -1)
    form.classes.push(c)
  else
    form.classes.splice(i, 1)
}

async function submit() {
  if (!form.title.trim() || submitting.value)
    return
  submitting.value = true
  error.value = null
  try {
    const { slug } = await api.create({ ...form })
    await router.push(`/stock/${slug}/edit`)
  }
  catch (e) {
    error.value = (e as Error).message
    submitting.value = false
  }
}

useHead({ title: 'New stock creation — wynn.tools' })
</script>

<template>
  <div class="page">
    <nav class="topbar">
      <NuxtLink to="/stock" class="topbar-back">
        ‹ All stock
      </NuxtLink>
      <span class="topbar-title">New creation</span>
    </nav>

    <form class="form" @submit.prevent="submit">
      <section class="block">
        <h2 class="kicker block-head">
          Details
        </h2>

        <div class="field">
          <label class="field-label" for="title">Title</label>
          <input
            id="title"
            v-model="form.title"
            class="f-input"
            type="text"
            placeholder="e.g. Lootrun Beacon HUD"
            maxlength="80"
            required
          >
        </div>

        <div class="field">
          <label class="field-label" for="description">Description</label>
          <textarea
            id="description"
            v-model="form.description"
            class="f-input field-area"
            rows="4"
            placeholder="What does it do, who's it for, anything to know before installing."
            maxlength="600"
          />
          <p class="field-hint">
            {{ form.description.length }} / 600
          </p>
        </div>

        <fieldset class="f-group f-group--col">
          <legend>Kind</legend>
          <div class="chips">
            <button
              v-for="k in KINDS"
              :key="k.value"
              type="button"
              :class="{ on: form.kind === k.value }"
              @click="form.kind = k.value"
            >
              {{ k.label }}
            </button>
          </div>
        </fieldset>

        <fieldset class="f-group f-group--col">
          <legend>Category</legend>
          <div class="chips">
            <button
              v-for="c in CATEGORIES"
              :key="c.value"
              type="button"
              :class="{ on: form.category === c.value }"
              @click="form.category = c.value"
            >
              {{ c.label }}
            </button>
          </div>
        </fieldset>

        <fieldset class="f-group f-group--col">
          <legend>Classes <span class="legend-hint">multi-select, optional</span></legend>
          <div class="chips">
            <button
              v-for="cls in CLASSES"
              :key="cls.value"
              type="button"
              :class="{ on: form.classes.includes(cls.value) }"
              @click="toggleClass(cls.value)"
            >
              {{ cls.label }}
            </button>
          </div>
        </fieldset>
      </section>

      <div class="actions">
        <NuxtLink to="/stock" class="btn-ghost">
          Cancel
        </NuxtLink>
        <button
          type="submit"
          class="btn-primary"
          :disabled="submitting || !form.title.trim()"
        >
          {{ submitting ? 'Creating draft…' : 'Continue to parts →' }}
        </button>
      </div>

      <p v-if="error" class="error">
        {{ error }}
      </p>
    </form>
  </div>
</template>

<style scoped>
.page {
  padding: 20px 0 64px;
  max-width: 720px;
  margin: 0 auto;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 16px;
  margin-bottom: 28px;
  border-bottom: 1px solid var(--color-border);
}
.topbar-back {
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
  text-decoration: none;
  transition: color 0.12s ease-out;
}
.topbar-back:hover {
  color: var(--color-accent);
}
.topbar-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.block {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.block-head {
  margin: 0 0 4px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-muted);
}
.field-area {
  resize: vertical;
  min-height: 96px;
  line-height: 1.5;
  font-family: var(--font-sans);
}
.field-hint {
  margin: 0;
  align-self: flex-end;
  font: 500 11px/1 var(--font-mono);
  color: var(--color-faint);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.legend-hint {
  margin-left: auto;
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
  color: var(--color-faint);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid var(--color-border);
}

.btn-ghost {
  font: 600 11px/1 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 9px 16px;
  cursor: pointer;
  text-decoration: none;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out;
}
.btn-ghost:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.btn-primary {
  font: 600 11px/1 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-accent);
  background: color-mix(in oklch, var(--color-accent) 8%, transparent);
  border: 1px solid var(--color-accent);
  border-radius: 6px;
  padding: 9px 16px;
  cursor: pointer;
  transition: background 0.12s ease-out;
}
.btn-primary:hover:not(:disabled) {
  background: color-mix(in oklch, var(--color-accent) 18%, transparent);
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error {
  margin: 0;
  font-size: 13px;
  color: oklch(70% 0.18 25);
}

@media (max-width: 720px) {
  .page {
    padding: 12px 16px 48px;
  }
  .actions {
    flex-direction: column-reverse;
    align-items: stretch;
  }
}
</style>
