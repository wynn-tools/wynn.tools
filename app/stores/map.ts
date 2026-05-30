import type { Lootrun, MapCategoryId, ShareView, WorldId } from '~/types/map'
import { defineStore } from 'pinia'
import { defaultEnabledCategories, getCategory, getChildCategories } from '~/config/categories'

const DEFAULTS = {
  world: 'main' as WorldId,
  center: { x: 477, z: -1590 },
  zoom: 4,
  focus: null as string | null,
  fs: false,
}

export const useMapStore = defineStore('map', {
  state: () => ({
    world: DEFAULTS.world,
    center: { ...DEFAULTS.center },
    zoom: DEFAULTS.zoom,
    enabledCategories: defaultEnabledCategories(),
    focus: DEFAULTS.focus,
    fs: DEFAULTS.fs,
    lootrun: null as Lootrun | null,
    showTerritories: false,
    coordPin: null as { x: number, z: number } | null,
    levelRange: null as [number, number] | null,
    ingredientDrop: null as string | null,
    viewBounds: null as { x1: number, z1: number, x2: number, z2: number } | null,
  }),
  actions: {
    setWorld(id: WorldId) {
      this.world = id
    },
    setCenter(x: number, z: number) {
      this.center = { x, z }
    },
    setZoom(zoom: number) {
      this.zoom = zoom
    },
    toggleCategory(id: MapCategoryId) {
      const cat = getCategory(id)
      if (cat?.virtual) {
        const children = getChildCategories(id)
        const childIds = children.map(c => c.id)
        const anyOn = childIds.some(cid => this.enabledCategories.includes(cid))
        if (anyOn) {
          this.enabledCategories = this.enabledCategories.filter(cid => !childIds.includes(cid))
        }
        else {
          this.enabledCategories.push(
            ...childIds.filter(cid => !this.enabledCategories.includes(cid)),
          )
        }
      }
      else {
        const i = this.enabledCategories.indexOf(id)
        if (i >= 0)
          this.enabledCategories.splice(i, 1)
        else this.enabledCategories.push(id)
      }
    },
    setEnabledCategories(ids: MapCategoryId[]) {
      this.enabledCategories = [...ids]
    },
    setFocus(id: string | null) {
      this.focus = id
    },
    setFullscreen(v: boolean) {
      this.fs = v
    },
    setLootrun(lr: Lootrun | null) {
      this.lootrun = lr
    },
    clearLootrun() {
      this.lootrun = null
    },
    setCoordPin(pin: { x: number, z: number } | null) {
      this.coordPin = pin
    },
    setIngredientDrop(name: string | null) {
      this.ingredientDrop = name
    },
    toggleTerritories() {
      this.showTerritories = !this.showTerritories
    },
    setLevelRange(range: [number, number] | null) {
      this.levelRange = range
    },
    setViewBounds(b: { x1: number, z1: number, x2: number, z2: number } | null) {
      this.viewBounds = b
    },
    hydrate(v: Partial<ShareView>) {
      if (v.world)
        this.setWorld(v.world)
      if (v.center)
        this.setCenter(v.center.x, v.center.z)
      if (v.zoom !== undefined)
        this.setZoom(v.zoom)
      if (v.cats)
        this.setEnabledCategories(v.cats)
      if (v.focus !== undefined)
        this.setFocus(v.focus)
      if (v.fs !== undefined)
        this.setFullscreen(v.fs)
      if (v.ing !== undefined)
        this.setIngredientDrop(v.ing ?? null)
    },
    resetToDefaults() {
      this.world = DEFAULTS.world
      this.center = { ...DEFAULTS.center }
      this.zoom = DEFAULTS.zoom
      this.enabledCategories = defaultEnabledCategories()
      this.focus = DEFAULTS.focus
      this.fs = DEFAULTS.fs
      this.lootrun = null
      this.showTerritories = false
      this.levelRange = null
      this.ingredientDrop = null
    },
  },
})
