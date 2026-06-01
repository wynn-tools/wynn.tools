import type { ItemIndex } from '../item-index'
import type { Interaction, InteractionResponse } from '../types'
import { env } from '../../../env'
import { ephemeral } from '../dispatch'
import { rarityColor } from '../embed'
import { getFocusedOption, getOption, ResponseType } from '../types'

export function autocompleteItem(interaction: Interaction, index: ItemIndex): InteractionResponse {
  const focused = getFocusedOption(interaction)
  const choices = index.suggest(focused?.value ?? '').map(i => ({ name: i.name, value: i.name }))
  return { type: ResponseType.AUTOCOMPLETE_RESULT, data: { choices } }
}

export function handleItem(
  interaction: Interaction,
  index: ItemIndex,
  optionName: 'name' | 'item' = 'name',
): InteractionResponse {
  const name = getOption(interaction, optionName)
  if (!name)
    return ephemeral('Missing item name')
  const item = index.get(name)
  if (!item)
    return ephemeral(`Item not found: ${name}`)

  const idFields = Object.entries(item.identifications).slice(0, 8).map(([k, v]) => ({
    name: k,
    value: String(v ?? ''),
    inline: true,
  }))

  const url = `${env().FRONTEND_URL.replace(/\/$/, '')}/items/${encodeURIComponent(item.name)}`

  return {
    type: ResponseType.CHANNEL_MESSAGE,
    data: {
      embeds: [{
        title: item.name,
        url,
        color: rarityColor(item.rarity),
        description: `**${item.rarity}** ${item.type}${item.tier ? ` · ${item.tier}` : ''}`,
        fields: idFields,
      }],
      components: [{
        type: 1,
        components: [{ type: 2, style: 5, label: 'Open in wynn.tools', url }],
      }],
    },
  }
}
