<script setup lang="ts">
import type { StockCategory, StockClass, StockKind } from '~/lib/types/stock'

definePageMeta({ middleware: ['auth'] })

const form = reactive<{
  title: string
  kind: StockKind
  category: StockCategory
  classes: StockClass[]
  description: string
}>({
  title: '',
  kind: 'infobox',
  category: 'qol',
  classes: [],
  description: '',
})
const api = useStockApi()
const router = useRouter()
const submitting = ref(false)
const error = ref<string | null>(null)

async function submit() {
  submitting.value = true
  error.value = null
  try {
    const { slug } = await api.create({ ...form })
    await router.push(`/stock/${slug}/edit`)
  }
  catch (e) {
    error.value = (e as Error).message
  }
  finally {
    submitting.value = false
  }
}

useHead({ title: 'New Stock creation' })
</script>

<template>
  <div class="mx-auto max-w-lg space-y-4 p-4">
    <h1 class="text-xl font-semibold">
      New creation
    </h1>
    <input
      v-model="form.title"
      placeholder="Title"
      class="w-full rounded border border-border bg-surface px-3 py-2"
    >
    <select v-model="form.kind" class="w-full rounded border border-border bg-surface px-2 py-1.5">
      <option value="infobox">
        infobox
      </option>
      <option value="custom-bar">
        custom-bar
      </option>
      <option value="bundle">
        bundle
      </option>
    </select>
    <select v-model="form.category" class="w-full rounded border border-border bg-surface px-2 py-1.5">
      <option
        v-for="c in ['combat', 'party-ui', 'raid', 'lootrun', 'dps-meter', 'cooldown-tracker', 'resource-tracker', 'qol'] as const"
        :key="c"
        :value="c"
      >
        {{ c }}
      </option>
    </select>
    <textarea
      v-model="form.description"
      placeholder="Description"
      rows="4"
      class="w-full rounded border border-border bg-surface px-3 py-2"
    />
    <button
      class="rounded bg-accent px-3 py-1.5 text-bg disabled:opacity-50"
      :disabled="submitting || !form.title"
      @click="submit"
    >
      {{ submitting ? 'Creating…' : 'Create draft' }}
    </button>
    <p v-if="error" class="text-sm text-red-400">
      {{ error }}
    </p>
  </div>
</template>
