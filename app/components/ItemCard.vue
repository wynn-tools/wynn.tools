<script setup lang="ts">
import type { CraftedItem } from '~/lib/crafter/types'

defineProps<{
  id: string
  name: string
  gameVersion: string
  ownerId?: string
  ownerUsername?: string
  ownerName?: string
  showOwner?: boolean
  craftHash?: string | null
  tags?: string[]
}>()

const { resolve } = useCraftedItemPreview()
const crafted = ref<CraftedItem | null>(null)
const loadingCraft = ref(false)

async function onHoverOpen(open: boolean, craftHash: string | null | undefined) {
  if (!open || crafted.value || loadingCraft.value || !craftHash)
    return
  loadingCraft.value = true
  try {
    const resolved = await resolve(craftHash)
    crafted.value = resolved?.crafted ?? null
  }
  catch {
    // silently suppress — tooltip just won't show
  }
  finally {
    loadingCraft.value = false
  }
}
</script>

<template>
  <Quickview :disabled="!craftHash" @open-change="open => onHoverOpen(open, craftHash)">
    <template #trigger>
      <article class="item-card">
        <NuxtLink :to="`/c/${id}`" class="card-link">
          <span class="card-name">{{ name }}</span>
          <BuildDetailsTagChips v-if="tags && tags.length > 0" :tags="tags" :max="3" />
          <span class="card-meta">
            <span class="card-version">{{ gameVersion }}</span>
            <span v-if="ownerName && ownerId" class="card-owner-wrap">
              by
              <NuxtLink :to="`/u/${ownerUsername ?? ownerId}`" class="card-owner" @click.stop>{{ ownerName }}</NuxtLink>
            </span>
            <span v-else-if="showOwner" class="card-owner-anon">Anonymous</span>
          </span>
        </NuxtLink>
      </article>
    </template>
    <CrafterItemPreview v-if="crafted" :crafted="crafted" hide-equip-button />
    <div v-else class="quickview-loading">
      Loading…
    </div>
  </Quickview>
</template>

<style scoped>
.item-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition:
    border-color 0.12s ease-out,
    background 0.12s ease-out;
}

.item-card:hover {
  border-color: color-mix(in oklch, var(--color-accent) 40%, transparent);
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

.quickview-loading {
  font-size: 12px;
  color: var(--color-muted);
  padding: 16px;
}
</style>
