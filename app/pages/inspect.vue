<script setup lang="ts">
import type { AnalyzeError, AnalyzeResult } from '~/lib/wynntils/analyze'
import InspectorComparableListings from '~/components/Inspector/ComparableListings.vue'
import InspectorErrorCard from '~/components/Inspector/ErrorCard.vue'
import InspectorMarketSummary from '~/components/Inspector/MarketSummary.vue'
import InspectorPasteBox from '~/components/Inspector/PasteBox.vue'
import InspectorPreview from '~/components/Inspector/Preview.vue'
import InspectorWeightsBlock from '~/components/Inspector/WeightsBlock.vue'
import { loadBuildContext, resolveLatestVersionId, useCdnClient } from '~/composables/useBuildData'
import { useItemMarket } from '~/composables/useItemMarket'
import { useItemSearchData } from '~/composables/useItemSearchData'
import { useItemWeights } from '~/composables/useItemWeights'
import { analyzeItem } from '~/lib/wynntils/analyze'
import { decodeBlocks, decodeString } from '~/lib/wynntils/decode'
import { getIdKeys } from '~/lib/wynntils/id-keys'

useHead({ title: 'Item Inspector — wynn.tools' })

const input = ref('')

const { data: deps } = await useAsyncData('inspect-deps', async () => {
  const client = useCdnClient()
  const versionId = await resolveLatestVersionId(client)
  const [loaded, idKeys] = await Promise.all([
    loadBuildContext(client, versionId),
    getIdKeys(),
  ])
  return { ctx: loaded.ctx, idKeys }
}, { server: false })

interface DecodeFailed { kind: 'decode-failed' }
type InspectError = AnalyzeError | DecodeFailed
type InspectResult = AnalyzeResult | { ok: false, error: DecodeFailed }

const analyzed = computed<InspectResult | null>(() => {
  if (!input.value.trim() || !deps.value)
    return null
  try {
    const blocks = decodeBlocks(decodeString(input.value.trim()))
    return analyzeItem(blocks, deps.value.ctx, deps.value.idKeys)
  }
  catch {
    return { ok: false, error: { kind: 'decode-failed' } }
  }
})

const weightsInput = computed(() =>
  analyzed.value && analyzed.value.ok
    ? { encoded: input.value.trim(), itemName: analyzed.value.view.decodedName }
    : null,
)
const weights = useItemWeights(weightsInput)

const marketInput = computed(() =>
  analyzed.value && analyzed.value.ok
    ? { itemName: analyzed.value.view.decodedName, overallRoll: analyzed.value.view.overall }
    : null,
)
const market = useItemMarket(marketInput)

const { data: searchData } = useItemSearchData()
const resolvedSearchItem = computed(() => {
  if (!analyzed.value || !analyzed.value.ok || !searchData.value)
    return null
  const name = analyzed.value.view.decodedName
  return searchData.value.items.find(i => i.displayName === name || i.name === name) ?? null
})

function errorCopy(err: InspectError): { title: string, message: string } {
  switch (err.kind) {
    case 'no-type-block':
    case 'no-name':
    case 'decode-failed':
      return {
        title: 'Couldn’t read item',
        message: 'Make sure you copied the full item string from Wynntils chat.',
      }
    case 'unsupported-type':
      return {
        title: 'Not supported yet',
        message: 'Currently we read identified and unidentified gear only.',
      }
    case 'unknown-item':
      return {
        title: 'Unknown item',
        message: `“${err.name}” isn’t in our current item data.`,
      }
  }
}
</script>

<template>
  <div class="page">
    <div class="detail">
      <div class="grid">
        <aside class="hero">
          <template v-if="!input.trim()">
            <InspectorErrorCard
              title="Paste an item"
              message="Paste a Wynntils-encoded item string on the right to get started."
            />
          </template>
          <template v-else-if="analyzed && analyzed.ok && resolvedSearchItem">
            <InspectorPreview :view="analyzed.view" :search-item="resolvedSearchItem">
              <template #weights>
                <InspectorWeightsBlock
                  :view="analyzed.view"
                  :nori="weights.data?.nori ?? null"
                  :wynnpool="weights.data?.wynnpool ?? null"
                  :pending="weights.pending"
                  :error="weights.error"
                />
              </template>
            </InspectorPreview>
          </template>
          <template v-else-if="analyzed && analyzed.ok && !resolvedSearchItem && searchData">
            <InspectorErrorCard
              title="Unknown item"
              :message="`“${analyzed.view.decodedName}” isn’t in our current item data.`"
            />
          </template>
          <template v-else-if="analyzed && !analyzed.ok">
            <InspectorErrorCard
              :title="errorCopy(analyzed.error).title"
              :message="errorCopy(analyzed.error).message"
            />
          </template>
        </aside>

        <div class="panes">
          <InspectorPasteBox v-model="input" />
          <InspectorMarketSummary
            :price="market.price"
            :pending="market.pending"
          />
          <InspectorComparableListings
            :items="market.listings"
            :pending="market.pending"
            :overall-roll="marketInput?.overallRoll ?? null"
            :mode="market.mode"
            :search-item="resolvedSearchItem"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 20px 0 80px;
}
.grid {
  display: grid;
  grid-template-columns: 482px minmax(0, 1fr);
  gap: 40px;
  align-items: start;
}
.hero {
  position: sticky;
  top: 120px;
  align-self: start;
  min-width: 0;
}
.panes {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
@media (max-width: 1024px) {
  .grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
  }
  .hero {
    position: static;
    justify-self: center;
    width: 100%;
    max-width: 482px;
  }
}
@media (max-width: 720px) {
  .page {
    padding: 12px 0 56px;
  }
  .grid {
    gap: 16px;
  }
  .panes {
    gap: 12px;
  }
  .hero {
    justify-self: stretch;
  }
}
</style>
