<script setup lang="ts">
defineProps<{
  id: string
  name: string
  gameVersion: string
  ownerId?: string
  ownerName?: string
  showOwner?: boolean
}>()
</script>

<template>
  <article class="build-card">
    <NuxtLink :to="`/b/${id}`" class="card-link">
      <span class="card-name">{{ name }}</span>
      <span class="card-meta">
        <span class="card-version">{{ gameVersion }}</span>
        <span v-if="ownerName && ownerId" class="card-owner-wrap">
          by
          <NuxtLink :to="`/u/${ownerId}`" class="card-owner" @click.stop>{{ ownerName }}</NuxtLink>
        </span>
        <span v-else-if="showOwner" class="card-owner-anon">Anonymous</span>
      </span>
    </NuxtLink>
  </article>
</template>

<style scoped>
.build-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition:
    border-color 0.12s ease-out,
    background 0.12s ease-out;
}

.build-card:hover {
  border-color: oklch(65% 0.15 48 / 0.4);
  background: var(--color-surface-hi);
}

.card-link {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  text-decoration: none;
}

.card-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-muted);
}

.card-version {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-faint);
}

.card-owner {
  color: var(--color-muted);
  text-decoration: none;
}

.card-owner:hover {
  color: var(--color-accent);
}

.card-owner-anon {
  color: var(--color-faint);
  font-style: italic;
}
</style>
