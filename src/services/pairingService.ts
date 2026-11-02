/**
 * Where to connect and how to prove who we are. The Presenter's QR code opens `/pair?token=…` on its own address.
 * Once allowed, the device keeps its own token, saved per server: it is only ever sent to the server that issued it,
 * so a link naming another server cannot collect it. The IP address is never invented here: it comes from the page's
 * own host, the link, or the operator.
 */

const LAST_SERVER_KEY = "jamc.remote.lastServer"
const CHOSEN_SERVER_KEY = "jamc.remote.chosenServer"
const DEVICE_TOKENS_KEY = "jamc.remote.deviceTokens"
const DEVICE_NAME_KEY = "jamc.remote.deviceName"
const SERVER_PATTERN = /^[\w.-]+(:\d{1,5})?$|^\[[0-9a-fA-F:.]+\](:\d{1,5})?$/

export interface PairingInfo {
  server: string
  /** From the QR code; null when reopening on a device that is already paired. */
  pairingToken: string | null
  deviceToken: string | null
}

export interface PageContext {
  url: string
  /** The page itself is served by the Presenter (the built app), so its host is the Presenter. */
  servedByPresenter: boolean
  /** VITE_REMOTE_WS_URL, for development. */
  devServer?: string
}

/** Storage can be unavailable (private browsing), and the remote must still work for this visit. */
function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, value)
    }
  } catch {
    // only this visit is affected
  }
}

function deviceTokens(): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(read(DEVICE_TOKENS_KEY) ?? "{}")
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {}
  } catch {
    return {}
  }
}

export function isValidServer(server: string): boolean {
  return SERVER_PATTERN.test(server)
}

/** `ws://host:8080/ws` or just a host: the part to connect to. */
function hostOf(url: string | undefined): string | null {
  const host = url?.replace(/^wss?:\/\//, "").replace(/\/.*$/, "")
  return host && isValidServer(host) ? host : null
}

/** The connection details; null when this device has no way to know its server yet. */
export function readPairing({ url, servedByPresenter, devServer }: PageContext): PairingInfo | null {
  const page = new URL(url)
  const linked = page.searchParams.get("server")
  const fromLink = linked !== null && isValidServer(linked) ? linked : null
  const server =
    fromLink ?? read(CHOSEN_SERVER_KEY) ?? hostOf(devServer) ?? (servedByPresenter ? page.host : read(LAST_SERVER_KEY))
  if (!server) {
    return null
  }
  return {
    server,
    pairingToken: page.searchParams.get("token"),
    deviceToken: deviceTokens()[server] ?? null,
  }
}

/** Accepted: remember the server and the device's token (when one was issued). */
export function savePaired(server: string, deviceToken: string | undefined): void {
  write(LAST_SERVER_KEY, server)
  if (deviceToken) {
    write(DEVICE_TOKENS_KEY, JSON.stringify({ ...deviceTokens(), [server]: deviceToken }))
  }
}

/** The server no longer knows this device. */
export function forgetDeviceToken(server: string): void {
  const tokens = deviceTokens()
  delete tokens[server]
  write(DEVICE_TOKENS_KEY, JSON.stringify(tokens))
}

/** CHANGE ADDRESS: the operator typed where the Presenter is. */
export function chooseServer(server: string | null): void {
  write(CHOSEN_SERVER_KEY, server)
}

export function savedDeviceName(): string | undefined {
  return read(DEVICE_NAME_KEY) ?? undefined
}

export function saveDeviceName(name: string): void {
  write(DEVICE_NAME_KEY, name.trim() || null)
}

/** Takes the pairing token out of the address bar and browser history once it has done its job. */
export function clearPairingFromAddressBar(): void {
  const url = new URL(window.location.href)
  if (url.searchParams.has("token") || url.searchParams.has("server")) {
    url.searchParams.delete("token")
    url.searchParams.delete("server")
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash)
  }
}

export function webSocketUrl(server: string, pageProtocol: string): string {
  return `${pageProtocol === "https:" ? "wss" : "ws"}://${server}/ws`
}
