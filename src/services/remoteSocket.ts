import type { RemoteDataProvider } from "@/services/remoteProvider"
import {
  PROTOCOL_VERSION,
  type AccessFields,
  type ClientMessage,
  type CommandName,
  type CommandResult,
  type QueryName,
  type RemoteSnapshot,
  type ServerMessage,
  type StopReason,
} from "@/types/remote"

const PING_INTERVAL_MS = 10_000
/** No answer for this long means the connection is dead, even if the browser has not noticed yet. */
const SILENCE_LIMIT_MS = 25_000
const COMMAND_TIMEOUT_MS = 5_000
/** A library read can be slower: an online Bible goes to the internet. */
const QUERY_TIMEOUT_MS = 15_000
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 10_000]

export interface SocketOptions {
  url: string
  address: string
  deviceToken: string | null
  pairingToken: string | null
  deviceName?: string
  /** Called with what the server gave back on every accepted connection. */
  onAccepted?: (deviceToken: string | undefined) => void
  /** The server no longer knows this device: its saved token is useless. */
  onDeviceTokenInvalid?: () => void
  createSocket?: (url: string) => WebSocket
}

interface PendingCommand {
  resolve: (result: CommandResult) => void
  timer: ReturnType<typeof setTimeout>
}

const REJECTIONS: Record<string, StopReason> = {
  pairing_required: "needs_pairing",
  new_devices_off: "new_devices_off",
  denied: "denied",
  disabled: "remotes_disabled",
  too_many_devices: "too_many_devices",
  busy: "busy",
}

/**
 * The one WebSocket to the desktop: pairs, reconnects by itself, keeps the latest state and runs commands.
 * When a connection is lost, pending commands fail at once: nothing pretends to have worked.
 */
export class RemoteSocketService implements RemoteDataProvider {
  private snapshot: RemoteSnapshot
  private readonly listeners = new Set<() => void>()
  private readonly pending = new Map<string, PendingCommand>()
  private socket: WebSocket | null = null
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private lastHeard = 0
  private retries = 0
  private nextRequestId = 1
  private started = false
  private deviceToken: string | null
  private wantsPictures = false
  private readonly options: SocketOptions

