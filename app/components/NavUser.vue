<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const open = ref(false)
const wrapRef = ref<HTMLElement | null>(null)

function avatarUrl(discordId: string, avatar: string) {
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.webp?size=64`
}

function close() {
  open.value = false
}

onClickOutside(wrapRef, close)
</script>

<template>
  <div class="nav-user">
    <!-- Pending: nothing -->
    <template v-if="auth.pending" />

    <!-- Logged out -->
    <button
      v-else-if="!auth.user"
      class="signin-btn"
      type="button"
      @click="auth.login()"
    >
      Sign in
    </button>

    <!-- Logged in -->
    <div v-else ref="wrapRef" class="avatar-wrap">
      <button
        class="avatar-btn"
        type="button"
        :aria-expanded="String(open)"
        aria-haspopup="menu"
        aria-label="Account menu"
        @click="open = !open"
        @keydown.escape="close"
      >
        <img
          v-if="auth.user.avatar"
          :src="avatarUrl(auth.user.discordId, auth.user.avatar)"
          :alt="auth.user.username"
          class="avatar"
          width="28"
          height="28"
        >
        <span v-else class="avatar avatar--fallback">
          {{ auth.user.username[0]?.toUpperCase() }}
        </span>
      </button>

      <div v-if="open" role="menu" class="dropdown">
        <span class="dropdown-name">{{ auth.user.displayName ?? auth.user.username }}</span>
        <NuxtLink to="/me/profile" class="dropdown-item" role="menuitem" @click="close">
          Profile
        </NuxtLink>
        <NuxtLink to="/me/builds" class="dropdown-item" role="menuitem" @click="close">
          My Builds
        </NuxtLink>
        <NuxtLink to="/me/items" class="dropdown-item" role="menuitem" @click="close">
          My Items
        </NuxtLink>
        <NuxtLink to="/me/keys" class="dropdown-item" role="menuitem" @click="close">
          API Keys
        </NuxtLink>
        <button class="dropdown-item dropdown-item--danger" role="menuitem" type="button" @click="auth.logout()">
          Sign out
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nav-user {
  display: flex;
  align-items: center;
  margin-left: auto;
}

.signin-btn {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 5px 12px;
  cursor: pointer;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out;
}

.signin-btn:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.avatar-wrap {
  position: relative;
}

.avatar-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
}

.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid var(--color-border);
  transition: border-color 0.12s ease-out;
}

.avatar-btn:hover .avatar {
  border-color: var(--color-accent);
}

.avatar--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface);
  color: var(--color-muted);
  font-size: 12px;
  font-weight: 600;
}

.dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  min-width: 160px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 4px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.dropdown-name {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-faint);
  padding: 6px 10px 4px;
  letter-spacing: 0.02em;
}

.dropdown-item {
  display: block;
  padding: 7px 10px;
  border-radius: 5px;
  font-size: 13px;
  color: var(--color-muted);
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition:
    background 0.1s ease-out,
    color 0.1s ease-out;
}

.dropdown-item:hover {
  background: var(--color-surface-hi);
  color: var(--color-text);
}

.dropdown-item--danger:hover {
  color: oklch(62% 0.15 20);
}
</style>
