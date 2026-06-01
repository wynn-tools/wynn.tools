import process from 'node:process'
import { env } from '../env'
import { COMMANDS } from '../services/discord-interactions/commands'

async function main() {
  const e = env()
  const url = `https://discord.com/api/v10/applications/${e.DISCORD_APPLICATION_ID}/commands`
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bot ${e.DISCORD_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(COMMANDS),
  })
  if (!res.ok) {
    console.error('Discord command registration failed:', res.status, await res.text())
    process.exit(1)
  }

  console.log(`Registered ${COMMANDS.length} commands.`)
}

main()
