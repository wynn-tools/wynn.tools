<script setup lang="ts">
defineProps<{ title: string, blurb: string, href: string, badge?: string }>()
</script>

<template>
  <NuxtLink :to="href" class="play-card">
    <div class="play-card-body">
      <span v-if="badge" class="play-card-badge">{{ badge }}</span>
      <h2 class="play-card-title">
        {{ title }}
      </h2>
      <p class="play-card-blurb">
        {{ blurb }}
      </p>
    </div>
  </NuxtLink>
</template>

<style scoped>
.play-card {
  display: block;
  padding: 2rem;
  border-radius: 1rem;
  background: linear-gradient(160deg, var(--color-surface-hi) 0%, var(--color-surface) 100%);
  border: 1px solid var(--color-border);
  text-decoration: none;
  color: inherit;
  transition:
    transform 200ms ease,
    border-color 200ms ease;
}
.play-card:hover {
  transform: translateY(-2px);
  border-color: var(--color-accent);
}
.play-card-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  background: var(--color-accent);
  color: var(--color-bg);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.play-card-title {
  font-size: clamp(1.5rem, 2.5vw, 2rem);
  margin: 0.5rem 0 0.25rem;
}
.play-card-blurb {
  color: var(--color-muted);
}
</style>
