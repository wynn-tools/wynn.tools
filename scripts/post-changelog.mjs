#!/usr/bin/env node
// Post changelog entries to the wynn.tools Discord #changelog channel.
//
// Usage:
//   node scripts/post-changelog.mjs <entries.json>
//   node scripts/post-changelog.mjs --dry-run <entries.json>   # print, don't post
//
// entries.json is an array of { title, description } objects, ordered as you
// want them to appear. Discord shows newest message last, so the array is
// posted top-to-bottom — put the OLDEST entry first and the NEWEST last if you
// want the newest to sit at the bottom of the channel.
//
// The bot token is read from api/.env (DISCORD_TOKEN). Channel is resolved by
// name ("changelog") in the wynn.tools guild, so it survives channel re-creation.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const API = 'https://discord.com/api/v10'
const GUILD_ID = '1507798652654190622' // wynn.tools
const CHANNEL_NAME = 'changelog'
const ACCENT = 0x2D7FF0 // brand electric blue
const UA = 'wynn.tools-changelog (https://wynn.tools, 1.0)'

function readToken() {
  const env = readFileSync(resolve(ROOT, 'api/.env'), 'utf8')
  const line = env.split('\n').find(l => l.startsWith('DISCORD_TOKEN='))
  if (!line)
    throw new Error('DISCORD_TOKEN not found in api/.env')
  return line.slice('DISCORD_TOKEN='.length).trim()
}

async function discord(token, method, path, body) {
  for (;;) {
    const res = await fetch(API + path, {
      method,
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': UA,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.status === 429) {
      const info = await res.json()
      const wait = (info.retry_after ?? 1) * 1000 + 250
      console.warn(`  rate limited, waiting ${Math.round(wait)}ms`)
      await new Promise(r => setTimeout(r, wait))
      continue
    }
    if (!res.ok)
      throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`)
    return res.status === 204 ? null : res.json()
  }
}

async function resolveChannelId(token) {
  const channels = await discord(token, 'GET', `/guilds/${GUILD_ID}/channels`)
  const ch = channels.find(c => c.name === CHANNEL_NAME)
  if (!ch)
    throw new Error(`#${CHANNEL_NAME} channel not found in guild ${GUILD_ID}`)
  return ch.id
}

function toEmbed(entry) {
  if (!entry.title || !entry.description)
    throw new Error(`each entry needs { title, description }; got ${JSON.stringify(entry)}`)
  return { title: entry.title, description: entry.description, color: entry.color ?? ACCENT }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const file = args.find(a => !a.startsWith('--'))
  if (!file) {
    console.error('usage: node scripts/post-changelog.mjs [--dry-run] <entries.json>')
    process.exit(1)
  }

  const entries = JSON.parse(readFileSync(resolve(process.cwd(), file), 'utf8'))
  if (!Array.isArray(entries))
    throw new Error('entries file must be a JSON array')
  const embeds = entries.map(toEmbed)

  if (dryRun) {
    console.log(`[dry-run] would post ${embeds.length} entr${embeds.length === 1 ? 'y' : 'ies'}:`)
    for (const e of embeds) console.log(`  • ${e.title}\n      ${e.description.replace(/\n/g, '\n      ')}`)
    return
  }

  const token = readToken()
  const channelId = await resolveChannelId(token)
  for (const embed of embeds) {
    const msg = await discord(token, 'POST', `/channels/${channelId}/messages`, { embeds: [embed] })
    console.log(`posted ${msg.id}  ${embed.title}`)
    await new Promise(r => setTimeout(r, 600)) // gentle spacing
  }
  console.log('done.')
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
