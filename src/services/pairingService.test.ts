import { beforeEach, describe, expect, it, vi } from "vitest"
import { chooseServer, forgetDeviceToken, readPairing, savePaired, webSocketUrl } from "@/services/pairingService"

const page = (url: string, servedByPresenter = true, devServer?: string) => ({ url, servedByPresenter, devServer })
const QR = page("http://192.168.1.15:8080/pair?token=abc")

describe("pairing", () => {
  beforeEach(() => {
    const items = new Map<string, string>()
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => items.set(key, value),
      removeItem: (key: string) => items.delete(key),
    })
  })

  it("takes the server from the page's own host when the Presenter serves the app", () => {
    expect(readPairing(QR)).toEqual({ server: "192.168.1.15:8080", pairingToken: "abc", deviceToken: null })
  })

  it("never invents an address: without one and no saved server it asks for the QR code", () => {
    expect(readPairing(page("http://192.168.1.15:5173/", false))).toBeNull()
  })

  it("uses the link's server in development, or the configured one", () => {
    expect(readPairing(page("http://pc:5173/pair?server=192.168.1.15:8080&token=abc", false))?.server).toBe("192.168.1.15:8080")
    expect(readPairing(page("http://pc:5173/", false, "ws://10.0.0.2:8080/ws"))?.server).toBe("10.0.0.2:8080")
  })

  it("a chosen address wins over the page's host", () => {
    chooseServer("10.0.0.9:8080")
    expect(readPairing(page("http://192.168.1.15:8080/"))?.server).toBe("10.0.0.9:8080")
  })

  it("comes back to the paired server without the QR code", () => {
    savePaired("192.168.1.15:8080", "device-secret")
    expect(readPairing(page("http://192.168.1.15:8080/"))).toEqual({
      server: "192.168.1.15:8080",
      pairingToken: null,
      deviceToken: "device-secret",
    })
    expect(readPairing(page("http://localhost:5173/", false))?.deviceToken).toBe("device-secret")
  })

  it("keeps the device token when accepted again without a new one", () => {
    savePaired("192.168.1.15:8080", "device-secret")
    savePaired("192.168.1.15:8080", undefined)
    expect(readPairing(QR)?.deviceToken).toBe("device-secret")
  })

  it("never offers a device token to a server that did not issue it", () => {
    savePaired("192.168.1.15:8080", "device-secret")
    expect(readPairing(page("http://x:5173/?server=10.0.0.9:8080&token=abc"))).toEqual({
      server: "10.0.0.9:8080",
      pairingToken: "abc",
      deviceToken: null,
    })
  })

  it("ignores a server value that is not an address", () => {
    expect(readPairing(page("http://x:5173/?server=evil/../path&token=abc", false))).toBeNull()
    expect(readPairing(page("http://x:5173/?server=ws://evil&token=abc", false))).toBeNull()
  })

  it("drops a token the server no longer knows", () => {
    savePaired("192.168.1.15:8080", "device-secret")
    forgetDeviceToken("192.168.1.15:8080")
    expect(readPairing(QR)?.deviceToken).toBeNull()
  })

  it("works when storage is blocked", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked")
      },
      setItem: () => {
        throw new Error("blocked")
      },
    })
    expect(readPairing(QR)?.pairingToken).toBe("abc")
    expect(() => savePaired("a:1", "t")).not.toThrow()
  })

  it("builds the WebSocket address from the host", () => {
    expect(webSocketUrl("192.168.1.15:8080", "http:")).toBe("ws://192.168.1.15:8080/ws")
    expect(webSocketUrl("pc:8080", "https:")).toBe("wss://pc:8080/ws")
  })
})
