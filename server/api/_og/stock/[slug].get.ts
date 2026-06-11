import { Buffer } from 'node:buffer'

interface StockResp {
  title: string
  description: string
  kind: string
  category: string
  classes: string[]
  installCount: number
  reactionCounts: { total?: number } & Record<string, number>
  author: { username: string, displayName: string | null }
}

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  const config = useRuntimeConfig()

  let creation: StockResp
  try {
    creation = await $fetch<StockResp>(`${config.public.apiBaseUrl}/v1/stock/${slug}`)
  }
  catch {
    throw createError({ statusCode: 404 })
  }

  const meta = {
    title: creation.title,
    description: creation.description,
    kind: creation.kind,
    category: creation.category,
    classes: creation.classes,
    author: creation.author.displayName ?? creation.author.username,
    installCount: creation.installCount,
    reactionTotal: creation.reactionCounts.total ?? 0,
  }

  const ogPath = buildOgImagePath('StockCard', meta as Record<string, unknown>, `/stock/${slug}`)
  const data = await $fetch<ArrayBuffer>(ogPath, { responseType: 'arrayBuffer' })

  setResponseHeader(event, 'content-type', 'image/png')
  return Buffer.from(data)
})
