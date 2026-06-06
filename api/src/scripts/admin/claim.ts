import process from 'node:process'
import { sql } from 'drizzle-orm'
import { getDb } from '../../db/client'

interface ClaimOpts { syntheticId: string, realId: string, confirm: boolean }

export async function performClaim(opts: ClaimOpts) {
  const db = getDb()
  const synth = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, opts.syntheticId) })
  const real = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, opts.realId) })
  if (!synth)
    throw new Error(`Synthetic user ${opts.syntheticId} not found`)
  if (!real)
    throw new Error(`Real user ${opts.realId} not found`)
  if (synth.kind === 'real')
    throw new Error(`Source user is kind=real, expected synthetic`)
  if (real.kind !== 'real')
    throw new Error(`Target user kind=${real.kind}, expected real`)

  const ownedBuilds = await db.execute(sql`SELECT count(*)::int AS c FROM builds WHERE user_id = ${opts.syntheticId}`)
  const cocredits = await db.execute(sql`SELECT count(*)::int AS c FROM build_credits WHERE user_id = ${opts.syntheticId}`)
  console.log(`Would transfer: ${ownedBuilds.rows[0].c} builds, ${cocredits.rows[0].c} co-credits from ${synth.username} → ${real.username}`)
  if (!opts.confirm) {
    console.log('Dry run (no --yes). No changes applied.')
    return
  }
  await db.transaction(async (tx) => {
    // Drop overlap: synth is co-credited on builds already owned by real (after transfer they'd be self-credits or PKdup)
    await tx.execute(sql`DELETE FROM build_credits WHERE user_id = ${opts.syntheticId} AND build_id IN (SELECT id FROM builds WHERE user_id = ${opts.realId})`)
    // Transfer build ownership
    await tx.execute(sql`UPDATE builds SET user_id = ${opts.realId} WHERE user_id = ${opts.syntheticId}`)
    // Transfer co-credits that won't collide
    await tx.execute(sql`UPDATE build_credits SET user_id = ${opts.realId} WHERE user_id = ${opts.syntheticId} AND build_id NOT IN (SELECT build_id FROM build_credits WHERE user_id = ${opts.realId})`)
    // Clean up any remaining synth co-credits (duplicates after transfer)
    await tx.execute(sql`DELETE FROM build_credits WHERE user_id = ${opts.syntheticId}`)
    // Delete synthetic user
    await tx.execute(sql`DELETE FROM users WHERE id = ${opts.syntheticId}`)
  })
  console.log('Claim completed.')
}

if (process.argv[1]?.endsWith('claim.ts') || process.argv[1]?.endsWith('claim.js')) {
  const [syntheticId, realId, ...rest] = process.argv.slice(2)
  const confirm = rest.includes('--yes')
  if (!syntheticId || !realId) {
    console.error('Usage: pnpm admin:claim <syntheticId> <realId> [--yes]')
    process.exit(1)
  }
  performClaim({ syntheticId, realId, confirm }).catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
