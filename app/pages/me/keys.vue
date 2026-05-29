<script setup lang="ts">
import type { ApiKey } from '~/composables/useApi'
import { useApi } from '~/composables/useApi'

definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'API Keys — wynn.tools' })

const api = useApi()
const keys = ref<ApiKey[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)
const revokeError = ref<string | null>(null)

async function loadKeys() {
  loading.value = true
  loadError.value = null
  try {
    keys.value = await api.listKeys()
  }
  catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load keys'
  }
  finally {
    loading.value = false
  }
}

await useAsyncData('my-keys', loadKeys)

// Create key form
const allScopes = ['builds:read', 'builds:write', 'items:read', 'items:write'] as const
const createLabel = ref('')
const createScopes = ref<string[]>(['builds:read', 'items:read'])
const creating = ref(false)
const createError = ref<string | null>(null)
const newKeyPlaintext = ref<string | null>(null)
const copied = ref(false)

async function createKey() {
  if (!createLabel.value.trim() || createScopes.value.length === 0)
    return
  creating.value = true
  createError.value = null
  try {
    const res = await api.createKey({ label: createLabel.value.trim(), scopes: [...createScopes.value] })
    newKeyPlaintext.value = res.plaintext
    createLabel.value = ''
    createScopes.value = ['builds:read', 'items:read']
    await loadKeys()
  }
  catch (e: unknown) {
    createError.value = e instanceof Error ? e.message : 'Failed to create key'
  }
  finally {
    creating.value = false
  }
}

async function copyKey() {
  if (!newKeyPlaintext.value)
    return
  try {
    await navigator.clipboard.writeText(newKeyPlaintext.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 1500)
  }
  catch { /* clipboard not available */ }
}

// Revoke
const confirmRevokeId = ref<string | null>(null)

async function revokeKey(id: string) {
  try {
    await api.revokeKey(id)
    keys.value = keys.value.filter(k => k.id !== id)
  }
  catch (e: unknown) {
    revokeError.value = e instanceof Error ? e.message : 'Failed to revoke key'
  }
  confirmRevokeId.value = null
}
</script>

