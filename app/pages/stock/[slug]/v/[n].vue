<script setup lang="ts">
import StockPartView from '~/components/stock/StockPartView.vue'
import StockReactionBar from '~/components/stock/StockReactionBar.vue'

const route = useRoute()
const slug = String(route.params.slug)
const n = Number(route.params.n)
const api = useStockApi()
const { data: creation } = await useAsyncData(`stock-${slug}`, () => api.get(slug))
const { data: version } = await useAsyncData(`stock-${slug}-v-${n}`, () => api.getVersion(slug, n))
if (!creation.value || !version.value)
  throw createError({ statusCode: 404 })
const latest = creation.value.latestVersion
const isOutdated = latest && latest.number > version.value.number

const counts = ref(creation.value.reactionCounts)
useHead({ title: `${creation.value.title} v${n}` })
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6 p-4">
    <NuxtLink :to="`/stock/${slug}`" class="text-sm text-accent">
      ← {{ creation!.title }}
    </NuxtLink>
    <div v-if="isOutdated" class="rounded bg-surface-hi p-3 text-sm text-muted">
      This is version {{ version!.label }}. Latest is
      <NuxtLink :to="`/stock/${slug}/v/${latest!.number}`" class="text-accent">
        {{ latest!.label }}
      </NuxtLink>.
    </div>
    <header>
      <h1 class="text-2xl font-bold">
        {{ creation!.title }}
        <span class="text-base text-muted">{{ version!.label }}</span>
      </h1>
      <p v-if="version!.changelog" class="mt-2 whitespace-pre-wrap text-sm text-muted">
        {{ version!.changelog }}
      </p>
    </header>
    <section class="space-y-3">
      <StockPartView
        v-for="p in version!.parts"
        :key="p.id"
        :part="p"
        :raw-url="api.rawUrl(slug, n, p.id)"
      />
    </section>
    <StockReactionBar :slug="slug" :counts="counts" @updated="counts = $event" />
  </div>
</template>
