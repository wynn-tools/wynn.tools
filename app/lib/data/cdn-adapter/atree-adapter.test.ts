import { describe, expect, it } from 'vitest'
import archerFile from '~/../app/lib/data/__fixtures__/cdn/atree/archer.json'
import warriorFile from '~/../app/lib/data/__fixtures__/cdn/atree/warrior.json'
import { getSortedClassAtree } from '~/lib/atree/build-atree'
import { adaptCdnAtree, mergeClassAtrees } from './atree-adapter'

const archerAbilities = adaptCdnAtree(archerFile)

describe('adaptCdnAtree', () => {
  it('maps field renames correctly for a known node', () => {
    // Node id=1: Bow Proficiency, connections=[0], dependencies=[], blockers=[]
    const node = archerAbilities.find(a => a.id === 1)!
    expect(node).toBeDefined()
    expect(node.display_name).toBe('Bow Proficiency')
    expect(node.desc).toBe(archerFile.nodes[1].description)
    expect(node.parents).toEqual([0])
    expect(node.dependencies).toEqual([])
    expect(node.blockers).toEqual([])
    expect(node.cost).toBe(1)
  })

  it('sets archetype when source is non-null and non-empty', () => {
    // Node id=0 Arrow Bomb has archetype='arrowbomb'
    const root = archerAbilities.find(a => a.id === 0)!
    expect(root.archetype).toBe('arrowbomb')
  })

  it('has exactly one root node with parents.length === 0', () => {
    const roots = archerAbilities.filter(a => a.parents.length === 0)
    expect(roots).toHaveLength(1)
    expect(roots[0].display_name).toBe('Arrow Bomb')
  })

  it('maps parents verbatim from connections', () => {
    // Node id=2: Cheaper Arrow Bomb I, connections=[0]
    const node = archerAbilities.find(a => a.id === 2)!
    expect(node.parents).toEqual(archerFile.nodes[2].connections)
  })

  it('maps archetypeRequirement to archetype_req', () => {
    const node = archerAbilities.find(a => a.id === 1)!
    expect(node.archetype_req).toBe(archerFile.nodes[1].archetypeRequirement)
  })

  it('does not set req_archetype', () => {
    for (const ability of archerAbilities) {
      expect(ability.req_archetype).toBeUndefined()
    }
  })

  it('sets display from location and icon', () => {
    // Node id=0: location={page:1,row:1,col:5}, icon='abilityTree.nodeArcher'
    const root = archerAbilities.find(a => a.id === 0)!
    expect(root.display).toEqual({
      page: 1,
      row: 1,
      col: 5,
      icon: 'abilityTree.nodeArcher',
    })
  })

  it('leaves effects, properties, base_abil undefined', () => {
    for (const ability of archerAbilities) {
      expect(ability.effects).toBeUndefined()
      expect(ability.properties).toBeUndefined()
      expect(ability.base_abil).toBeUndefined()
    }
  })
})

describe('getSortedClassAtree integration', () => {
  it('returns all nodes (all reachable from single root)', () => {
    const atreeData = { Archer: archerAbilities }
    const sorted = getSortedClassAtree(atreeData, 'Archer')
    expect(sorted.length).toBe(archerFile.nodes.length)
    for (const entry of sorted) {
      expect(entry.ability.display_name).toBeDefined()
    }
  })
})

describe('mergeClassAtrees', () => {
  it('produces AtreeData with correct class keys and non-empty arrays', () => {
    const merged = mergeClassAtrees({ Archer: archerFile, Warrior: warriorFile })
    expect(Object.keys(merged)).toEqual(expect.arrayContaining(['Archer', 'Warrior']))
    expect(merged.Archer.length).toBeGreaterThan(0)
    expect(merged.Warrior.length).toBeGreaterThan(0)
    expect(merged.Archer.length).toBe(archerFile.nodes.length)
    expect(merged.Warrior.length).toBe(warriorFile.nodes.length)
  })
})
