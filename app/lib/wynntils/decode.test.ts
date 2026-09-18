import type { Block, IdentificationDataBlock } from './decode'
import { describe, expect, it } from 'vitest'
import { DataBlockId, decodeBlocks, decodeString, parseIdString } from './decode'

describe('decodeString (PUA → bytes)', () => {
  it('throws on a non-PUA character', () => {
    expect(() => decodeString('A')).toThrow(/invalid codepoint/i)
  })

  it('decodes the prompt example into a non-empty byte array', () => {
    const bytes = decodeString('󰀀󰄀󰉗󶅲󷀀󰌉󰁅󴬑󴼢󵠘󷀙󴤗󴘄󷕑󷸦󶔄󰌀󰔃\u{10FFFE}')
    expect(bytes.length).toBeGreaterThan(0)
    expect(bytes[0]).toBe(0x00) // StartData
  })
})

describe('parseIdString', () => {
  it('throws on truncated input (no EndData)', () => {
    // StartData(0,version=0), TypeData(1,0) — no end byte after that
    const truncated = '\u{F0000}\u{F0100}'
    expect(() => parseIdString(truncated)).toThrow(/unexpected end/i)
  })

  it('parses the prompt example end-to-end', () => {
    const blocks = parseIdString('󰀀󰄀󰉗󶅲󷀀󰌉󰁅󴬑󴼢󵠘󷀙󴤗󴘄󷕑󷸦󶔄󰌀󰔃\u{10FFFE}')
    expect(blocks[0].name).toBe('StartData')
    expect(blocks.at(-1)!.name).toBe('EndData')
    const nameBlock = blocks.find(b => b.name === 'NameData')
    expect(nameBlock).toBeDefined()
  })
})

describe('decodeBlocks blocks', () => {
  const example = '󰀀󰄀󰉗󶅲󷀀󰌉󰁅󴬑󴼢󵠘󷀙󴤗󴘄󷕑󷸦󶔄󰌀󰔃\u{10FFFE}'
  const blocks = parseIdString(example)

  it('has IdentificationData with at least one entry', () => {
    const ident = blocks.find(b => b.name === 'IdentificationData')
    expect(ident).toBeDefined()
    if (ident && ident.name === 'IdentificationData') {
      expect(ident.layout).toBe('legacy')
      expect(ident.identifications.length).toBeGreaterThan(0)
      for (const i of ident.identifications)
        expect(typeof i.value).toBe('number')
    }
  })

  it('preserves end-of-stream block ordering', () => {
    expect(blocks[0].id).toBe(DataBlockId.StartData)
    expect(blocks[blocks.length - 1].id).toBe(DataBlockId.EndData)
  })
})

describe('decodeBlocks v3 layout (Wynntils PR #4265)', () => {
  const findIdent = (bs: Block[]) => bs.find((b): b is IdentificationDataBlock => b.name === 'IdentificationData')!

  it('decodes a v3 string to its displayed values', () => {
    // The same Warp as the legacy example, shared by a current Wynntils.
    const blocks = parseIdString('\u{F0002}\u{F0100}\u{F0257}\u{F6172}\u{F7000}\u{F0309}\u{F0045}\u{FDA01}\u{F041E}\u{F1152}\u{F0411}\u{F2247}\u{F041A}\u{F18D7}\u{F0104}\u{F1F19}\u{FF10A}\u{F0419}\u{F1729}\u{F0423}\u{F0420}\u{F0418}\u{F51C6}\u{F0304}\u{F1F26}\u{FD803}\u{F0410}\u{F0403}\u{F0005}\u{F0206}\u{F0100}\u{F9EE6}\u{F09FF}')
    expect(blocks[0]).toMatchObject({ name: 'StartData', version: 2 })
    expect(blocks.at(-1)!.name).toBe('EndData')
    const ident = findIdent(blocks)
    expect(ident.layout).toBe('v3')
    // Spell costs are stored sign-flipped: raw2ndSpellCost (38) is -236 on the tooltip.
    expect(ident.identifications.map(i => [i.kind, i.value])).toEqual([
      [69, 109],
      [17, 41],
      [34, -36],
      [24, -108],
      [25, -697],
      [23, -21],
      [4, 16],
      [81, 227],
      [38, 236],
    ])
    for (const i of ident.identifications)
      expect(i.meter).toBeTypeOf('number')
  })

  it('falls back to the legacy identification layout', () => {
    const ident = findIdent(decodeBlocks([0, 2, 3, 1, 1, 0, 5, 4, 42, 255]))
    expect(ident.layout).toBe('legacy')
    expect(ident.identifications).toEqual([{ kind: 5, base: 2, value: 42, preid: false }])
  })

  it('reads the flags byte and the meter byte it announces', () => {
    const ident = findIdent(decodeBlocks([0, 2, 3, 1, 1, 0, 5, 2, 6, 7, 1, 255]))
    expect(ident.identifications[0]).toMatchObject({ kind: 5, base: 1, value: 3, flags: 7, meter: 1, preid: false })
  })

  it('reads pre-identified entries without a value', () => {
    const ident = findIdent(decodeBlocks([0, 2, 3, 1, 1, 1, 5, 4, 6, 2, 10, 255]))
    expect(ident.identifications).toEqual([
      { kind: 5, base: 2, value: null, preid: true },
      { kind: 6, base: 1, value: 10, preid: false },
    ])
  })

  it('reads the mount blocks', () => {
    const blocks = decodeBlocks([0, 2, 16, 0, 21, 1, 1, 5, 10, 14, 3, 10, 255])
    expect(blocks.map(b => b.name)).toEqual(['StartData', 'MountTypeData', 'MountStatsMaxData', 'UsesData', 'EndData'])
    expect(blocks[2]).toMatchObject({ estimatedMaxStats: 1, stats: [{ statId: 5, max: 5 }] })
  })
})
