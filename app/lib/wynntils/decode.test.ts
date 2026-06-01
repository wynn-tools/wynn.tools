import { describe, expect, it } from 'vitest'
import { DataBlockId, decodeString, parseIdString } from './decode'

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
      expect(ident.identifications.length).toBeGreaterThan(0)
      for (const i of ident.identifications)
        expect(typeof i.roll === 'number' || i.roll === 'preid').toBe(true)
    }
  })

  it('preserves end-of-stream block ordering', () => {
    expect(blocks[0].id).toBe(DataBlockId.StartData)
    expect(blocks[blocks.length - 1].id).toBe(DataBlockId.EndData)
  })
})
