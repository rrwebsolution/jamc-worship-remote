/** The messages between this app and LiveCat Multimedia (`/ws`). The server side is RemoteServer.java. */

export const PROTOCOL_VERSION = 2

/** What a device may do. Decided per device on the desktop; never here. */
export type Permission =
  | "LYRICS"
  | "BIBLE"
  | "PRESENTATION"
  | "SERVICE"
  | "SCENES"
  | "CAMERAS"
  | "MEDIA"
  | "PREVIEW"
  | "TAKE"
  | "BLACK_PROJECTOR"
  | "STREAM_MONITOR"
  | "RECORDING_MONITOR"

export type ConnectionState =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "pairing_required"
  | "waiting_approval"

/** Why the app stopped trying to connect by itself. */
export type StopReason =
  | "needs_pairing"
  | "new_devices_off"
  | "denied"
  | "remotes_disabled"
  | "too_many_devices"
  | "busy"
  | "disconnected"
  | "forgotten"
  | "unsupported"

export type CommandName =
  | "TAKE"
  | "SET_SCENE_PREVIEW"
  | "SET_CAMERA_PREVIEW"
  | "PRESENTATION_FIRST"
  | "PRESENTATION_PREVIOUS"
  | "PRESENTATION_NEXT"
  | "PRESENTATION_LAST"
  | "PRESENTATION_SELECT"
  | "LYRICS_PREVIOUS"
  | "LYRICS_NEXT"
  | "LYRICS_SELECT"
  | "LYRICS_CLEAR"
  | "BIBLE_CLEAR"
  | "PRESENTATION_CLEAR"
  | "MEDIA_CLEAR"
  | "BIBLE_PREVIOUS"
  | "BIBLE_NEXT"
  | "BIBLE_SELECT"
  | "SET_SERVICE_PREVIEW"
  | "OPEN_SONG"
  | "OPEN_BIBLE"
  | "OPEN_PRESENTATION"
  | "OPEN_MEDIA"
  | "OPEN_SERVICE"
  | "BLACK_PROJECTOR"
  | "RESTORE_PROJECTOR"
  | "MEDIA_PLAY"
  | "MEDIA_PAUSE"
  | "MEDIA_STOP"
  | "MEDIA_SEEK"
  | "MEDIA_MUTE"
  | "MEDIA_SET_VOLUME"
  | "MEDIA_SET_LOOP"

/** Lists from the desktop's library. Each needs the permission of its kind of content. */
export type QueryName =
  | "SONGS"
  | "BIBLE_VERSIONS"
  | "BIBLE_VERSES"
  | "PRESENTATIONS"
  | "PRESENTATION_THUMBNAIL"
  | "MEDIA_ITEMS"
  | "SERVICES"
  | "LYRICS_THUMBNAIL"
  | "BIBLE_THUMBNAIL"
  | "CAMERA_PICTURE"
  | "SERVICE_SONGS"
  | "SERVICE_BIBLE"
  | "SERVICE_PRESENTATIONS"
  | "SERVICE_MEDIA"

/** What is saved in the service open on the desktop, of one kind. */
export interface SavedInService<T> {
  service: string
  items: T[]
}

/** A Bible passage saved in the service, with what opening it as a chapter of cards needs. */
export interface SavedPassage {
  id: number
  title: string
  version: string
  book: number
  chapter: number
  verse: number
  lastVerse: number
}

export interface CommandResult {
  ok: boolean
  /** Why it did not happen, e.g. "no_permission", "locked", "stale", "not_connected". */
  code: string | null
  /** What a query returned. */
  data?: unknown
}

export interface LibraryItem {
  id: number
  title: string
  kind?: string
  slides?: number
}

export interface BibleCatalog {
  versions: { code: string; name: string }[]
  books: { number: number; name: string; chapters: number }[]
}

export interface BibleVerse {
  verse: number
  text: string
}

export interface MonitorState {
  kind: "EMPTY" | "SCENE" | "CONTENT" | "VIDEO"
  title: string | null
  label: string | null
  scene: string | null
  cameras: string[]
  black: boolean
}

