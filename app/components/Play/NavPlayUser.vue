<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()

function avatarUrl(discordId: string, avatar: string) {
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.webp?size=64`
}
</script>

<template>
  <div class="nav-play-user">
    <template v-if="auth.pending">
      <span class="reserve" aria-hidden="true" />
    </template>

    <NuxtLink
      v-else-if="auth.user"
      to="/play/me"
      class="user-pill"
      :aria-label="`Open your Play profile, signed in as ${auth.user.displayName ?? auth.user.username}`"
    >
      <img
        v-if="auth.user.avatar"
        :src="avatarUrl(auth.user.discordId, auth.user.avatar)"
        alt=""
        class="user-avatar"
        width="22"
        height="22"
      >
      <span v-else class="user-avatar user-avatar--fallback">
        {{ (auth.user.displayName ?? auth.user.username)[0]?.toUpperCase() }}
      </span>
      <span class="user-name">{{ auth.user.displayName ?? auth.user.username }}</span>
    </NuxtLink>

    <button
      v-else
      type="button"
      class="signin-pill"
      aria-label="Sign in with Discord"
      @click="auth.login()"
    >
      <span class="signin-label-full">SIGN IN WITH DISCORD</span>
      <span class="signin-label-short">SIGN IN</span>
    </button>
  </div>
</template>

<style scoped>
.nav-play-user {
  display: inline-flex;
  align-items: center;
  justify-self: end;
}

.reserve {
  display: inline-block;
  width: 120px;
  height: 32px;
}

/* Signed-in: parchment pill with avatar + username. Wood-frame-light heft. */
.user-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px 4px 4px;
  background: var(--paper-base);
  color: var(--paper-text-strong);
  border: 2px solid var(--paper-bd);
  box-shadow: inset 0 1px 0 var(--paper-bd-light);
  text-decoration: none;
  max-width: 220px;
  transition:
    background-color 0.12s ease-out,
    border-color 0.12s ease-out;
}

.user-pill:hover {
  background: var(--paper-light);
  border-color: var(--ingot-gold-dim);
}

.user-pill:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.user-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--paper-bd);
  flex-shrink: 0;
}

.user-avatar--fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--paper-light);
  color: var(--paper-text-strong);
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.user-name {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1;
  color: var(--paper-text-strong);
  text-shadow: 1px 1px 0 rgb(0 0 0 / 0.18);
  max-width: 14ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Signed-out: gold-edged pill matching .me-pill.gold on /play/me. */
.signin-pill {
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 16px;
  background: var(--ingot-gold-dim);
  color: rgb(40 26 8);
  border: 2px solid rgb(82 60 18);
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.08em;
  cursor: pointer;
  box-shadow:
    inset 0 1px 0 var(--ingot-gold),
    inset 0 -2px 0 rgb(120 86 14);
  white-space: nowrap;
  transition: background-color 0.12s ease-out;
}

.signin-pill:hover {
  background: var(--ingot-gold);
}

.signin-pill:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.signin-label-short {
  display: none;
}

/* Narrow desktop: collapse the long label to protect the wordmark. */
@media (max-width: 960px) and (min-width: 721px) {
  .signin-label-full {
    display: none;
  }
  .signin-label-short {
    display: inline;
  }
  .user-name {
    max-width: 10ch;
  }
}

/* Mobile: this control hides; the BottomHotbar carries the auth slot. */
@media (max-width: 720px) {
  .nav-play-user {
    display: none;
  }
}
</style>
