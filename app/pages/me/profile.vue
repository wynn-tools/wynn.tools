<script setup lang="ts">
import { useApi } from '~/composables/useApi'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Profile — wynn.tools' })

const api = useApi()
const auth = useAuthStore()

const displayName = ref(auth.user?.displayName ?? '')
const bio = ref(auth.user?.bio ?? '')
const profileVisibility = ref<'public' | 'private'>(auth.user?.profileVisibility ?? 'public')

const saving = ref(false)
const saved = ref(false)
const saveError = ref<string | null>(null)

const copied = ref(false)
function copyProfileLink() {
  if (!auth.user)
    return
  navigator.clipboard.writeText(`${window.location.origin}/u/${auth.user.username ?? auth.user.id}`)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}

async function save() {
  saving.value = true
  saveError.value = null
  try {
    const res = await api.updateProfile({
      displayName: displayName.value.trim() || null,
      bio: bio.value.trim() || null,
      profileVisibility: profileVisibility.value,
    })
    if (auth.user) {
      auth.user.displayName = res.displayName
      auth.user.bio = res.bio
      auth.user.profileVisibility = res.profileVisibility
    }
    saved.value = true
    setTimeout(() => {
      saved.value = false
    }, 2000)
  }
  catch (e: unknown) {
    saveError.value = e instanceof Error ? e.message : 'Failed to save'
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="profile-page">
    <header class="page-header">
      <div class="page-header-row">
        <h1 class="page-title">
          Profile
        </h1>
        <div class="page-header-actions">
          <NuxtLink v-if="auth.user" :to="`/u/${auth.user.username ?? auth.user.id}`" class="view-profile-link">
            View public profile
          </NuxtLink>
          <button v-if="auth.user" class="copy-link-btn" type="button" @click="copyProfileLink">
            {{ copied ? 'Copied!' : 'Copy link' }}
          </button>
        </div>
      </div>
      <p class="page-desc">
        Customise how you appear across wynn.tools.
      </p>
    </header>

    <div v-if="auth.user" class="avatar-row">
      <img
        v-if="auth.user.avatar"
        :src="`https://cdn.discordapp.com/avatars/${auth.user.discordId}/${auth.user.avatar}.webp?size=64`"
        :alt="auth.user.username"
        class="avatar"
        width="48"
        height="48"
      >
      <div class="avatar-info">
        <span class="discord-name">{{ auth.user.username }}</span>
        <span class="avatar-hint">Avatar synced from Discord</span>
      </div>
    </div>

    <form class="profile-form" @submit.prevent="save">
      <div class="field">
        <label class="field-label" for="display-name">Display name</label>
        <input
          id="display-name"
          v-model="displayName"
          class="field-input"
          type="text"
          maxlength="50"
          :placeholder="auth.user?.username"
        >
        <span class="field-hint">Shown instead of your Discord username. Leave blank to use Discord username.</span>
      </div>

      <div class="field">
        <label class="field-label" for="bio">Bio</label>
        <MarkdownTextarea
          id="bio"
          v-model="bio"
          :max-length="200"
          :rows="3"
          placeholder="A short description about yourself (markdown supported)…"
        />
      </div>

      <div class="field">
        <span class="field-label">Profile visibility</span>
        <div class="visibility-options">
          <label class="radio-label">
            <input v-model="profileVisibility" type="radio" value="public">
            <span>
              <strong>Public</strong> — your profile, builds and items are discoverable
            </span>
          </label>
          <label class="radio-label">
            <input v-model="profileVisibility" type="radio" value="private">
            <span>
              <strong>Private</strong> — your name is hidden; builds remain accessible via direct link
            </span>
          </label>
        </div>
      </div>

      <p v-if="saveError" class="save-error" role="alert">
        {{ saveError }}
      </p>

      <div class="form-actions">
        <button class="save-btn" type="submit" :disabled="saving">
          {{ saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save profile' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 32px 0;
  max-width: 480px;
}

.page-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.page-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.page-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.view-profile-link {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
  text-decoration: none;
  transition: color 0.12s ease-out;
  white-space: nowrap;
}
.view-profile-link:hover {
  color: var(--color-accent);
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
.copy-link-btn {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  padding: 4px 10px;
  cursor: pointer;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out;
  white-space: nowrap;
}
.copy-link-btn:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.avatar-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid var(--color-border);
}

.avatar-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.discord-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}
.avatar-hint {
  font-size: 11px;
  color: var(--color-faint);
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.field-input,
.field-textarea {
  background: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.12s ease-out;
  resize: vertical;
}

.field-input:focus,
.field-textarea:focus {
  border-color: color-mix(in oklch, var(--color-accent) 55%, transparent);
}

.field-hint {
  font-size: 11px;
  color: var(--color-faint);
}

.visibility-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.radio-label {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;
  color: var(--color-muted);
  cursor: pointer;
}

.radio-label strong {
  color: var(--color-text);
}

.save-error {
  font-size: 12px;
  color: oklch(62% 0.15 20);
  margin: 0;
}

.form-actions {
  display: flex;
}

.save-btn {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-accent);
  background: none;
  border: 1px solid color-mix(in oklch, var(--color-accent) 40%, transparent);
  border-radius: 6px;
  padding: 8px 20px;
  cursor: pointer;
  transition: border-color 0.12s ease-out;
}

.save-btn:not(:disabled):hover {
  border-color: var(--color-accent);
}
.save-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