export interface Monitors {
  preview: MonitorState
  program: MonitorState
  canTake: boolean
}

export interface Pictures {
  preview: string | null
  program: string | null
}

export interface Card {
  label: string | null
  text: string | null
}

/** A song or a Bible passage open on the desktop. */
export interface CardsState {
  /** Changes with the content; a command for an older one is refused. */
  revision: number
  title: string
  translation: string | null
  /** Where a Bible passage is, so choosing another verse starts there. */
  book?: number
  chapter?: number
  cards: Card[]
  previewIndex: number
  liveIndex: number
  /** The desktop sends this live on a click: Preview and Program change together. */
  clickGoesLive: boolean
}

export interface PresentationState {
  id: number
  title: string
  /** The selected slide, in the order of `slides`. */
  index: number
  total: number
  /** In the desktop's order; `number` asks for its picture. */
  slides: { number: number; label: string }[]
  previewIndex: number
  liveIndex: number
  mode: "LIVE_CONTROL" | "PREVIEW_FIRST"
}

export interface ServiceItem {
  title: string
  type: string
  status: "DONE" | "CURRENT" | "UPCOMING"
}

export interface ServiceState {
  name: string
  items: ServiceItem[]
}

export interface SceneInfo {
  id: number
  name: string
  summary: string[]
  preview: boolean
  live: boolean
}

export interface CameraInfo {
  id: string
  name: string
  status: "READY" | "PREVIEW" | "LIVE" | "OFFLINE"
}

export interface MediaState {
  title: string
  kind: "VIDEO" | "AUDIO"
  playing: boolean
  seconds: number
  lengthSeconds: number
  muted: boolean
  volume: number
  loop: boolean
}

export interface ProjectorState {
  black: boolean
  open: boolean
}

export interface SessionState {
  state: "IDLE" | "STARTING" | "ACTIVE" | "ERROR"
  seconds: number
  kbps: number | null
  fps: number | null
  file: string | null
}

/**
 * The desktop as last heard. The desktop is the source of truth: nothing here changes until it says so.
 * A slice is undefined until it arrives, and null when there is nothing to show or this device may not see it.
 */
export interface RemoteState {
  monitors?: Monitors | null
  pictures?: Pictures | null
  lyrics?: CardsState | null
  bible?: CardsState | null
  presentation?: PresentationState | null
  service?: ServiceState | null
  scenes?: SceneInfo[] | null
  cameras?: CameraInfo[] | null
  media?: MediaState | null
  projector?: ProjectorState | null
  stream?: SessionState | null
  recording?: SessionState | null
}

export type SliceName = keyof RemoteState

/** Everything the screens show. Replaced as a whole on every change. */
export interface RemoteSnapshot {
  connection: ConnectionState
  stopReason: StopReason | null
  /** Has connected before: a lost connection shows over the last state rather than replacing the page. */
  everConnected: boolean
  deviceName: string | null
  role: string | null
  permissions: Permission[]
  locked: boolean
  state: RemoteState
  address: string | null
  demo: boolean
}

export type ClientMessage =
  | { type: "hello"; protocol: number; deviceToken?: string; pairingToken?: string; name?: string }
  | { type: "ping" }
  | { type: "watch"; pictures: boolean }
  | { type: "command"; requestId: string; command: CommandName; payload: Record<string, unknown> }
  | { type: "query"; requestId: string; query: QueryName; params: Record<string, unknown> }

export interface AccessFields {
  name: string
  role: string
  permissions: Permission[]
  locked: boolean
}

export type ServerMessage =
  | ({ type: "welcome"; deviceId: string; deviceToken?: string; protocol: number } & AccessFields)
  | ({ type: "access" } & AccessFields)
  | { type: "pending" }
  | { type: "rejected"; code: string }
  | { type: "closed"; reason: string }
  | { type: "pong" }
  | { type: "result"; requestId: string; ok: boolean; code: string | null; data?: unknown }
  | { type: "state"; slice: SliceName; value: unknown }
