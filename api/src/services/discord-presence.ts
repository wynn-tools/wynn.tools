/**
 * Presence-only Discord Gateway client.
 *
 * Opens a WebSocket to the Discord Gateway with intents=0 purely so the bot
 * appears online with a custom activity. Slash commands are still served over
 * HTTP at /v1/discord/interactions; nothing here handles events.
 */

import process from 'node:process'

const GATEWAY_URL = 'wss://gateway.discord.gg/?v=10&encoding=json'

const OP_DISPATCH = 0
const OP_HEARTBEAT = 1
const OP_IDENTIFY = 2
const OP_PRESENCE_UPDATE = 3
const OP_RECONNECT = 7
const OP_INVALID_SESSION = 9
const OP_HELLO = 10
const OP_HEARTBEAT_ACK = 11

interface PresenceOptions {
  token: string
  activityName?: string
  /** Discord activity type: 0 Playing, 2 Listening, 3 Watching, 4 Custom, 5 Competing */
  activityType?: 0 | 2 | 3 | 4 | 5
  status?: 'online' | 'idle' | 'dnd'
}

export function startDiscordPresence(opts: PresenceOptions): { stop: () => void } {
  const activityName = opts.activityName ?? 'wynn.tools'
  const activityType = opts.activityType ?? 3
  const status = opts.status ?? 'online'

  let ws: WebSocket | null = null
  let heartbeatTimer: NodeJS.Timeout | null = null
  let reconnectTimer: NodeJS.Timeout | null = null
  let lastSeq: number | null = null
  let ackPending = false
  let stopped = false
  let backoffMs = 1_000

  function clearTimers() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  function scheduleReconnect() {
    if (stopped)
      return
    if (reconnectTimer)
      return
    const delay = Math.min(backoffMs, 60_000)
    backoffMs = Math.min(backoffMs * 2, 60_000)
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, delay)
  }

  function send(payload: unknown) {
    if (ws && ws.readyState === WebSocket.OPEN)
      ws.send(JSON.stringify(payload))
  }

  function identify() {
    send({
      op: OP_IDENTIFY,
      d: {
        token: opts.token,
        intents: 0,
        properties: { os: process.platform, browser: 'wynn.tools', device: 'wynn.tools' },
        presence: {
          activities: [{ name: activityName, type: activityType }],
          status,
          since: 0,
          afk: false,
        },
      },
    })
  }

  function startHeartbeat(intervalMs: number) {
    clearTimers()
    // first beat after a random jitter, per Discord docs
    const jitter = Math.random() * intervalMs
    setTimeout(() => {
      if (stopped)
        return
      send({ op: OP_HEARTBEAT, d: lastSeq })
      ackPending = true
      heartbeatTimer = setInterval(() => {
        if (ackPending) {
          // missed ack: zombied connection — reconnect
          ws?.close(4000, 'missed heartbeat ack')
          return
        }
        send({ op: OP_HEARTBEAT, d: lastSeq })
        ackPending = true
      }, intervalMs)
    }, jitter)
  }

  function connect() {
    if (stopped)
      return
    try {
      ws = new WebSocket(GATEWAY_URL)
    }
    catch (err) {
      console.warn('[discord-presence] connect failed:', (err as Error)?.message ?? err)
      scheduleReconnect()
      return
    }

    ws.addEventListener('message', (ev) => {
      let payload: { op: number, s: number | null, t: string | null, d: unknown }
      try {
        payload = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString())
      }
      catch {
        return
      }
      if (payload.s != null)
        lastSeq = payload.s

      switch (payload.op) {
        case OP_HELLO: {
          const interval = (payload.d as { heartbeat_interval: number }).heartbeat_interval
          startHeartbeat(interval)
          identify()
          break
        }
        case OP_HEARTBEAT:
          send({ op: OP_HEARTBEAT, d: lastSeq })
          break
        case OP_HEARTBEAT_ACK:
          ackPending = false
          break
        case OP_DISPATCH:
          if (payload.t === 'READY') {
            backoffMs = 1_000
            // refresh presence after READY (some clients miss the IDENTIFY presence)
            send({
              op: OP_PRESENCE_UPDATE,
              d: {
                activities: [{ name: activityName, type: activityType }],
                status,
                since: 0,
                afk: false,
              },
            })
          }
          break
        case OP_RECONNECT:
          ws?.close(4001, 'server asked to reconnect')
          break
        case OP_INVALID_SESSION:
          ws?.close(4002, 'invalid session')
          break
      }
    })

    ws.addEventListener('close', (ev) => {
      clearTimers()
      ackPending = false
      ws = null
      // 4004 = auth failed — token is bad, don't loop
      if (ev.code === 4004) {
        console.error('[discord-presence] authentication failed; stopping')
        stopped = true
        return
      }
      if (!stopped)
        scheduleReconnect()
    })

    ws.addEventListener('error', () => {
      // close handler will fire next; nothing to do here
    })
  }

  connect()

  return {
    stop() {
      stopped = true
      clearTimers()
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      ws?.close(1000, 'shutdown')
      ws = null
    },
  }
}
