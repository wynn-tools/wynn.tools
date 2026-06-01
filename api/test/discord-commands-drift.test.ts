import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { COMMAND_NAMES, COMMANDS } from '../src/services/discord-interactions/commands'

describe('discord command drift', () => {
  it('cOMMANDS list matches COMMAND_NAMES', () => {
    expect(COMMANDS.map(c => c.name).sort()).toEqual([...COMMAND_NAMES].sort())
  })

  it('every command name appears in the dispatcher switch', () => {
    const dispatch = readFileSync(new URL('../src/services/discord-interactions/dispatch.ts', import.meta.url), 'utf8')
    for (const name of COMMAND_NAMES)
      expect(dispatch, `dispatcher missing case for "${name}"`).toContain(`case '${name}':`)
  })
})
