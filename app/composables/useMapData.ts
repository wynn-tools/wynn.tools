import type { MapsJsonEntry } from '~/composables/useTileLayer'
import type { MapFeature } from '~/types/map'
import { tagFeaturesByWorld } from '~/composables/useWorldTagging'

const STATIC_BASE = 'https://cdn.wynntils.com/static'

const url = {
  maps: `${STATIC_BASE}/Reference/maps.json`,
  placeFeatures: `${STATIC_BASE}/Reference/place_mapfeatures.json`,
  combatLocations: `${STATIC_BASE}/Data-Storage/combat_locations.json`,
  caves: `${STATIC_BASE}/Reference/caves.json`,
  serviceFeatures: `${STATIC_BASE}/Data-Storage/services_crowdsourced.json`,
}

// Mirrors ServiceLocation.ServiceKind in the Wynntils client
const SERVICE_TYPE_TO_CATEGORY: Record<string, string> = {
  'Alchemism Station': 'wynntils:service:profession:alchemism',
  'Armour Merchant': 'wynntils:service:merchant:armor',
  'Armouring Station': 'wynntils:service:profession:armoring',
  'Blacksmith': 'wynntils:service:blacksmith',
  'Booth Shop': 'wynntils:service:booth-shop',
  'Cooking Station': 'wynntils:service:profession:cooking',
  'Dungeon Merchant': 'wynntils:service:merchant:dungeon',
  'Dungeon Scroll Merchant': 'wynntils:service:merchant:dungeon-scroll',
  'Emerald Merchant': 'wynntils:service:merchant:emerald',
  'Exchange Merchant': 'wynntils:service:merchant:exchange',
  'Fast Travel': 'wynntils:service:fast-travel',
  'Housing Balloon': 'wynntils:service:housing-balloon',
  'Item Identifier': 'wynntils:service:identifier',
  'Item Upgrader': 'wynntils:service:item-upgrader',
  'Jeweling Station': 'wynntils:service:profession:jeweling',
  'Liquid Merchant': 'wynntils:service:merchant:liquid-emerald',
  'Mount Enclosure': 'wynntils:service:mount-enclosure',
  'Mount Merchant': 'wynntils:service:merchant:mount',
  'Party Finder': 'wynntils:service:party-finder',
  'Potion Merchant': 'wynntils:service:merchant:potion',
  'Scribing Station': 'wynntils:service:profession:scribing',
  'Scroll Merchant': 'wynntils:service:merchant:scroll',
  'Seaskipper': 'wynntils:service:seaskipper',
  'Tailoring Station': 'wynntils:service:profession:tailoring',
  'Tool Merchant': 'wynntils:service:merchant:tool',
  'Trade Market': 'wynntils:service:trade-market',
  'Weapon Merchant': 'wynntils:service:merchant:weapon',
  'Weaponsmithing Station': 'wynntils:service:profession:weaponsmithing',
  'Woodworking Station': 'wynntils:service:profession:woodworking',
}

interface CrowdsourcedServiceEntry {
  type: string
  locations: { x: number, y: number, z: number }[]
}

interface CombatLocationEntry {
  type: string
  locations: { name: string, coordinates: { x: number, y: number, z: number } }[]
}

const COMBAT_TYPE_TO_CATEGORY: Record<string, string> = {
  'Boss Altars': 'wynntils:content:boss-altar',
  'Caves': 'wynntils:content:cave',
  'Dungeons': 'wynntils:content:dungeon',
  'Grind Spots': 'wynntils:content:grind-spot',
  'Lootrun Camps': 'wynntils:content:lootrun-camp',
  'Raids': 'wynntils:content:raid',
  'Rune Shrines': 'wynntils:content:shrine',
}

function stripFormatting(s: string): string {
  return s.replace(/§./g, '')
}

async function getJson<T>(u: string): Promise<T> {
  const res = await fetch(u)
  if (!res.ok)
    throw new Error(`${u}: ${res.status}`)
  return (await res.json()) as T
}

export async function loadMapsJson(): Promise<MapsJsonEntry[]> {
  return getJson<MapsJsonEntry[]>(url.maps)
}

export interface CaveJsonEntry {
  type: 'cave'
  name: string
  specialInfo: string
  description: string
  length: 'short' | 'medium' | 'long'
  difficulty: 'easy' | 'medium' | 'hard'
  requirements: number
  rewards: string[]
  location: { x: number, y: number, z: number }
}

export async function loadAllFeatures(
  onProgress?: (stepId: string) => void,
): Promise<{
  places: MapFeature[]
  content: MapFeature[]
  services: MapFeature[]
  caves: CaveJsonEntry[]
}> {
  const track = async <T>(p: Promise<T>, stepId: string): Promise<T> => {
    const result = await p
    onProgress?.(stepId)
    return result
  }

  const [placeFeatures, combatLocationEntries, serviceFeatures, caves] = await Promise.all([
    track(getJson<any[]>(url.placeFeatures), 'places'),
    track(getJson<CombatLocationEntry[]>(url.combatLocations), 'combat'),
    track(getJson<CrowdsourcedServiceEntry[]>(url.serviceFeatures), 'services'),
    track(getJson<CaveJsonEntry[]>(url.caves), 'caves'),
  ])

  const normalize = (raw: any): MapFeature => ({
    featureId: raw.featureId,
    categoryId: raw.categoryId,
    label: stripFormatting(raw.attributes?.label ?? raw.featureId),
    location: raw.location,
    level: raw.level ?? raw.attributes?.level,
  })

  const normalizedServices: MapFeature[] = serviceFeatures.flatMap((entry) => {
    const categoryId = SERVICE_TYPE_TO_CATEGORY[entry.type]
    if (!categoryId)
      return []
    const slug = entry.type.toLowerCase().replace(/\s+/g, '-')
    return entry.locations.map((loc, i) => ({
      featureId: `${slug}-${i}`,
      categoryId,
      label: entry.type,
      location: loc,
      level: undefined,
    }))
  })

  const normalizedCombat: MapFeature[] = combatLocationEntries.flatMap((entry) => {
    const categoryId = COMBAT_TYPE_TO_CATEGORY[entry.type]
    if (!categoryId || entry.type === 'Caves')
      return []
    const slug = entry.type.toLowerCase().replace(/\s+/g, '-')
    return entry.locations.map((loc, i) => ({
      featureId: `${slug}-${i}`,
      categoryId,
      label: loc.name,
      location: { x: loc.coordinates.x, y: loc.coordinates.y, z: loc.coordinates.z },
      level: undefined,
    }))
  })

  const combatCaveLocs = new Set(
    combatLocationEntries
      .find(e => e.type === 'Caves')
      ?.locations
      .map(loc => `${loc.coordinates.x},${loc.coordinates.z}`) ?? [],
  )
  const extraCaveFeatures: MapFeature[] = caves
    .filter(c => !combatCaveLocs.has(`${c.location.x},${c.location.z}`))
    .map(c => ({
      featureId: `cave-${c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      categoryId: 'wynntils:content:cave',
      label: c.name,
      location: c.location,
      level: c.requirements || undefined,
    }))

  return {
    places: tagFeaturesByWorld(placeFeatures.map(normalize)),
    content: tagFeaturesByWorld([...normalizedCombat, ...extraCaveFeatures]),
    services: tagFeaturesByWorld(normalizedServices),
    caves: caves.map(c => ({
      ...c,
      name: stripFormatting(c.name),
      description: stripFormatting(c.description),
      specialInfo: stripFormatting(c.specialInfo),
    })),
  }
}
