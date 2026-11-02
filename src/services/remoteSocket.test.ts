import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { RemoteSocketService } from "@/services/remoteSocket"

/** A stand-in for the browser's WebSocket that the test drives by hand. */
class FakeSocket {
  static CONNECTING = 0
  static OPEN = 1
  readyState = FakeSocket.CONNECTING
  sent: Record<string, unknown>[] = []
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: (() => void) | null = null

  send(data: string) {
    this.sent.push(JSON.parse(data))
  }
  close() {
    this.readyState = 3
    this.onclose?.()
  }
  open() {
    this.readyState = FakeSocket.OPEN
    this.onopen?.()
  }
  receive(message: unknown) {
    this.onmessage?.({ data: JSON.stringify(message) })
  }
}

const WELCOME = { type: "welcome", deviceId: "d1", protocol: 2, name: "iPhone", role: "Lyrics Only", permissions: ["LYRICS"], locked: false }

describe("RemoteSocketService", () => {
  let sockets: FakeSocket[]
  let accepted: (string | undefined)[]
  let tokenInvalid: number

  function create(deviceToken: string | null = null, pairingToken: string | null = "qr-token") {
    const service = new RemoteSocketService({
      url: "ws://pc:8080/ws",
      address: "pc:8080",
      deviceToken,
      pairingToken,
      createSocket: () => {
        const socket = new FakeSocket()
        sockets.push(socket)
        return socket as unknown as WebSocket
      },
      onAccepted: (token) => accepted.push(token),
      onDeviceTokenInvalid: () => tokenInvalid++,
    })
    service.start()
    return service
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal("WebSocket", FakeSocket)
    sockets = []
    accepted = []
    tokenInvalid = 0
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("pairs with the QR token, waits for approval, then reports Connected", () => {
    const service = create()
    expect(service.getSnapshot().connection).toBe("connecting")
    sockets[0].open()
    expect(sockets[0].sent[0]).toEqual({ type: "hello", protocol: 2, pairingToken: "qr-token" })

    sockets[0].receive({ type: "pending" })
    expect(service.getSnapshot().connection).toBe("waiting_approval")
    expect(accepted).toEqual([])

    sockets[0].receive({ ...WELCOME, deviceToken: "device-secret" })
    const s = service.getSnapshot()
    expect(s.connection).toBe("connected")
    expect(s.permissions).toEqual(["LYRICS"])
    expect(s.role).toBe("Lyrics Only")
    expect(accepted).toEqual(["device-secret"])
  })

  it("reconnects with the device token after losing the connection, and asks nothing of the user", () => {
    const service = create()
    sockets[0].open()
    sockets[0].receive({ ...WELCOME, deviceToken: "device-secret" })

    sockets[0].close()
    expect(service.getSnapshot().connection).toBe("reconnecting")
    expect(service.getSnapshot().everConnected).toBe(true)

    vi.advanceTimersByTime(1000)
    expect(sockets).toHaveLength(2)
    sockets[1].open()
    expect(sockets[1].sent[0]).toMatchObject({ deviceToken: "device-secret" })
    sockets[1].receive(WELCOME)
    expect(service.getSnapshot().connection).toBe("connected")
  })

  it("keeps trying with growing delays while the desktop is off", () => {
    create()
    sockets[0].close()
    vi.advanceTimersByTime(1000)
    expect(sockets).toHaveLength(2)
    sockets[1].close()
    vi.advanceTimersByTime(1000)
    expect(sockets).toHaveLength(2)
    vi.advanceTimersByTime(1000)
    expect(sockets).toHaveLength(3)
  })

  it("stops and forgets its token when the desktop no longer knows the device", () => {
    const service = create("old-token", null)
    sockets[0].open()
    sockets[0].receive({ type: "rejected", code: "pairing_required" })
    expect(service.getSnapshot()).toMatchObject({ connection: "pairing_required", stopReason: "needs_pairing" })
    expect(tokenInvalid).toBe(1)

    vi.advanceTimersByTime(60_000)
    expect(sockets).toHaveLength(1)
  })

  it.each([
    ["denied", "denied"],
    ["disabled", "remotes_disabled"],
    ["new_devices_off", "new_devices_off"],
    ["too_many_devices", "too_many_devices"],
    ["anything else", "unsupported"],
  ])("stops on the rejection %s", (code, reason) => {
    const service = create()
    sockets[0].open()
    sockets[0].receive({ type: "rejected", code })
    expect(service.getSnapshot()).toMatchObject({ connection: "disconnected", stopReason: reason })
  })

  it("does not reconnect by itself after the operator disconnects it, until asked", () => {
    const service = create()
    sockets[0].open()
    sockets[0].receive(WELCOME)
    sockets[0].receive({ type: "closed", reason: "disconnected" })
    expect(service.getSnapshot()).toMatchObject({ connection: "disconnected", stopReason: "disconnected", state: {}, permissions: [] })
    expect(tokenInvalid).toBe(0)

    vi.advanceTimersByTime(60_000)
    expect(sockets).toHaveLength(1)

    service.retry()
    expect(service.getSnapshot()).toMatchObject({ connection: "reconnecting", stopReason: null })
    expect(sockets).toHaveLength(2)
  })

  it("loses its token when forgotten", () => {
    const service = create()
    sockets[0].open()
    sockets[0].receive(WELCOME)
    sockets[0].receive({ type: "closed", reason: "forgotten" })
    expect(service.getSnapshot().stopReason).toBe("forgotten")
    expect(tokenInvalid).toBe(1)
  })

  it("follows permission, lock and state changes from the desktop", () => {
    const service = create()
    sockets[0].open()
    sockets[0].receive(WELCOME)
    sockets[0].receive({ type: "state", slice: "lyrics", value: { title: "Amazing Grace" } })
    expect(service.getSnapshot().state.lyrics).toEqual({ title: "Amazing Grace" })

    sockets[0].receive({ type: "access", name: "iPhone", role: "Custom", permissions: [], locked: true })
    sockets[0].receive({ type: "state", slice: "lyrics", value: null })
    expect(service.getSnapshot()).toMatchObject({ locked: true, permissions: [], role: "Custom" })
    expect(service.getSnapshot().state.lyrics).toBeNull()
  })

  it("matches command results by request id, and changes no state by itself", async () => {
    const service = create()
    sockets[0].open()
    sockets[0].receive(WELCOME)
    const before = service.getSnapshot()

    const result = service.send("LYRICS_SELECT", { card: 2, revision: 7 })
    const sent = sockets[0].sent.at(-1)!
    expect(sent).toMatchObject({ type: "command", command: "LYRICS_SELECT", payload: { card: 2, revision: 7 } })
    expect(service.getSnapshot()).toBe(before)
    sockets[0].receive({ type: "result", requestId: sent.requestId, ok: false, code: "stale" })
    await expect(result).resolves.toEqual({ ok: false, code: "stale" })
  })

  it("asks the desktop for lists and returns what comes back", async () => {
    const service = create()
    sockets[0].open()
    sockets[0].receive(WELCOME)
    const result = service.query("SONGS", { search: "grace" })
    const sent = sockets[0].sent.at(-1)!
    expect(sent).toMatchObject({ type: "query", query: "SONGS", params: { search: "grace" } })
    sockets[0].receive({ type: "result", requestId: sent.requestId, ok: true, code: null, data: [{ id: 1, title: "Amazing Grace" }] })
    await expect(result).resolves.toEqual({ ok: true, code: null, data: [{ id: 1, title: "Amazing Grace" }] })
  })

  it("never pretends a command worked when not connected, cut off or unanswered", async () => {
    const service = create()
    await expect(service.send("TAKE")).resolves.toEqual({ ok: false, code: "not_connected" })
    expect(sockets[0].sent).toEqual([])

    sockets[0].open()
    sockets[0].receive(WELCOME)
    const cut = service.send("TAKE")
    sockets[0].close()
    await expect(cut).resolves.toEqual({ ok: false, code: "not_connected" })

    vi.advanceTimersByTime(1000)
    sockets[1].open()
    sockets[1].receive(WELCOME)
    const unanswered = service.send("TAKE")
    vi.advanceTimersByTime(5000)
    await expect(unanswered).resolves.toEqual({ ok: false, code: "timeout" })
  })

  it("treats long silence as a lost connection", () => {
    const service = create()
    sockets[0].open()
    sockets[0].receive(WELCOME)
    vi.advanceTimersByTime(10_000)
    expect(sockets[0].sent.at(-1)).toEqual({ type: "ping" })

    vi.advanceTimersByTime(20_000)
    expect(service.getSnapshot().connection).toBe("reconnecting")
  })
})
