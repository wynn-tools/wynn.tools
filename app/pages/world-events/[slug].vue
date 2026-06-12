<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import Countdown from '~/components/WorldEvent/Countdown.vue'
import EventCard from '~/components/WorldEvent/EventCard.vue'
import LootSection from '~/components/WorldEvent/LootSection.vue'
import MapThumbnail from '~/components/WorldEvent/MapThumbnail.vue'
import RareMobBlock from '~/components/WorldEvent/RareMobBlock.vue'
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
const lootBeforeMobs = computed(() => {
  const r = event.value?.resolved
  if (!r)
    return []
  return [
    { label: 'Common Ingredients', drops: r.commonIngredients },
    { label: 'Possible Ingredients', drops: r.possibleIngredients },
    { label: 'Exclusive Ingredients', drops: r.exclusiveIngredients },
    { label: 'Exclusive Items', drops: r.exclusiveItems },
  ].filter(s => s.drops.length)
})
const rareMobs = computed(() => event.value?.resolved?.rareMobs ?? [])
const lootAfterMobs = computed(() => {
  const r = event.value?.resolved
  if (!r)
    return []
  return [
    { label: 'Rare Random Loots', drops: r.rareRandomLoots },
  ].filter(s => s.drops.length)
})
const hasLoot = computed(() =>
  lootBeforeMobs.value.length > 0 || rareMobs.value.length > 0 || lootAfterMobs.value.length > 0,
)
</script>

<template>
  <article v-if="event" class="we">
    <NuxtLink to="/world-events" class="back">
      ← All world events
    </NuxtLink>

    <header class="hero">
      <div class="hero__text">
        <div class="hero__rail">
          <span v-if="event.loot?.region" class="region">{{ event.loot.region }}</span>
          <Countdown :schedule="event.event.schedule" />
        </div>
        <h1 class="title">
          {{ event.event.name }}
        </h1>
        <div class="stats">
          <span class="stat"><span class="stat__k">Level</span><span class="stat__v">{{ event.event.level }}</span></span>
          <span class="stat"><span class="stat__k">Difficulty</span><span class="stat__v" :data-diff="event.event.difficulty">{{ event.event.difficulty.toLowerCase() }}</span></span>
          <span class="stat"><span class="stat__k">Length</span><span class="stat__v">{{ event.event.length.toLowerCase() }}</span></span>
          <span v-if="event.loot?.countdown" class="stat"><span class="stat__k">Countdown</span><span class="stat__v">{{ event.loot.countdown }}</span></span>
          <span v-if="event.loot?.delay" class="stat"><span class="stat__k">Delay</span><span class="stat__v">{{ event.loot.delay }}</span></span>
        </div>
        <p v-if="event.event.lore" class="lore">
          {{ event.event.lore }}
        </p>
      </div>
      <NuxtLink v-if="firstLocation" :to="mapHref" class="hero__map" :aria-label="`Open ${event.event.name} on the map`">
        <MapThumbnail :x="firstLocation.x" :z="firstLocation.z" />
        <span class="map-cta">Open in map →</span>
      </NuxtLink>
    </header>

    <section v-if="!event.loot" class="notice">
      <span class="kicker">Loot</span>
      <p>Loot data hasn't been documented for this event yet.</p>
    </section>

    <section v-if="hasLoot" class="loot">
      <h2 class="kicker">
        Loot tables
      </h2>
      <div class="loot__sections">
        <LootSection v-for="s in lootBeforeMobs" :key="s.label" :label="s.label" :drops="s.drops" />
        <div v-if="rareMobs.length" class="loot__mobs">
          <RareMobBlock v-for="(m, i) in rareMobs" :key="`${m.name}-${i}`" :mob="m" />
        </div>
        <LootSection v-for="s in lootAfterMobs" :key="s.label" :label="s.label" :drops="s.drops" />
      </div>
    </section>

    <section v-if="event.event.requirements.length || event.event.location.length" class="meta">
      <h2 class="kicker">
        Encounter
      </h2>
      <dl>
        <template v-if="event.event.requirements.length">
          <dt>Requirements</dt>
          <dd>
            <span v-for="r in event.event.requirements" :key="r.type" class="reqs">{{ r.type.toLowerCase().replace(/_/g, ' ') }} <strong>{{ r.value }}</strong></span>
          </dd>
        </template>
        <template v-if="event.event.location.length">
          <dt>{{ event.event.location.length > 1 ? 'Locations' : 'Location' }}</dt>
          <dd>
            <span v-for="(l, i) in event.event.location" :key="i" class="coord">
              <span class="coord__n">{{ l.event.x }}</span>,
              <span class="coord__n">{{ l.event.y }}</span>,
              <span class="coord__n">{{ l.event.z }}</span>
            </span>
          </dd>
        </template>
      </dl>
    </section>

    <section v-if="others.length" class="others">
      <h2 class="kicker">
        More in {{ event.loot?.region }}
      </h2>
      <div class="others__grid">
        <EventCard v-for="o in others" :key="o.slug" :event="o" />
      </div>
    </section>
  </article>

  <div v-else-if="loading" class="state-block">
    <span>Loading…</span>
  </div>
  <div v-else class="state-block">
    <span>Event not found.</span>
    <NuxtLink to="/world-events" class="state-action">
      Back to events
    </NuxtLink>
  </div>
