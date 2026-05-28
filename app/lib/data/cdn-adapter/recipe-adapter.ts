// ---------------------------------------------------------------------------
// Input types (CDN v3-API schema)
// ---------------------------------------------------------------------------

export interface RawRecipeRange {
  min: number
  max: number
}

export interface RawRecipeMaterial {
  item: string
  amount: number
}

export interface RawRecipe {
  id: number
  name: string
  type: string
  skill: string
  level: RawRecipeRange
  durability?: RawRecipeRange
  duration?: RawRecipeRange
  healthOrDamage?: RawRecipeRange
  materials: RawRecipeMaterial[]
}

// ---------------------------------------------------------------------------
// Output types (hppeng shorthand)
// ---------------------------------------------------------------------------

export interface RecipeMaterial {
  item: string
  amount: number
}

export interface Recipe {
  id: number
  name: string
  /** lowercased item type, e.g. `boots`, `dagger`, `potion` */
  type: string
  skill: string
  lvl: [number, number]
  durability?: [number, number]
  duration?: [number, number]
  damage?: [number, number]
  hp?: [number, number]
  materials: RecipeMaterial[]
}

// Weapon types receive `damage`; everything else (armor, accessory, consumable)
// receives `hp`. Note: in the live CDN data, consumables (potion/scroll/food)
// also carry a `healthOrDamage` field representing the heal/effect amount, so
// they map to `hp` for consistency with the existing hppeng shape.
const WEAPON_TYPES = new Set(['spear', 'wand', 'dagger', 'bow', 'relik'])

export function adaptRecipes(raw: { recipes: RawRecipe[] }): Recipe[] {
  return raw.recipes.map(adaptOne)
}

function adaptOne(r: RawRecipe): Recipe {
  const type = r.type.toLowerCase()

  const out: Recipe = {
    id: r.id,
    name: r.name,
    type,
    skill: r.skill,
    lvl: [r.level.min, r.level.max],
    materials: r.materials.map(m => ({ item: m.item, amount: m.amount })),
  }

  if (r.durability)
    out.durability = [r.durability.min, r.durability.max]
  if (r.duration)
    out.duration = [r.duration.min, r.duration.max]

  if (r.healthOrDamage) {
    const range: [number, number] = [r.healthOrDamage.min, r.healthOrDamage.max]
    if (WEAPON_TYPES.has(type))
      out.damage = range
    else
      out.hp = range
  }

  return out
}
