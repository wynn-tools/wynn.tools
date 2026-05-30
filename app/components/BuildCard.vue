<script setup lang="ts">
import type { ApiBuild } from '~/composables/useApi'
import {
  HoverCardContent,
  HoverCardPortal,
  HoverCardRoot,
  HoverCardTrigger,
} from 'reka-ui'

defineProps<{
  id: string
  name: string
  gameVersion: string
  ownerId?: string
  ownerName?: string
  showOwner?: boolean
}>()

const api = useApi()
const buildData = ref<ApiBuild | null>(null)
const loadingBuild = ref(false)

async function onHoverOpen(open: boolean, id: string) {
  if (!open || buildData.value || loadingBuild.value)
    return
  loadingBuild.value = true
  try {
    buildData.value = await api.getBuild(id)
  }
  catch {
    // silently suppress — tooltip just won't show stats
  }
  finally {
    loadingBuild.value = false
  }
}
</script>

<template>
  <HoverCardRoot :open-delay="120" :close-delay="0" @update:open="open => onHoverOpen(open, id)">
    <HoverCardTrigger as-child>
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
    </HoverCardTrigger>
    <HoverCardPortal>
      <HoverCardContent :side-offset="8" side="right" align="start" class="quickview">
        <BuildTooltip
          v-if="buildData"
          :name="buildData.name"
          :player-class="buildData.playerClass"
          :level="buildData.level"
          :equip-names="buildData.equipNames"
          :decoded="buildData.decoded"
        />
        <div v-else class="quickview-loading">
          Loading…
        </div>
      </HoverCardContent>
    </HoverCardPortal>
  </HoverCardRoot>
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

.quickview {
  z-index: 50;
}

.quickview-loading {
  padding: 16px;
  font-size: 13px;
  color: var(--color-muted);
  font-family: var(--font-mono);
}
</style>