</template>

<style scoped>
.we {
  max-width: 1080px;
  margin: 0 auto;
  padding: 24px 20px 96px;
  display: flex;
  flex-direction: column;
  gap: 40px;
}
.back {
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-muted);
  text-decoration: none;
  transition: color 0.12s ease-out;
}
.back:hover {
  color: var(--color-accent);
}

/* ── Hero ── */
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 420px);
  gap: 32px;
  align-items: start;
}
@media (max-width: 800px) {
  .hero {
    grid-template-columns: 1fr;
  }
}
.hero__rail {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 10px;
}
.region {
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-accent);
}
.title {
  font-family: var(--font-display);
  font-size: clamp(34px, 5vw, 52px);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.05;
  margin: 0 0 18px;
  color: var(--color-text);
}

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  padding: 12px 0;
  margin-bottom: 20px;
}
.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 2px 18px;
  border-right: 1px solid var(--color-border);
}
.stat:last-child {
  border-right: 0;
}
.stat:first-child {
  padding-left: 0;
}
.stat__k {
  font: 500 10px/1 var(--font-mono);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-faint);
}
.stat__v {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  text-transform: capitalize;
}
.stat__v[data-diff='HARD'] {
  color: var(--color-accent);
}

.lore {
  margin: 0;
  font-family: var(--font-body);
  font-size: 15px;
  font-style: italic;
  line-height: 1.6;
  color: var(--color-muted);
  max-width: 60ch;
}

.hero__map {
  display: block;
  position: relative;
  text-decoration: none;
  color: var(--color-text);
}
.hero__map :deep(.map-thumb) {
  height: 260px;
  border-radius: 10px;
  transition: border-color 0.14s ease-out;
}
.hero__map:hover :deep(.map-thumb) {
  border-color: var(--color-accent);
}
.map-cta {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 800;
  padding: 6px 12px;
  font: 600 11px/1 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-bg);
  background: var(--color-accent);
  border-radius: 4px;
  pointer-events: none;
}

/* ── Sections ── */
.kicker {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-muted);
  margin: 0 0 14px;
}

.notice {
  padding: 20px;
  background: var(--color-surface);
  border-radius: 8px;
}
.notice p {
  margin: 0;
  color: var(--color-muted);
  font-size: 14px;
}

.loot__sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.loot__mobs {
  display: flex;
  flex-direction: column;
}

.meta dl {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 12px 24px;
  font-size: 13px;
  margin: 0;
}
.meta dt {
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-faint);
  padding-top: 4px;
}
.meta dd {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
}
.reqs {
  text-transform: capitalize;
  color: var(--color-muted);
}
.reqs strong {
  color: var(--color-text);
  font-weight: 600;
}
.coord {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  color: var(--color-text);
}
.coord__n {
  display: inline-block;
  min-width: 1ch;
}

.others__grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

@media (max-width: 720px) {
  .we {
    padding: 16px 14px 64px;
    gap: 28px;
  }
  .hero {
    gap: 22px;
  }
  .title {
    font-size: clamp(28px, 8vw, 38px);
    margin-bottom: 14px;
  }
  .hero__rail {
    margin-bottom: 8px;
    flex-wrap: wrap;
    gap: 10px;
  }

  .stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 14px;
    row-gap: 12px;
    padding: 14px 0;
    margin-bottom: 18px;
  }
  .stat {
    padding: 0;
    border-right: 0;
  }
  .stat:first-child {
    padding-left: 0;
  }
  .stat__v {
    font-size: 14px;
  }

  .lore {
    font-size: 14px;
    line-height: 1.55;
  }

  .hero__map :deep(.map-thumb) {
    height: 180px;
  }
  .map-cta {
    right: 8px;
    bottom: 8px;
    padding: 5px 10px;
    font-size: 10px;
  }

  .meta dl {
    grid-template-columns: 1fr;
    gap: 4px;
  }
  .meta dt {
    padding-top: 12px;
  }
  .meta dt:first-of-type {
    padding-top: 0;
  }
  .meta dd {
    gap: 4px 14px;
  }

  .others__grid {
    grid-template-columns: 1fr;
  }
}
</style>
