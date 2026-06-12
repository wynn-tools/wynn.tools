<script setup lang="ts">
import type { MediaInput, PartInput } from '~/composables/useStockApi'
import type { StockCategory, StockClass, StockKind } from '~/lib/types/stock'
import ScreenshotsEditor from '~/components/stock/ScreenshotsEditor.vue'
import StockPartEditor from '~/components/stock/StockPartEditor.vue'

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
const versionLabel = ref('')
const versionChangelog = ref('')
const parts = ref<PartInput[]>([])
const media = ref<MediaInput[]>(
  (creation.value!.media ?? []).map(m => ({
    blobSha256: m.blobSha256,
    caption: m.caption,
  })),
)
const savingMedia = ref(false)

const saving = ref(false)
const publishing = ref(false)
const message = ref<{ kind: 'ok' | 'err', text: string } | null>(null)

// Snapshot baseline so we can flag dirty + warn on unsaved navigation.
let baseline = '' // hash-ish snapshot, set after ensureDraft
function snapshot() {
  return JSON.stringify({ meta, versionLabel: versionLabel.value, versionChangelog: versionChangelog.value, parts: parts.value })
}
const isDirty = computed(() => baseline !== '' && snapshot() !== baseline)

async function ensureDraft() {
  const latest = creation.value!.latestVersion
  try {
    const draft = await api.getDraft(slug)
    draftVersionNumber.value = draft.number
    versionLabel.value = draft.label
    versionChangelog.value = draft.changelog
    parts.value = draft.parts.map(p => ({
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
  catch (err) {
    const code = (err as { code?: string }).code
    if (code !== 'not_found')
      throw err
  }
  const nextLabel = `v${(latest?.number ?? 0) + 1}`
  const next = await api.createVersion(slug, nextLabel)
  draftVersionNumber.value = next.number
  versionLabel.value = nextLabel
  versionChangelog.value = ''
  parts.value = []
}

await ensureDraft()
await nextTick()
baseline = snapshot()

function addPart() {
  parts.value.push({ role: 'function', name: 'New part', textContent: '', group: null })
}
function toggleClass(c: StockClass) {
  const i = meta.classes.indexOf(c)
  if (i === -1)
    meta.classes.push(c)
  else
    meta.classes.splice(i, 1)
}

async function persist() {
  await api.patch(slug, meta)
  await api.patchVersion(slug, draftVersionNumber.value!, {
    label: versionLabel.value,
    changelog: versionChangelog.value,
    parts: parts.value,
  })
}

async function saveMedia() {
  if (savingMedia.value)
    return
  savingMedia.value = true
  message.value = null
  try {
    await api.replaceMedia(slug, media.value)
    message.value = { kind: 'ok', text: 'Screenshots saved.' }
  }
  catch (e) {
    message.value = { kind: 'err', text: (e as Error).message }
  }
  finally {
    savingMedia.value = false
  }
}

async function saveDraft() {
  if (saving.value || publishing.value)
    return
  saving.value = true
  message.value = null
  try {
    await persist()
    baseline = snapshot()
    message.value = { kind: 'ok', text: 'Draft saved.' }
  }
  catch (e) {
    message.value = { kind: 'err', text: (e as Error).message }
  }
  finally {
    saving.value = false
  }
}

async function publish() {
  if (saving.value || publishing.value)
    return
  publishing.value = true
  message.value = null
  try {
    await persist()
    await api.publish(slug, draftVersionNumber.value!)
    baseline = snapshot()
    await router.push(`/stock/${slug}`)
  }
  catch (e) {
    message.value = { kind: 'err', text: (e as Error).message }
    publishing.value = false
  }
}

function onBeforeUnload(e: BeforeUnloadEvent) {
  if (isDirty.value && !publishing.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))

useHead({ title: `Edit: ${creation.value.title}` })
</script>

<template>
  <div class="page">
    <nav class="topbar">
      <NuxtLink :to="`/stock/${slug}`" class="topbar-back">
        ‹ {{ creation!.title }}
      </NuxtLink>
      <span class="topbar-tag">Editing draft v{{ draftVersionNumber }}</span>
    </nav>

    <form class="form" @submit.prevent="saveDraft">
      <section class="block">
        <h2 class="kicker block-head">
          Details
        </h2>

        <div class="field">
          <label class="field-label" for="title">Title</label>
          <input
            id="title"
            v-model="meta.title"
            class="f-input"
            :disabled="hasPublished"
            type="text"
            maxlength="80"
          >
          <p v-if="hasPublished" class="field-hint">
            Title is locked once a version has been published.
          </p>
        </div>

        <div class="field">
          <label class="field-label" for="description">Description</label>
          <textarea
            id="description"
            v-model="meta.description"
            class="f-input field-area"
            rows="4"
            maxlength="600"
          />
          <p class="field-hint">
            {{ meta.description.length }} / 600
          </p>
        </div>

        <fieldset class="f-group f-group--col">
          <legend>Kind</legend>
          <div class="chips">
            <button
              v-for="k in KINDS"
              :key="k.value"
              type="button"
              :class="{ on: meta.kind === k.value }"
              @click="meta.kind = k.value"
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
              :class="{ on: meta.category === c.value }"
              @click="meta.category = c.value"
            >
              {{ c.label }}
            </button>
          </div>
        </fieldset>

        <fieldset class="f-group f-group--col">
          <legend>Classes</legend>
          <div class="chips">
            <button
              v-for="cls in CLASSES"
              :key="cls.value"
              type="button"
              :class="{ on: meta.classes.includes(cls.value) }"
              @click="toggleClass(cls.value)"
            >
              {{ cls.label }}
            </button>
          </div>
        </fieldset>

        <div class="field">
          <label class="field-label" for="credits">Credits</label>
          <textarea
            id="credits"
            v-model="meta.creditsNote"
            class="f-input field-area"
            rows="3"
            placeholder="Attribution or thanks. Markdown supported."
          />
        </div>
      </section>

      <section class="block">
        <h2 class="kicker block-head">
          Parts <span class="block-aux">{{ parts.length }}</span>
        </h2>
        <p class="block-hint">
          Required parts install automatically. Set a Group on two or more parts to make them a “pick-one” option.
        </p>

        <div v-if="parts.length" class="parts">
          <StockPartEditor
            v-for="(_, i) in parts"
            :key="i"
            v-model:part="parts[i]"
            @remove="parts.splice(i, 1)"
          />
        </div>
        <p v-else class="state">
          No parts yet. Add one to start the draft.
        </p>

        <button type="button" class="btn-add" @click="addPart">
          + Add part
        </button>
      </section>

      <section class="block">
        <h2 class="kicker block-head">
          Screenshots
        </h2>
        <p class="block-hint">
          Up to 8 images, max 2 MB each. PNG, JPEG, WebP, or GIF.
        </p>
        <ScreenshotsEditor v-model="media" />
        <div class="screenshots-actions">
          <button
            type="button"
            class="btn-primary"
            :disabled="savingMedia"
            @click="saveMedia"
          >
            {{ savingMedia ? 'Saving…' : 'Save screenshots' }}
          </button>
        </div>
      </section>

      <section class="block">
        <h2 class="kicker block-head">
          Publish
        </h2>
        <div class="publish-grid">
          <div class="field">
            <label class="field-label" for="vlabel">Version label</label>
            <input
              id="vlabel"
              v-model="versionLabel"
              class="f-input"
              type="text"
              placeholder="v1.2"
              maxlength="32"
            >
          </div>
          <div class="field publish-changelog">
            <label class="field-label" for="changelog">Changelog</label>
            <textarea
              id="changelog"
              v-model="versionChangelog"
              class="f-input field-area"
              rows="4"
              placeholder="What changed in this version."
              maxlength="1200"
            />
          </div>
        </div>
      </section>
    </form>

    <div class="action-bar" :class="{ 'action-bar--dirty': isDirty }">
      <div class="action-bar-inner">
        <span class="action-msg">
          <template v-if="message?.kind === 'ok'">
            <span class="msg-ok">{{ message.text }}</span>
          </template>
          <template v-else-if="message?.kind === 'err'">
            <span class="msg-err">{{ message.text }}</span>
          </template>
          <template v-else-if="isDirty">
            <span class="msg-dirty">Unsaved changes</span>
          </template>
          <template v-else>
            <span class="msg-clean">All changes saved</span>
          </template>
        </span>
        <NuxtLink :to="`/stock/${slug}`" class="btn-ghost">
          Cancel
        </NuxtLink>
        <button
          type="button"
          class="btn-ghost"
          :disabled="saving || publishing"
          @click="saveDraft"
        >
          {{ saving ? 'Saving…' : 'Save draft' }}
        </button>
        <button
          type="button"
          class="btn-primary"
          :disabled="saving || publishing || parts.length === 0"
          @click="publish"
        >
          {{ publishing ? 'Publishing…' : 'Publish' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 20px 0 120px;
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
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 50%;
}
.topbar-back:hover {
  color: var(--color-accent);
}
.topbar-tag {
  margin-left: auto;
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-accent);
  border: 1px solid color-mix(in oklch, var(--color-accent) 35%, transparent);
  border-radius: 6px;
  padding: 5px 10px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.block {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.block-head {
  margin: 0 0 2px;
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.block-aux {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-faint);
  letter-spacing: 0.06em;
  text-transform: none;
}
.block-hint {
  margin: 0;
  font-size: 12px;
  color: var(--color-muted);
  line-height: 1.5;
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
.f-input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
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

.parts {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn-add {
  align-self: flex-start;
  font: 600 11px/1 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
  background: transparent;
  border: 1px dashed var(--color-border);
  border-radius: 6px;
  padding: 8px 14px;
  cursor: pointer;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out;
}
.btn-add:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.publish-grid {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 14px;
}
.publish-changelog {
  grid-column: 1 / -1;
}

.action-bar {
  position: fixed;
  inset: auto 0 0 0;
  background: color-mix(in oklch, var(--color-bg) 92%, transparent);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--color-border);
  z-index: 50;
  transition: border-color 0.15s ease-out;
}
.action-bar--dirty {
  border-top-color: color-mix(in oklch, var(--color-accent) 40%, var(--color-border));
}
.action-bar-inner {
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
}
.action-msg {
  margin-right: auto;
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.msg-ok {
  color: var(--color-accent);
}
.msg-err {
  color: oklch(70% 0.18 25);
  text-transform: none;
  letter-spacing: 0;
}
.msg-dirty {
  color: var(--color-muted);
}
.msg-clean {
  color: var(--color-faint);
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
.btn-ghost:hover:not(:disabled) {
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.btn-ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.screenshots-actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 720px) {
  .page {
    padding: 12px 16px 140px;
  }
  .publish-grid {
    grid-template-columns: 1fr;
  }
  .action-bar-inner {
    flex-wrap: wrap;
    padding: 10px 12px;
    gap: 8px;
  }
  .action-msg {
    width: 100%;
    margin-right: 0;
    text-align: center;
  }
}
</style>
