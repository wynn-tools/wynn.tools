import type { Map as LMap } from 'leaflet'
import type { Container } from 'pixi.js'
import type { PlayerLocation } from '~/composables/usePlayerLocations'
import { worldToLatLng } from '~/composables/useMapProjection'

// Module-level cache: UUID → Texture (null means load failed)
const headTextureCache = new Map<string, any>()

const BAR_W = 48
const BAR_H = 5
const BAR_Y = 20

export async function renderPlayerMarkers(
  map: LMap,
  container: Container,
  players: PlayerLocation[],
): Promise<void> {
  const { Container: PContainer, Sprite, Graphics, Text, Assets } = await import('pixi.js')
  container
    .removeChildren()
    .forEach(child => child.destroy({ children: true, texture: false, textureSource: false }))

  for (const player of players) {
    if (player.x == null || player.z == null)
      continue

    const marker = new PContainer() as Container & { _player: PlayerLocation }
    marker._player = player

    // --- Head (32×32, bottom-center anchored so the label sits just below) ---
    if (!headTextureCache.has(player.uuid)) {
      try {
        const tex = await Assets.load(`https://minotar.net/helm/${player.uuid}/100.png`)
        headTextureCache.set(player.uuid, tex)
      }
      catch {
        // don't cache failures — retry on next render
      }
    }
    const headTex = headTextureCache.get(player.uuid)
    if (headTex) {
      const head = new Sprite(headTex)
      head.width = 32
      head.height = 32
      head.anchor.set(0.5, 1) // bottom-center at (0, 0)
      marker.addChild(head)
    }
    else {
      // Fallback: plain circle so name + health bar still render
      const circle = new Graphics()
      circle.beginFill(0xFFFFFF, 0.9)
      circle.drawCircle(0, -16, 16)
      circle.endFill()
      marker.addChild(circle)
    }

    // --- Name label ---
    const nameLabel = new Text({
      text: player.username,
      style: {
        fontSize: 11,
        fill: '#ffffff',
        fontFamily: 'sans-serif',
        stroke: { color: '#000000', width: 2 },
        align: 'center',
      },
    })
    nameLabel.anchor.set(0.5, 0)
    nameLabel.position.set(0, 4) // 4 px below the anchor point
    marker.addChild(nameLabel)

    // --- Health bar — only when health data is available (health === -1 means unknown) ---
    if (player.health >= 0 && player.maxHealth > 0) {
      const barBg = new Graphics()
      barBg.beginFill(0x5A0000)
      barBg.drawRect(-BAR_W / 2, BAR_Y, BAR_W, BAR_H)
      barBg.endFill()
      marker.addChild(barBg)

      const ratio = Math.max(0, Math.min(1, player.health / player.maxHealth))
      const barFg = new Graphics()
      barFg.beginFill(0x44CC44)
      barFg.drawRect(-BAR_W / 2, BAR_Y, Math.max(0, BAR_W * ratio), BAR_H)
      barFg.endFill()
      marker.addChild(barFg)
    }

    // --- Position ---
    const ll = worldToLatLng({ x: player.x, z: player.z })
    const pt = map.latLngToContainerPoint([ll.lat, ll.lng])
    marker.position.set(pt.x, pt.y)

    container.addChild(marker)
  }
}

export function repositionPlayerMarkers(map: LMap, container: Container): void {
  for (const child of container.children) {
    const player = (child as Container & { _player?: PlayerLocation })._player
    if (!player || player.x == null || player.z == null)
      continue
    const ll = worldToLatLng({ x: player.x, z: player.z })
    const pt = map.latLngToContainerPoint([ll.lat, ll.lng])
    child.position.set(pt.x, pt.y)
  }
}
