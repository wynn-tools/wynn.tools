<script setup lang="ts">
import type { PartInput } from '~/composables/useStockApi'
import StockPartEditor from '~/components/stock/StockPartEditor.vue'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const router = useRouter()
const slug = String(route.params.slug)
const api = useStockApi()
const { data: creation } = await useAsyncData(`edit-${slug}`, () => api.get(slug))
if (!creation.value)
  throw createError({ statusCode: 404 })

const hasPublished = computed(() => creation.value!.latestVersion?.status === 'published')
const meta = reactive({
  title: creation.value.title,
  description: creation.value.description,
  kind: creation.value.kind,
  category: creation.value.category,
  classes: [...creation.value.classes],
  creditsNote: creation.value.creditsNote,
})

const draftVersionNumber = ref<number | null>(null)
const parts = ref<PartInput[]>([])
const saving = ref(false)
const publishing = ref(false)
const message = ref<string | null>(null)

async function ensureDraft() {
  const latest = creation.value!.latestVersion
  if (latest && latest.status === 'draft') {
    draftVersionNumber.value = latest.number
    parts.value = latest.parts.map(p => ({
      role: p.role,
      name: p.name,
      description: p.description,
      group: p.group,
      textContent: p.textContent,
      blobSha256: p.blobSha256,
      blobFilename: p.blobFilename,
    }))
    return
  }
  const next = await api.createVersion(slug, `v${(latest?.number ?? 0) + 1}`)
  draftVersionNumber.value = next.number
  parts.value = []
}
await ensureDraft()

function addPart() {
  parts.value.push({ role: 'function', name: 'New part', textContent: '' })
}

async function saveDraft() {
  saving.value = true
  message.value = null
  try {
    await api.patch(slug, meta)
    await api.patchVersion(slug, draftVersionNumber.value!, { parts: parts.value })
    message.value = 'Draft saved.'
  }
  catch (e) {
    message.value = (e as Error).message
  }
  finally {
    saving.value = false
  }
}

async function publish() {
  publishing.value = true
  message.value = null
  try {
    await api.patch(slug, meta)
    await api.patchVersion(slug, draftVersionNumber.value!, { parts: parts.value })
    await api.publish(slug, draftVersionNumber.value!)
    await router.push(`/stock/${slug}`)
  }
  catch (e) {
    message.value = (e as Error).message
    publishing.value = false
  }
}

useHead({ title: `Edit: ${creation.value.title}` })
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6 p-4">
    <h1 class="text-xl font-semibold">
      Edit: {{ creation!.title }}
    </h1>
    <section class="grid gap-2">
      <input
        v-model="meta.title"
        :disabled="hasPublished"
        class="rounded border border-border bg-surface px-3 py-2 disabled:opacity-50"
      >
      <textarea
        v-model="meta.description"
        rows="3"
        class="rounded border border-border bg-surface px-3 py-2"
      />
      <textarea
        v-model="meta.creditsNote"
        placeholder="Credits notes (markdown)"
        rows="2"
        class="rounded border border-border bg-surface px-3 py-2"
      />
    </section>

    <section class="space-y-2">
      <h2 class="kicker">
        Parts (draft v{{ draftVersionNumber }})
      </h2>
      <StockPartEditor
        v-for="(_, i) in parts"
        :key="i"
        v-model:part="parts[i]"
        @remove="parts.splice(i, 1)"
      />
      <button class="rounded border border-border px-3 py-1.5 text-sm" @click="addPart">
        + Add part
      </button>
    </section>

    <div class="flex items-center gap-2">
      <button
        class="rounded border border-border px-4 py-1.5 disabled:opacity-50"
        :disabled="saving || publishing"
        @click="saveDraft"
      >
        {{ saving ? 'Saving…' : 'Save draft' }}
      </button>
      <button
        class="rounded bg-accent px-4 py-1.5 text-bg disabled:opacity-50"
        :disabled="saving || publishing"
        @click="publish"
      >
        {{ publishing ? 'Publishing…' : 'Publish' }}
      </button>
      <p v-if="message" class="text-sm text-muted">
        {{ message }}
      </p>
    </div>
  </div>
</template>
