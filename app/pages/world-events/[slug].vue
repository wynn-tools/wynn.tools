<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import Countdown from '~/components/WorldEvent/Countdown.vue'
import EventCard from '~/components/WorldEvent/EventCard.vue'
import LootSection from '~/components/WorldEvent/LootSection.vue'
import MapThumbnail from '~/components/WorldEvent/MapThumbnail.vue'
import { useJoinedWorldEvents, useWorldEvent } from '~/composables/useWorldEvents'

definePageMeta({ ssr: false })

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const event = useWorldEvent(slug.value)
const { joined, loading } = useJoinedWorldEvents()

useSeoMeta({
  title: () => event.value ? `${event.value.event.name} — wynn.tools` : 'World Event — wynn.tools',
  ogTitle: () => event.value ? `${event.value.event.name} — World Event` : undefined,
  description: () => event.value?.event.lore || 'A Wynncraft world event.',
})

watchEffect(() => {
  if (event.value && event.value.loot) {
    defineOgImage('WorldEventCard', {
      name: event.value.event.name,
      region: event.value.loot.region,
      difficulty: event.value.event.difficulty,
      level: event.value.event.level,
    })
  }
})

const others = computed(() => {
  if (!event.value?.loot)
    return []
  const region = event.value.loot.region
  return joined.value.filter(j => j.slug !== slug.value && j.loot?.region === region).slice(0, 4)
})

const firstLocation = computed(() => event.value?.event.location?.[0]?.event ?? null)
const mapHref = computed(() => {
  const loc = firstLocation.value
  return loc ? `/map?x=${loc.x}&z=${loc.z}&zoom=2` : '/map'
})
</script>

<template>
  <article v-if="event" class="we-detail">
    <NuxtLink to="/world-events" class="back">
      ← World Events
    </NuxtLink>
    <header class="we-header">
      <h1>{{ event.event.name }}</h1>
      <div class="chips">
        <span v-if="event.loot?.region" class="badge badge--region">{{ event.loot.region }}</span>
        <span class="badge">Lv {{ event.event.level }}</span>
        <span class="badge" :class="`badge--diff-${event.event.difficulty.toLowerCase()}`">{{ event.event.difficulty }}</span>
        <span class="badge">{{ event.event.length }}</span>
        <Countdown :schedule="event.event.schedule" />
      </div>
    </header>

    <blockquote v-if="event.event.lore" class="lore">
      {{ event.event.lore }}
    </blockquote>

    <div v-if="!event.loot" class="notice">
      Loot data not yet documented.
    </div>

    <template v-if="event.resolved">
      <LootSection label="Common Ingredients" :drops="event.resolved.commonIngredients" />
      <LootSection label="Possible Ingredients" :drops="event.resolved.possibleIngredients" />
      <LootSection label="Exclusive Ingredients" :drops="event.resolved.exclusiveIngredients" />
      <LootSection label="Exclusive Items" :drops="event.resolved.exclusiveItems" />
      <LootSection label="Rare Mob Drops" :drops="event.resolved.rareMobDrops" />
      <LootSection label="Rare Random Loots" :drops="event.resolved.rareRandomLoots" />
    </template>

    <section class="meta">
      <h3 class="kicker">
        Details
      </h3>
      <dl>
        <template v-if="event.loot?.countdown">
          <dt>Countdown</dt>
          <dd>{{ event.loot.countdown }}</dd>
        </template>
        <template v-if="event.loot?.delay">
          <dt>Delay</dt>
          <dd>{{ event.loot.delay }}</dd>
        </template>
        <template v-if="event.event.requirements.length">
          <dt>Requirements</dt>
          <dd>
            <span v-for="r in event.event.requirements" :key="r.type">{{ r.type }} {{ r.value }}</span>
          </dd>
        </template>
        <template v-if="event.event.location.length">
          <dt>Location</dt>
          <dd>
            <span v-for="(l, i) in event.event.location" :key="i">{{ l.event.x }}, {{ l.event.y }}, {{ l.event.z }}</span>
          </dd>
        </template>
      </dl>
      <NuxtLink v-if="firstLocation" :to="mapHref" class="map-thumb-link" :aria-label="`Open ${event.event.name} on the map`">
        <MapThumbnail :x="firstLocation.x" :z="firstLocation.z" />
        <span class="map-thumb-cta">Open in map →</span>
      </NuxtLink>
    </section>

    <section v-if="others.length" class="others">
      <h3 class="kicker">
        Other events in {{ event.loot?.region }}
      </h3>
      <div class="others-grid">
        <EventCard v-for="o in others" :key="o.slug" :event="o" />
      </div>
    </section>
  </article>

  <div v-else-if="loading" class="muted">
    Loading…
  </div>
  <div v-else class="muted">
    Event not found.
  </div>
</template>

<style scoped>
.we-detail {
  max-width: 880px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.back {
  display: inline-block;
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-muted);
  text-decoration: none;
  padding: 6px 0;
  transition: color 0.12s ease-out;
}
.back:hover {
  color: var(--color-accent);
}
.we-header h1 {
  font-size: 28px;
  margin: 0 0 12px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.badge {
  display: inline-flex;
  padding: 3px 10px;
  border: 1px solid var(--color-border);
  border-radius: 9999px;
  font-size: 12px;
  color: var(--color-muted);
}
.badge--region {
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.badge--diff-hard {
  color: oklch(0.65 0.2 5);
}
.badge--diff-medium {
  color: oklch(0.8 0.12 90);
}
.badge--diff-easy {
  color: oklch(0.7 0.16 145);
}
.lore {
  border-left: 2px solid var(--color-accent);
  padding: 6px 12px;
  color: var(--color-muted);
  font-style: italic;
  margin: 0;
}
.notice {
  padding: 12px;
  border: 1px dashed var(--color-border);
  border-radius: 8px;
  color: var(--color-muted);
}
.meta dl {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 6px 16px;
  font-size: 13px;
}
.meta dt {
  color: var(--color-muted);
}
.meta dd {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.map-thumb-link {
  display: block;
  margin-top: 12px;
  text-decoration: none;
  color: var(--color-text);
  position: relative;
}
.map-thumb-link:hover :deep(.map-thumb) {
  border-color: var(--color-accent);
}
.map-thumb-cta {
  position: absolute;
  right: 10px;
  bottom: 10px;
  z-index: 800;
  padding: 4px 10px;
  font-size: 12px;
  color: var(--color-accent);
  background: color-mix(in oklch, var(--color-bg) 75%, transparent);
  border: 1px solid var(--color-accent);
  border-radius: 9999px;
  backdrop-filter: blur(4px);
  pointer-events: none;
}
.others-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  margin-top: 8px;
}
.muted {
  padding: 40px;
  text-align: center;
  color: var(--color-muted);
}
</style>
