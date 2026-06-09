<script setup lang="ts">
import { clearError } from '#app'

const props = defineProps<{ error: { statusCode: number, message?: string } }>()

const friendlyMessage = computed(() => {
  switch (props.error.statusCode) {
    case 404: return 'Page not found.'
    case 403: return 'Access denied.'
    case 500: return 'Something went wrong.'
    default: return 'An error occurred.'
  }
})

function handleError() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <main>
    <h1 class="domain">
      {{ error.statusCode }}<span class="dot">.</span>
    </h1>
    <p class="label">
      {{ friendlyMessage }}
    </p>
    <p v-if="error.message" class="status">
      {{ error.message }}
    </p>
    <nav class="links">
      <a href="/" @click.prevent="handleError">go home</a>
    </nav>
  </main>

  <footer>
    <span class="footer-note">AGPL-3.0 · Not affiliated with Wynncraft or Mojang</span>
  </footer>
</template>

<style scoped>
  main {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 600px;
  padding: 80px 0;
}

.domain {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: clamp(36px, 7vw, 68px);
  font-weight: 500;
  letter-spacing: -0.025em;
  line-height: 1;
  margin-bottom: 32px;
}

.domain .dot {
  color: var(--color-accent);
}

.label {
  font-size: 15px;
  color: var(--color-muted);
  font-weight: 400;
  margin-bottom: 8px;
  letter-spacing: 0.01em;
}

.status {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-faint);
  margin-bottom: 52px;
}

.links {
  display: flex;
  align-items: center;
  gap: 20px;
  list-style: none;
  margin-top: 52px;
}

.links a {
  font-size: 14px;
  color: var(--color-muted);
  text-decoration: none;
  transition: color 0.12s ease-out;
}

.links a:hover {
  color: var(--color-text);
}

.links a:focus-visible {
  outline: 1px solid var(--color-accent);
  outline-offset: 4px;
  border-radius: 2px;
  color: var(--color-text);
}

footer {
  padding: 20px 0;
  border-top: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.footer-note {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  color: var(--color-faint);
}

@media (max-width: 480px) {
  main {
    padding: 64px 0;
  }
}
</style>