  constructor(options: SocketOptions) {
    this.options = options
    this.deviceToken = options.deviceToken
    this.snapshot = {
      connection: "connecting",
      stopReason: null,
      everConnected: false,
      deviceName: null,
      role: null,
      permissions: [],
      locked: false,
      state: {},
      address: options.address,
      demo: false,
    }
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  readonly getSnapshot = (): RemoteSnapshot => this.snapshot

  start(): void {
    this.started = true
    this.open()
  }

  stop(): void {
    this.started = false
    this.clearTimers()
    this.closeSocket()
    this.failPending()
  }

  watchPictures(on: boolean): void {
    this.wantsPictures = on
    this.sendMessage({ type: "watch", pictures: on })
  }

  retry(): void {
    if (!this.started || this.snapshot.connection === "connected" || this.socket?.readyState === WebSocket.CONNECTING) {
      return
    }
    this.clearTimers()
    this.retries = 0
    this.closeSocket()
    this.update({ connection: this.snapshot.everConnected ? "reconnecting" : "connecting", stopReason: null })
    this.open()
  }

  /** After the phone was asleep: checks at once rather than showing stale state until the next ping. */
  checkNow(): void {
    if (!this.started || this.snapshot.stopReason) {
      return
    }
    if (this.snapshot.connection === "connected") {
      this.sendMessage({ type: "ping" })
    } else {
      this.retry()
    }
  }

  send(command: CommandName, payload: Record<string, unknown> = {}): Promise<CommandResult> {
    return this.request(COMMAND_TIMEOUT_MS, (requestId) => ({ type: "command", requestId, command, payload }))
  }

  query(name: QueryName, params: Record<string, unknown> = {}): Promise<CommandResult> {
    return this.request(QUERY_TIMEOUT_MS, (requestId) => ({ type: "query", requestId, query: name, params }))
  }

  private request(timeoutMs: number, message: (requestId: string) => ClientMessage): Promise<CommandResult> {
    if (this.snapshot.connection !== "connected") {
      return Promise.resolve({ ok: false, code: "not_connected" })
    }
    const requestId = String(this.nextRequestId++)
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId)
        resolve({ ok: false, code: "timeout" })
      }, timeoutMs)
      this.pending.set(requestId, { resolve, timer })
      this.sendMessage(message(requestId))
    })
  }

  private open(): void {
    const create = this.options.createSocket ?? ((url: string) => new WebSocket(url))
    let socket: WebSocket
    try {
      socket = create(this.options.url)
    } catch {
      this.scheduleRetry()
      return
    }
    this.socket = socket
    socket.onopen = () => this.onOpen(socket)
    socket.onmessage = (event) => this.onMessage(socket, event.data)
    socket.onclose = () => this.onClose(socket)
    socket.onerror = () => {
      // onclose always follows
    }
  }

  private onOpen(socket: WebSocket): void {
    if (socket !== this.socket) {
      return
    }
    const hello: ClientMessage = { type: "hello", protocol: PROTOCOL_VERSION }
    if (this.deviceToken) {
      hello.deviceToken = this.deviceToken
    }
    if (this.options.pairingToken) {
      hello.pairingToken = this.options.pairingToken
    }
    if (this.options.deviceName) {
      hello.name = this.options.deviceName
    }
    this.sendMessage(hello)
  }

  private onMessage(socket: WebSocket, data: unknown): void {
    if (socket !== this.socket || typeof data !== "string") {
      return
    }
    let message: ServerMessage
    try {
      message = JSON.parse(data) as ServerMessage
    } catch {
      return
    }
    this.lastHeard = Date.now()
    switch (message.type) {
      case "pending":
        this.startPinging()
        this.update({ connection: "waiting_approval", stopReason: null })
        break
      case "welcome":
        this.retries = 0
        if (message.deviceToken) {
          this.deviceToken = message.deviceToken
        }
        this.options.onAccepted?.(message.deviceToken)
        this.startPinging()
        this.update({ connection: "connected", stopReason: null, everConnected: true, ...access(message) })
        if (this.wantsPictures) {
          this.sendMessage({ type: "watch", pictures: true }) // a new connection starts without them
        }
        break
      case "access":
        this.update(access(message))
        break
      case "state":
        this.update({ state: { ...this.snapshot.state, [message.slice]: message.value } })
        break
      case "result":
        this.finish(message.requestId, { ok: message.ok, code: message.code, data: message.data })
        break
      case "rejected":
        if (message.code === "pairing_required") {
          this.dropDeviceToken()
        }
        this.halt(REJECTIONS[message.code] ?? "unsupported")
        break
      case "closed":
        if (message.reason === "forgotten") {
          this.dropDeviceToken()
        }
        this.halt(message.reason === "disabled" ? "remotes_disabled" : message.reason === "forgotten" ? "forgotten" : "disconnected")
        break
      case "pong":
        break
    }
  }

  private dropDeviceToken(): void {
    this.deviceToken = null
    this.options.onDeviceTokenInvalid?.()
  }

  /** The desktop said no: trying again by itself would not help. */
  private halt(reason: StopReason): void {
    this.clearTimers()
    this.closeSocket()
    this.failPending()
    this.update({
      connection: reason === "needs_pairing" ? "pairing_required" : "disconnected",
      stopReason: reason,
      state: {},
      permissions: [],
    })
  }

  private onClose(socket: WebSocket): void {
    if (socket !== this.socket) {
      return
    }
    this.socket = null
    this.stopPinging()
    this.failPending()
    if (this.started) {
      this.scheduleRetry()
    }
  }

  private scheduleRetry(): void {
    if (this.retryTimer !== null) {
      return
    }
    const delay = RETRY_DELAYS_MS[Math.min(this.retries, RETRY_DELAYS_MS.length - 1)]
    this.retries++
    this.update({ connection: "reconnecting" })
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      if (this.started) {
        this.open()
      }
    }, delay)
  }

  private startPinging(): void {
    this.stopPinging()
    this.lastHeard = Date.now()
    this.pingTimer = setInterval(() => {
      if (Date.now() - this.lastHeard > SILENCE_LIMIT_MS) {
        const dead = this.socket
        dead?.close() // a dead socket may take long to report closed
        if (dead && this.socket === dead) {
          this.onClose(dead)
        }
        return
      }
      this.sendMessage({ type: "ping" })
    }, PING_INTERVAL_MS)
  }

  private stopPinging(): void {
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  private clearTimers(): void {
    this.stopPinging()
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
  }

  private closeSocket(): void {
    const socket = this.socket
    this.socket = null
    socket?.close()
  }

  private sendMessage(message: ClientMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message))
    }
  }

  private finish(requestId: string, result: CommandResult): void {
    const command = this.pending.get(requestId)
    if (command) {
      clearTimeout(command.timer)
      this.pending.delete(requestId)
      command.resolve(result)
    }
  }

  private failPending(): void {
    for (const id of [...this.pending.keys()]) {
      this.finish(id, { ok: false, code: "not_connected" })
    }
  }

  private update(change: Partial<RemoteSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...change }
    this.listeners.forEach((listener) => listener())
  }
}

function access(message: AccessFields): Partial<RemoteSnapshot> {
  return { deviceName: message.name, role: message.role, permissions: message.permissions, locked: message.locked }
}
