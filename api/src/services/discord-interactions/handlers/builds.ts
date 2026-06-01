import type { BuildSearchFilters } from '../build-search'
import type { ItemIndex } from '../item-index'
import type { Interaction, InteractionResponse } from '../types'
import { env } from '../../../env'
import { BUILDS_PAGE_SIZE, decodeFilters, encodeFilters, searchBuilds } from '../build-search'
import { ephemeral } from '../dispatch'
import { getOption, ResponseType } from '../types'

function extractFilters(interaction: Interaction, index: ItemIndex): BuildSearchFilters {
  const userOpt = interaction.data?.options?.find(o => o.name === 'user')
  const discordUserId = userOpt?.value ? String(userOpt.value) : undefined
  const playerClass = getOption(interaction, 'class')
  const itemName = getOption(interaction, 'item')
  const item = itemName ? index.get(itemName) : undefined
  const nameQuery = getOption(interaction, 'name')
  return {
    discordUserId,
    playerClass,
    itemId: item?.id,
    nameQuery,
  }
}

export async function handleBuilds(interaction: Interaction, index: ItemIndex): Promise<InteractionResponse> {
  const filters = extractFilters(interaction, index)
  return renderPage(filters, 0)
}

export async function handleBuildsComponent(interaction: Interaction): Promise<InteractionResponse> {
  const customId = interaction.data?.custom_id ?? ''
  const decoded = decodeFilters(customId)
  if (!decoded)
    return ephemeral('Invalid pagination state')
  const rendered = await renderPage(decoded.filters, decoded.page)
  return { ...rendered, type: ResponseType.UPDATE_MESSAGE }
}

async function renderPage(filters: BuildSearchFilters, page: number): Promise<InteractionResponse> {
  if (!filters.discordUserId && !filters.playerClass && filters.itemId === undefined && !filters.nameQuery)
    return ephemeral('Provide at least one filter: user, class, item, or name.')

  const { results, total, unlinkedUser } = await searchBuilds(filters, page)
  if (unlinkedUser)
    return ephemeral('This user hasn\'t linked a wynn.tools account.')
  if (total === 0)
    return ephemeral('No builds matched.')

  const frontend = env().FRONTEND_URL.replace(/\/$/, '')
  const lines = results.map(r => `• [${r.name}](${frontend}/builder/${r.id}) — ${r.playerClass ?? 'unknown'}`)
  const totalPages = Math.ceil(total / BUILDS_PAGE_SIZE)

  const components = totalPages > 1
    ? [{
        type: 1,
        components: [
          { type: 2, style: 2, label: 'Prev', custom_id: encodeFilters({ ...filters }, Math.max(0, page - 1)), disabled: page === 0 },
          { type: 2, style: 2, label: 'Next', custom_id: encodeFilters({ ...filters }, Math.min(totalPages - 1, page + 1)), disabled: page >= totalPages - 1 },
        ],
      }]
    : []

  return {
    type: ResponseType.CHANNEL_MESSAGE,
    data: {
      embeds: [{
        title: `Builds (${total})`,
        description: lines.join('\n'),
        footer: { text: `Page ${page + 1} of ${totalPages}` },
      }],
      components,
    },
  }
}
