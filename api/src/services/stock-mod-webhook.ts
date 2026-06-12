import { env } from '../env'

export async function postModReport(
  content: string,
  deps: { fetch?: typeof globalThis.fetch } = {},
): Promise<void> {
  const url = env().DISCORD_STOCK_MOD_WEBHOOK_URL
  if (!url) {
    console.warn('[stock-mod] DISCORD_STOCK_MOD_WEBHOOK_URL unset; report not forwarded')
    return
  }
  try {
    const r = await (deps.fetch ?? globalThis.fetch)(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    if (!r.ok)
      console.warn('[stock-mod] webhook failed', r.status)
  }
  catch (err) {
    console.warn('[stock-mod] webhook threw', err)
  }
}