<template>
  <div class="keys-page">
    <header class="page-header">
      <h1 class="page-title">
        API Keys
      </h1>
      <p class="page-desc">
        Keys grant programmatic access to your data. Store them securely — they are shown only once.
      </p>
    </header>

    <p v-if="revokeError" class="revoke-error" role="alert">
      {{ revokeError }}
      <button type="button" @click="revokeError = null">
        ✕
      </button>
    </p>

    <p v-if="loadError" class="load-error" role="alert">
      {{ loadError }}
    </p>

    <!-- New key banner (shown once after creation) -->
    <div v-if="newKeyPlaintext" class="new-key-banner">
      <p class="new-key-label">
        Your new key — copy it now, it won't be shown again:
      </p>
      <div class="new-key-row">
        <code class="new-key-value">{{ newKeyPlaintext }}</code>
        <button class="copy-btn" type="button" @click="copyKey">
          {{ copied ? 'Copied' : 'Copy' }}
        </button>
      </div>
      <button class="dismiss-btn" type="button" @click="newKeyPlaintext = null">
        Dismiss
      </button>
    </div>

    <!-- Create form -->
    <section class="create-section">
      <h2 class="section-title">
        Create new key
      </h2>
      <div class="create-form">
        <input
          v-model="createLabel"
          class="label-input"
          type="text"
          placeholder="Label (e.g. My Discord Bot)"
          maxlength="80"
          @keydown.enter="createKey"
        >
        <fieldset class="scopes-field">
          <legend class="scopes-legend">
            Scopes
          </legend>
          <label v-for="scope in allScopes" :key="scope" class="scope-label">
            <input v-model="createScopes" type="checkbox" :value="scope">
            {{ scope }}
          </label>
        </fieldset>
        <p v-if="createError" class="create-error">
          {{ createError }}
        </p>
        <button
          class="create-btn"
          type="button"
          :disabled="!createLabel.trim() || createScopes.length === 0 || creating"
          @click="createKey"
        >
          {{ creating ? 'Creating…' : 'Create key' }}
        </button>
      </div>
    </section>

    <!-- Key list -->
    <section class="keys-section">
      <h2 class="section-title">
        Your keys
      </h2>
      <div v-if="keys.length === 0 && !loading && !loadError" class="empty-state">
        No API keys yet.
      </div>
      <div v-else class="key-list">
        <div v-for="k in keys" :key="k.id" class="key-row">
          <div class="key-info">
            <span class="key-label">{{ k.label }}</span>
            <code class="key-prefix">{{ k.prefix }}…</code>
            <span class="key-scopes">{{ k.scopes.join(', ') }}</span>
            <span class="key-last-used">
              {{ k.lastUsedAt ? `Last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : 'Never used' }}
            </span>
          </div>
          <div class="key-actions">
            <template v-if="confirmRevokeId === k.id">
              <button class="action-btn action-btn--danger" type="button" @click="revokeKey(k.id)">
                Confirm revoke
              </button>
              <button class="action-btn" type="button" @click="confirmRevokeId = null">
                Cancel
              </button>
            </template>
            <button v-else class="action-btn" type="button" @click="confirmRevokeId = k.id">
              Revoke
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.keys-page {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 32px 0;
}

.page-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.page-desc {
  font-size: 13px;
  color: var(--color-muted);
  margin: 0;
}

.new-key-banner {
  background: oklch(70% 0.14 145 / 0.08);
  border: 1px solid oklch(70% 0.14 145 / 0.25);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.new-key-label {
  font-size: 12px;
  color: oklch(70% 0.14 145);
  margin: 0;
  font-weight: 500;
}

.new-key-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.new-key-value {
  flex: 1;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 5px;
  padding: 8px 12px;
  word-break: break-all;
}

.copy-btn {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-muted);
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  padding: 6px 12px;
  cursor: pointer;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out;
}

.copy-btn:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.dismiss-btn {
  align-self: flex-end;
  font-size: 11px;
  color: var(--color-faint);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  transition: color 0.12s ease-out;
}

.dismiss-btn:hover {
  color: var(--color-muted);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 12px;
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 480px;
}

.label-input {
  background: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.12s ease-out;
}

.label-input:focus {
  border-color: oklch(65% 0.15 48 / 0.55);
}

.scopes-field {
  border: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.scopes-legend {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-faint);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 6px;
}

.scope-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-muted);
  cursor: pointer;
}

.create-error {
  font-size: 12px;
  color: oklch(62% 0.15 20);
  margin: 0;
}

.create-btn {
  align-self: flex-start;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-accent);
  background: none;
  border: 1px solid oklch(65% 0.15 48 / 0.4);
  border-radius: 6px;
  padding: 8px 16px;
  cursor: pointer;
  transition: border-color 0.12s ease-out;
}

.create-btn:not(:disabled):hover {
  border-color: var(--color-accent);
}

.create-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.key-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.key-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.key-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  min-width: 0;
}

.key-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.key-prefix {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-faint);
}

.key-scopes {
  font-size: 11px;
  color: var(--color-muted);
}

.key-last-used {
  font-size: 11px;
  color: var(--color-faint);
}

.key-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.action-btn {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-faint);
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 4px 10px;
  cursor: pointer;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out;
}

.action-btn:hover {
  color: var(--color-muted);
  border-color: var(--color-muted);
}

.action-btn--danger {
  color: oklch(62% 0.15 20);
  border-color: oklch(62% 0.15 20 / 0.4);
}

.action-btn--danger:hover {
  background: oklch(62% 0.15 20 / 0.06);
}

.revoke-error {
  background: oklch(62% 0.15 20 / 0.08);
  border: 1px solid oklch(62% 0.15 20 / 0.3);
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 13px;
  color: oklch(62% 0.15 20);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0;
}

.revoke-error button {
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  font-size: 14px;
  padding: 0 2px;
  opacity: 0.7;
}

.load-error {
  font-size: 13px;
  color: oklch(62% 0.15 20);
  margin: 0;
  padding: 10px 14px;
  background: oklch(62% 0.15 20 / 0.08);
  border: 1px solid oklch(62% 0.15 20 / 0.3);
  border-radius: 6px;
}

.empty-state {
  font-size: 14px;
  color: var(--color-muted);
}
</style>
