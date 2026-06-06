import process from 'node:process'
import { loadCredits as loadBuildDbCredits, parseBuildDb, validateCredits as validateBuildDb } from './build-db/parse'
import { runImport } from './shared/run'
import { loadCredits as loadSugvonCredits, parseSugvon, validateCredits as validateSugvon } from './sugvon/parse'

async function main() {
  const bdEntries = parseBuildDb()
  const bdCredits = loadBuildDbCredits()
  const bdMissing = validateBuildDb(bdEntries, bdCredits)
  if (bdMissing.length)
    throw new Error(`build-db missing credits: ${bdMissing.join(', ')}`)

  const svEntries = parseSugvon()
  const svCredits = loadSugvonCredits()
  const svMissing = validateSugvon(svEntries, svCredits)
  if (svMissing.length)
    throw new Error(`sugvon missing credits: ${svMissing.join(', ')}`)

  console.log(`Importing build-db (${bdEntries.length} entries)…`)
  await runImport({ source: 'build-db', entries: bdEntries, credits: bdCredits })
  console.log(`Importing sugvon (${svEntries.length} entries)…`)
  await runImport({ source: 'sugvon', entries: svEntries, credits: svCredits })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
