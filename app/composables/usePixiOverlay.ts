import type { Map as LMap } from 'leaflet'
import type { Application, Container } from 'pixi.js'

export interface PixiHandle {
  app: Application
  root: Container
  layers: {
    territories: Container
    markers: Container
    clusters: Container
    lootrun: Container
    ingredientDrops: Container
    players: Container
    focus: Container
    coordPin: Container
  }
  destroy: () => void
  redraw: () => void
}

export async function mountPixiOverlay(map: LMap): Promise<PixiHandle> {
  const { Application, Container } = await import('pixi.js')

  const app = new Application()
  await app.init({
    backgroundAlpha: 0,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    antialias: false,
  })

  // Mount directly on the Leaflet container (not inside the map pane which gets CSS
  // transformed). The container itself has no transform, so position:absolute top/left 0
  // always sits flush over the visible map area — matching latLngToContainerPoint coords.
  // Enable pointer events so Pixi's event system fires on sprites/labels.
  // autoPreventDefault=false means non-hit events propagate to Leaflet (map panning still works).
  app.renderer.events.autoPreventDefault = false

  const mapContainer = map.getContainer()
  const canvas = app.canvas as HTMLCanvasElement
  canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:auto;z-index:400;'
  mapContainer.appendChild(canvas)

  const root = new Container()
  const layers = {
    territories: new Container(),
    markers: new Container(),
    clusters: new Container(),
    lootrun: new Container(),
    ingredientDrops: new Container(),
    players: new Container(),
    focus: new Container(),
    coordPin: new Container(),
  }
  // Render order: territories → markers → clusters → lootrun → ingredientDrops → focus → players → coordPin
  // players must be above focus (place labels) so player heads are never buried under city text
  root.addChild(
    layers.territories,
    layers.markers,
    layers.clusters,
    layers.lootrun,
    layers.ingredientDrops,
    layers.focus,
    layers.players,
    layers.coordPin,
  )
  app.stage.addChild(root)

  // Keep canvas sized to the map viewport
  function resize() {
    const size = map.getSize()
    app.renderer.resize(size.x, size.y)
  }

  // Hide during zoom animation to avoid sprite jumping on intermediate frames.
  // zoomend triggers a full reseed in MapCanvas which restores correct positions.
  function onZoomStart() {
    canvas.style.opacity = '0'
  }
  function onZoomEnd() {
    canvas.style.opacity = '1'
  }

  map.on('resize', resize)
  map.on('zoomstart', onZoomStart)
  map.on('zoomend', onZoomEnd)
  resize()

  function redraw() {
    app.renderer.render(app.stage)
  }

  return {
    app,
    root,
    layers,
    redraw,
    destroy: () => {
      map.off('resize', resize)
      map.off('zoomstart', onZoomStart)
      map.off('zoomend', onZoomEnd)
      root.destroy({ children: true })
      app.destroy(true, { children: true })
      canvas.remove()
    },
  }
}
