<script setup lang="ts">
import type { PartInput } from '~/composables/useStockApi'

const emit = defineEmits<{ remove: [] }>()
const part = defineModel<PartInput>('part', { required: true })
const api = useStockApi()
const uploading = ref(false)
const uploadError = ref<string | null>(null)

async function uploadPack(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f)
    return
  uploading.value = true
  uploadError.value = null
  try {
    const { sha256, mimeType } = await api.upload(f)
    if (mimeType !== 'application/zip')
      throw new Error('not a zip')
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
  <div class="space-y-2 rounded border border-border bg-surface p-3">
    <div class="flex items-center justify-between">
      <select v-model="part.role" class="rounded border border-border bg-bg px-2 py-1 text-xs">
        <option value="function">
          function
        </option>
        <option value="infobox">
          infobox
        </option>
        <option value="resourcepack">
          resourcepack
        </option>
      </select>
      <button class="text-xs text-muted hover:text-text" @click="emit('remove')">
        remove
      </button>
    </div>
    <input
      v-model="part.name"
      placeholder="Name"
      class="w-full rounded border border-border bg-bg px-2 py-1 text-sm"
    >
    <input
      v-model="part.group"
      placeholder="group (optional)"
      class="w-full rounded border border-border bg-bg px-2 py-1 text-xs"
    >
    <textarea
      v-if="part.role !== 'resourcepack'"
      v-model="part.textContent"
      rows="4"
      placeholder="Function/infobox text"
      class="w-full rounded border border-border bg-bg px-2 py-1 font-mono text-xs"
    />
    <div v-else>
      <input type="file" accept=".zip,application/zip" :disabled="uploading" @change="uploadPack">
      <p v-if="part.blobSha256" class="text-xs text-muted">
        attached: {{ part.blobFilename }}
      </p>
      <p v-if="uploadError" class="text-xs text-red-400">
        {{ uploadError }}
      </p>
    </div>
  </div>
</template>
