<script setup lang="ts">
import type { PartInput } from '~/composables/useStockApi'

defineEmits<{ remove: [] }>()
const part = defineModel<PartInput>('part', { required: true })
const api = useStockApi()
const uploading = ref(false)
const uploadError = ref<string | null>(null)

const ROLES: PartInput['role'][] = ['function', 'infobox', 'resourcepack']

async function uploadPack(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f)
    return
  uploading.value = true
  uploadError.value = null
  try {
    const { sha256, mimeType } = await api.upload(f)
    if (mimeType !== 'application/zip')
      throw new Error('Not a zip file.')
    part.value.blobSha256 = sha256
    part.value.blobFilename = f.name
  }
  catch (err) {
    uploadError.value = (err as Error).message
  }
  finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="editor">
    <header class="editor-head">
      <select v-model="part.role" class="editor-role" aria-label="Role">
        <option v-for="r in ROLES" :key="r" :value="r">
          {{ r }}
        </option>
      </select>
      <input
        v-model="part.name"
        class="editor-name"
        type="text"
        placeholder="Part name"
      >
      <button
        type="button"
        class="editor-remove"
        aria-label="Remove part"
        @click="$emit('remove')"
      >
        ×
      </button>
    </header>

    <input
      v-model="part.group"
      class="editor-group"
      type="text"
      placeholder="Group (optional, makes this a 'pick-one' option)"
    >

    <textarea
      v-if="part.role !== 'resourcepack'"
      v-model="part.textContent"
      class="editor-body"
      rows="6"
      placeholder="Function or info-box markup"
    />

    <div v-else class="editor-upload">
      <label class="upload-label">
        <input type="file" accept=".zip,application/zip" :disabled="uploading" @change="uploadPack">
        <span>{{ uploading ? 'Uploading…' : 'Choose a .zip resource pack' }}</span>
      </label>
      <p v-if="part.blobSha256" class="upload-status">
        Attached: <span class="upload-file">{{ part.blobFilename }}</span>
      </p>
      <p v-if="uploadError" class="upload-error">
        {{ uploadError }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.editor {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.editor-head {
  display: flex;
  gap: 8px;
  align-items: center;
}

.editor-role {
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 7px 10px;
  cursor: pointer;
  outline: none;
  transition: border-color 0.12s ease-out;
}
.editor-role:focus {
  border-color: var(--color-accent);
}

.editor-name {
  flex: 1;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 7px 10px;
  font: 500 13px/1.4 var(--font-sans);
  color: var(--color-text);
  outline: none;
  transition: border-color 0.12s ease-out;
}
.editor-name::placeholder {
  color: var(--color-muted);
}
.editor-name:focus {
  border-color: var(--color-accent);
}

.editor-remove {
  flex-shrink: 0;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-muted);
  width: 32px;
  height: 32px;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out;
}
.editor-remove:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.editor-group {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 6px 10px;
  font: 500 12px/1.4 var(--font-mono);
  color: var(--color-text);
  outline: none;
  transition: border-color 0.12s ease-out;
}
.editor-group::placeholder {
  color: var(--color-faint);
}
.editor-group:focus {
  border-color: var(--color-accent);
}

.editor-body {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 10px 12px;
  font: 400 12px/1.55 var(--font-mono);
  color: var(--color-text);
  resize: vertical;
  min-height: 120px;
  outline: none;
  transition: border-color 0.12s ease-out;
}
.editor-body:focus {
  border-color: var(--color-accent);
}

.editor-upload {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  background: var(--color-bg);
  border: 1px dashed var(--color-border);
  border-radius: 6px;
}
.upload-label {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  color: var(--color-muted);
  font: 500 12px/1 var(--font-mono);
  letter-spacing: 0.06em;
}
.upload-label input {
  font-size: 12px;
  color: var(--color-text);
}
.upload-status {
  margin: 0;
  font-size: 12px;
  color: var(--color-muted);
}
.upload-file {
  font-family: var(--font-mono);
  color: var(--color-text);
}
.upload-error {
  margin: 0;
  font-size: 12px;
  color: oklch(70% 0.18 25);
}
</style>
