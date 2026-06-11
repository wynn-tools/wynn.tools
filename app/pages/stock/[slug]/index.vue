<script setup lang="ts">
import StockMediaGallery from '~/components/stock/StockMediaGallery.vue'
import StockPartView from '~/components/stock/StockPartView.vue'
import StockReactionBar from '~/components/stock/StockReactionBar.vue'

const route = useRoute()
const api = useStockApi()
const { data: creation } = await useAsyncData(
  `stock-${route.params.slug}`,
  () => api.get(String(route.params.slug)),
)
if (!creation.value)
  throw createError({ statusCode: 404 })

const counts = ref(creation.value.reactionCounts)

const parts = computed(() => creation.value!.latestVersion?.parts ?? [])
const groups = computed(() => {
  const required = parts.value.filter(p => !p.group)
  const grouped = new Map<string, typeof parts.value>()
  for (const p of parts.value) {
    if (p.group) {
      if (!grouped.has(p.group))
        grouped.set(p.group, [])
      grouped.get(p.group)!.push(p)
    }
  }
  return { required, grouped: [...grouped.entries()] }
})

const chosenInGroup = reactive<Record<string, string>>({})
watchEffect(() => {
  for (const [g, ps] of groups.value.grouped) {
    if (!chosenInGroup[g])
      chosenInGroup[g] = ps[0].id
  }
})

function partRawUrl(partId: string) {
  return api.rawUrl(creation.value!.slug, creation.value!.latestVersion!.number, partId)
}

async function installAll() {
  const chosen = parts.value.filter(p => !p.group || chosenInGroup[p.group] === p.id)
  const text = chosen
    .filter(p => p.role !== 'resourcepack')
    .map(p => `### ${p.name}\n\`\`\`\n${p.textContent}\n\`\`\``)
    .join('\n\n')
  await navigator.clipboard.writeText(text)
}

useHead({
  title: creation.value.title,
  meta: [
    { property: 'og:title', content: creation.value.title },
    { property: 'og:description', content: creation.value.description },
    {
      property: 'og:image',
      content: `${useRuntimeConfig().public.apiBaseUrl}/v1/og/stock/${creation.value.slug}`,
    },
  ],
})
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6 p-4">
    <header>
      <h1 class="text-2xl font-bold">
        {{ creation!.title }}
      </h1>
      <p class="text-sm text-muted">
        by {{ creation!.author.displayName ?? creation!.author.username }} ·
        {{ creation!.kind }} · {{ creation!.category }}
      </p>
      <p class="mt-2 whitespace-pre-wrap text-text">
        {{ creation!.description }}
      </p>
    </header>

    <StockMediaGallery :media="creation!.media" />

    <section v-if="parts.length" class="space-y-3">
      <h2 class="kicker">
        Install
      </h2>
      <button class="rounded bg-accent px-3 py-1.5 text-sm text-bg" @click="installAll">
        Copy all required as markdown
      </button>
      <StockPartView
        v-for="p in groups.required"
        :key="p.id"
        :part="p"
        :raw-url="partRawUrl(p.id)"
      />
      <div v-for="[g, ps] in groups.grouped" :key="g" class="rounded border border-border bg-surface p-3">
        <p class="kicker mb-2">
          Pick one: {{ g }}
        </p>
        <div class="mb-2 flex gap-2">
          <button
            v-for="p in ps"
            :key="p.id"
            class="rounded border border-border px-2 py-1 text-xs"
            :class="chosenInGroup[g] === p.id ? 'border-accent' : ''"
            @click="chosenInGroup[g] = p.id"
          >
            {{ p.name }}
          </button>
        </div>
        <StockPartView
          v-for="p in ps.filter(pp => chosenInGroup[g] === pp.id)"
          :key="p.id"
          :part="p"
          :raw-url="partRawUrl(p.id)"
        />
      </div>
    </section>

    <section>
      <h2 class="kicker mb-2">
        Reactions · Installed {{ creation!.installCount }}×
      </h2>
      <StockReactionBar
        :slug="creation!.slug"
        :counts="counts"
        @updated="counts = $event"
      />
    </section>

    <section v-if="creation!.creditsNote">
      <h2 class="kicker mb-1">
        Credits
      </h2>
      <p class="whitespace-pre-wrap text-sm text-muted">
        {{ creation!.creditsNote }}
      </p>
    </section>
  </div>
</template>
