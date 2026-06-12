<script setup lang="ts">
import type { MediaInput } from '~/composables/useStockApi'

interface Row {
  blobSha256: string
  caption: string
  previewUrl: string | null
  uploading: boolean
}

const props = defineProps<{
  modelValue: MediaInput[]
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: MediaInput[]): void
}>()

const MAX = 8
const CAPTION_MAX = 200

const api = useStockApi()
const rows = ref<Row[]>(props.modelValue.map(m => ({
  blobSha256: m.blobSha256,
  caption: m.caption ?? '',
  previewUrl: null,
  uploading: false,
})))
const error = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const dragIndex = ref<number | null>(null)

watch(rows, (next) => {
  emit('update:modelValue', next.map(r => ({
    blobSha256: r.blobSha256,
    caption: r.caption.trim() === '' ? null : r.caption,
  })))
}, { deep: true })

async function addFiles(files: FileList | null) {
  if (!files)
    return
  error.value = null
  const room = MAX - rows.value.length
  const list = Array.from(files).slice(0, room)
  for (const file of list) {
    const previewUrl = URL.createObjectURL(file)
    const row: Row = { blobSha256: '', caption: '', previewUrl, uploading: true }
    rows.value.push(row)
    try {
      const { sha256 } = await api.upload(file)
      row.blobSha256 = sha256
      row.uploading = false
    }
    catch (e) {
      error.value = (e as Error).message
      rows.value = rows.value.filter(r => r !== row)
      URL.revokeObjectURL(previewUrl)
    }
  }
  if (fileInput.value)
    fileInput.value.value = ''
}

function remove(i: number) {
  const r = rows.value[i]
  if (r.previewUrl)
    URL.revokeObjectURL(r.previewUrl)
  rows.value.splice(i, 1)
}

function onDragStart(i: number) {
  dragIndex.value = i
}
function onDragOver(e: DragEvent) {
  e.preventDefault()
}
function onDrop(i: number) {
  const from = dragIndex.value
  dragIndex.value = null
  if (from === null || from === i)
    return
  const [moved] = rows.value.splice(from, 1)
  rows.value.splice(i, 0, moved)
}

function thumbFor(r: Row): string {
  return r.previewUrl ?? api.blobUrl(r.blobSha256)
}

onBeforeUnmount(() => {
  for (const r of rows.value) {
    if (r.previewUrl)
      URL.revokeObjectURL(r.previewUrl)
  }
})
</script>

<template>
  <div class="ed">
    <ul v-if="rows.length" class="rows">
      <li
        v-for="(r, i) in rows"
        :key="i"
        class="row"
        :class="{ uploading: r.uploading }"
        draggable="true"
        @dragstart="onDragStart(i)"
        @dragover="onDragOver"
        @drop="onDrop(i)"
      >
        <span class="handle" aria-hidden="true">≡</span>
        <img class="thumb" :src="thumbFor(r)" alt="">
        <input
          v-model="r.caption"
          class="cap"
          type="text"
          :maxlength="CAPTION_MAX"
          placeholder="caption (optional)"
        >
        <span class="counter">{{ r.caption.length }}/{{ CAPTION_MAX }}</span>
        <button type="button" class="rm" @click="remove(i)">
          remove
        </button>
      </li>
    </ul>
    <div class="add">
      <input
        ref="fileInput"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        hidden
        @change="addFiles(($event.target as HTMLInputElement).files)"
      >
      <button
        type="button"
        class="btn-add"
        :disabled="rows.length >= MAX"
        @click="fileInput?.click()"
      >
        {{ rows.length >= MAX ? `Max ${MAX} screenshots` : '+ Add screenshots' }}
      </button>
    </div>
    <p v-if="error" class="err">
      {{ error }}
    </p>
  </div>
</template>

<style scoped>
.ed {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.row {
  display: grid;
  grid-template-columns: 16px 64px 1fr auto auto;
  align-items: center;
  gap: 10px;
  padding: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}
.row.uploading {
  opacity: 0.6;
}
.handle {
  color: var(--color-faint);
  cursor: grab;
  user-select: none;
}
.thumb {
  width: 64px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
  background: var(--color-bg);
}
.cap {
  background: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 6px 8px;
  font: 13px/1.4 var(--font-sans);
}
.counter {
  font: 500 11px/1 var(--font-mono);
  color: var(--color-faint);
}
.rm {
  font: 600 11px/1 var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-muted);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 6px 10px;
  cursor: pointer;
}
.rm:hover {
  color: var(--color-text);
}
.btn-add {
  font: 600 11px/1 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-accent);
  background: color-mix(in oklch, var(--color-accent) 8%, transparent);
  border: 1px dashed var(--color-accent);
  border-radius: 6px;
  padding: 10px 16px;
  cursor: pointer;
}
.btn-add:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  border-style: solid;
}
.err {
  margin: 0;
  font-size: 13px;
  color: oklch(70% 0.18 25);
}
</style>
