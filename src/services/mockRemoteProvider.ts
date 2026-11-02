import { commandPermissions } from "@/services/commandService"
import type { RemoteDataProvider } from "@/services/remoteProvider"
import type { CardsState, CommandName, CommandResult, MonitorState, Permission, QueryName, RemoteSnapshot, RemoteState } from "@/types/remote"

const DELAY_MS = 150
const CAM2 = "CAM 2 · Preacher"

/** The role names and what they allow, for trying the dynamic screens in Demo Mode. */
export const DEMO_ROLES: Record<string, Permission[]> = {
  "Media Team": ["LYRICS", "BIBLE", "PRESENTATION", "SERVICE", "SCENES", "CAMERAS", "MEDIA", "PREVIEW", "TAKE", "BLACK_PROJECTOR", "STREAM_MONITOR", "RECORDING_MONITOR"],
  "Lyrics Only": ["LYRICS"],
  Pastor: ["PRESENTATION"],
  "Worship Leader": ["LYRICS", "BIBLE", "SERVICE", "PREVIEW"],
  "Camera Operator": ["SCENES", "CAMERAS", "PREVIEW", "TAKE"],
}

const DEMO_LIBRARY = {
  SONGS: [
    { id: 1, title: "Amazing Grace" },
    { id: 2, title: "Great Is Thy Faithfulness" },
    { id: 3, title: "How Great Thou Art" },
  ],
  PRESENTATIONS: [
    { id: 1, title: "Sunday Sermon", slides: 35 },
    { id: 2, title: "Announcements", slides: 6 },
  ],
  MEDIA_ITEMS: [
    { id: 1, title: "Offering Song.mp4", kind: "VIDEO" },
    { id: 2, title: "Countdown.mp4", kind: "VIDEO" },
    { id: 3, title: "Welcome.png", kind: "IMAGE" },
  ],
  SERVICES: [
    { id: 1, title: "Sunday Service" },
    { id: 2, title: "Prayer Meeting" },
  ],
}
const DEMO_BIBLE = {
  versions: [{ code: "KJV", name: "King James Version" }, { code: "NLT", name: "New Living Translation" }],
  books: [{ number: 19, name: "Psalms", chapters: 150 }, { number: 43, name: "John", chapters: 21 }],
}
const DEMO_VERSES = [
  { verse: 16, text: "For God so loved the world, that he gave his only begotten Son" },
  { verse: 17, text: "For God sent not his Son into the world to condemn the world" },
]

const DEMO_SAVED = {
  SERVICE_SONGS: [{ id: 2, title: "Great Is Thy Faithfulness", kind: "SONG" }],
  SERVICE_BIBLE: [{ id: 0, title: "John 3:16 (KJV)", version: "KJV", book: 43, chapter: 3, verse: 16, lastVerse: 36 }],
  SERVICE_PRESENTATIONS: [{ id: 1, title: "Sunday Sermon", kind: "PRESENTATION" }],
  SERVICE_MEDIA: [{ id: 2, title: "Countdown.mp4", kind: "VIDEO" }],
}

function demoSlidePicture(number: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><rect width="320" height="180" fill="#172033"/><text x="160" y="100" fill="#F8FAFC" font-family="sans-serif" font-size="28" text-anchor="middle">Slide ${number}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function monitor(partial: Partial<MonitorState>): MonitorState {
  return { kind: "EMPTY", title: null, label: null, scene: null, cameras: [], black: false, ...partial }
}

function initialState(): RemoteState {
  const lyrics: CardsState = {
    revision: 1,
    title: "Great Is Thy Faithfulness",
    translation: null,
    previewIndex: 2,
    liveIndex: 1,
    clickGoesLive: true,
    cards: [
      { label: "Verse 1", text: "Great is Thy faithfulness, O God my Father\nThere is no shadow of turning with Thee" },
      { label: "Chorus", text: "Great is Thy faithfulness\nMorning by morning new mercies I see" },
      { label: "Verse 2", text: "Summer and winter and springtime and harvest\nSun, moon and stars in their courses above" },
      { label: "Chorus", text: "Great is Thy faithfulness\nMorning by morning new mercies I see" },
    ],
  }
  return {
    monitors: {
      preview: monitor({ kind: "SCENE", scene: "Preacher", cameras: [CAM2] }),
      program: monitor({ kind: "CONTENT", title: lyrics.title, label: "Chorus", scene: "Camera + Lyrics", cameras: ["CAM 1 · Main"] }),
      canTake: true,
    },
    pictures: null,
    lyrics,
    bible: {
      revision: 1,
      title: "John 3:16",
      translation: "NLT",
      previewIndex: 0,
      liveIndex: -1,
      clickGoesLive: true,
      cards: [{ label: "John 3:16", text: "For this is how God loved the world: He gave his one and only Son" }],
    },
    presentation: {
      id: 1,
      title: "Sunday Sermon",
      index: 11,
      total: 35,
      previewIndex: 11,
      liveIndex: 10,
      mode: "PREVIEW_FIRST",
      slides: Array.from({ length: 35 }, (_, i) => ({ number: i + 1, label: `Slide ${i + 1}` })),
    },
    service: {
      name: "Sunday Service",
      items: [
        { title: "Opening Prayer", type: "BLANK", status: "DONE" },
        { title: "Worship", type: "SONG", status: "DONE" },
        { title: "Bible Reading", type: "BIBLE", status: "CURRENT" },
        { title: "Sermon", type: "PRESENTATION", status: "UPCOMING" },
        { title: "Announcements", type: "ANNOUNCEMENT", status: "UPCOMING" },
        { title: "Closing Prayer", type: "BLANK", status: "UPCOMING" },
      ],
    },
    scenes: [
      { id: 1, name: "Worship", summary: ["CAMERA", "LYRICS"], preview: false, live: false },
      { id: 2, name: "Preacher", summary: ["CAMERA"], preview: true, live: false },
      { id: 3, name: "Camera + Lyrics", summary: ["CAMERA", "LYRICS"], preview: false, live: true },
      { id: 4, name: "Announcement", summary: ["IMAGE", "TEXT"], preview: false, live: false },
    ],
    cameras: [
      { id: "cam1", name: "CAM 1 · Main", status: "LIVE" },
      { id: "cam2", name: CAM2, status: "PREVIEW" },
      { id: "cam3", name: "CAM 3 · Worship", status: "READY" },
      { id: "cam4", name: "CAM 4 · Audience", status: "OFFLINE" },
    ],
    media: { title: "Offering Song.mp4", kind: "VIDEO", playing: true, seconds: 42, lengthSeconds: 240, muted: false, volume: 75, loop: false },
    projector: { black: false, open: true },
    stream: { state: "ACTIVE", seconds: 2536, kbps: 5500, fps: 30, file: null },
    recording: { state: "IDLE", seconds: 0, kbps: null, fps: null, file: null },
  }
}

/** Demo Mode: behaves like the desktop, with made-up content and no connection. It enforces permissions the same way. */
export class MockRemoteProvider implements RemoteDataProvider {
  private snapshot: RemoteSnapshot = {
    connection: "connected",
    stopReason: null,
    everConnected: true,
    deviceName: "Demo Device",
    role: "Media Team",
    permissions: DEMO_ROLES["Media Team"],
    locked: false,
    state: initialState(),
    address: null,
    demo: true,
  }
  private readonly listeners = new Set<() => void>()
  private readonly delayMs: number

  constructor(delayMs = DELAY_MS) {
    this.delayMs = delayMs
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  readonly getSnapshot = (): RemoteSnapshot => this.snapshot

  start(): void {}
  stop(): void {}
  retry(): void {}
  watchPictures(): void {}

  setRole(role: string): void {
    this.update({ role, permissions: DEMO_ROLES[role] ?? [] })
  }

  send(command: CommandName, payload: Record<string, unknown> = {}): Promise<CommandResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const allowed = commandPermissions(command).every((p) => this.snapshot.permissions.includes(p))
        const code = allowed ? this.run(command, payload) : "no_permission"
        resolve({ ok: code === null, code })
      }, this.delayMs)
    })
  }

  query(name: QueryName, params: Record<string, unknown> = {}): Promise<CommandResult> {
    const needed: Record<QueryName, Permission> = {
      SONGS: "LYRICS",
      BIBLE_VERSIONS: "BIBLE",
      BIBLE_VERSES: "BIBLE",
      PRESENTATIONS: "PRESENTATION",
      PRESENTATION_THUMBNAIL: "PRESENTATION",
      LYRICS_THUMBNAIL: "LYRICS",
      BIBLE_THUMBNAIL: "BIBLE",
      SERVICE_SONGS: "LYRICS",
      SERVICE_BIBLE: "BIBLE",
      SERVICE_PRESENTATIONS: "PRESENTATION",
      SERVICE_MEDIA: "MEDIA",
      MEDIA_ITEMS: "MEDIA",
      SERVICES: "SERVICE",
    }
    return new Promise((resolve) => {
      setTimeout(() => {
        if (!this.snapshot.permissions.includes(needed[name])) {
          resolve({ ok: false, code: "no_permission" })
          return
        }
        const search = String(params.search ?? "").toLowerCase()
        const data: unknown = name === "PRESENTATION_THUMBNAIL" ? { src: demoSlidePicture(Number(params.number)) } : name === "LYRICS_THUMBNAIL" || name === "BIBLE_THUMBNAIL" ? { src: demoSlidePicture(Number(params.card) + 1) } : name === "BIBLE_VERSIONS" ? DEMO_BIBLE : name === "BIBLE_VERSES" ? DEMO_VERSES
          : name in DEMO_SAVED ? { service: "Sunday Service", items: DEMO_SAVED[name as keyof typeof DEMO_SAVED] }
          : DEMO_LIBRARY[name as keyof typeof DEMO_LIBRARY].filter((item) => item.title.toLowerCase().includes(search))
        resolve({ ok: true, code: null, data })
      }, this.delayMs)
    })
  }

  private run(command: CommandName, payload: Record<string, unknown>): string | null {
    const s = this.snapshot.state
    const monitors = s.monitors!
    const setPreview = (preview: Partial<MonitorState>, change: RemoteState = {}) =>
      this.state({ ...change, monitors: { ...monitors, preview: monitor(preview), canTake: true } })
    switch (command) {
      case "OPEN_SONG": {
        const title = String(payload.title)
        const lyrics = { ...s.lyrics!, title, revision: s.lyrics!.revision + 1, previewIndex: 0, liveIndex: -1 }
        setPreview({ kind: "CONTENT", title, label: lyrics.cards[0].label }, { lyrics })
        return null
      }
      case "OPEN_BIBLE": {
        // the whole chapter as cards, with the tapped verse on Preview and Program together
        const book = String(payload.bookName ?? "John")
        const chapter = String(payload.chapter)
        const cards = DEMO_VERSES.map((v) => ({ label: `${book} ${chapter}:${v.verse}`, text: v.text }))
        const index = Math.max(0, DEMO_VERSES.findIndex((v) => v.verse === payload.verse))
        const title = `${book} ${chapter}`
        const shown = monitor({ kind: "CONTENT", title, label: cards[index].label })
        this.state({
          monitors: { preview: shown, program: shown, canTake: true },
          bible: { ...s.bible!, title, translation: String(payload.version), cards, revision: s.bible!.revision + 1, previewIndex: index, liveIndex: index },
        })
        return null
      }
      case "OPEN_PRESENTATION": {
        const presentation = { ...s.presentation!, title: String(payload.title), index: 0 }
        setPreview({ kind: "CONTENT", title: presentation.title, label: "Slide 1" }, { presentation })
        return null
      }
      case "OPEN_MEDIA":
        setPreview({ kind: "VIDEO", title: String(payload.title) })
        return null
      case "OPEN_SERVICE":
        this.state({ service: { ...s.service!, name: String(payload.title) } })
        return null
      case "TAKE":
        if (!monitors.canTake) {
          return "nothing_in_preview"
        }
        this.state({
          monitors: { ...monitors, program: monitors.preview },
          scenes: s.scenes?.map((x) => ({ ...x, live: x.name === monitors.preview.scene || (x.live && !monitors.preview.scene) })),
          cameras: s.cameras?.map((c) =>
            c.status === "OFFLINE" ? c : { ...c, status: monitors.preview.cameras.includes(c.name) ? "LIVE" : c.status === "LIVE" ? "READY" : c.status },
          ),
          lyrics: s.lyrics && { ...s.lyrics, liveIndex: monitors.preview.title === s.lyrics.title ? s.lyrics.previewIndex : -1 },
        })
        return null
      case "SET_SCENE_PREVIEW": {
        const scene = s.scenes?.find((x) => x.id === payload.id)
        if (!scene) {
          return "scene_unavailable"
        }
        setPreview({ kind: "SCENE", scene: scene.name }, { scenes: s.scenes?.map((x) => ({ ...x, preview: x.id === scene.id })) })
        return null
      }
      case "SET_CAMERA_PREVIEW": {
        const camera = s.cameras?.find((c) => c.id === payload.id)
        if (!camera || camera.status === "OFFLINE") {
          return "camera_unavailable"
        }
        setPreview({ kind: "SCENE", scene: "Camera", cameras: [camera.name] }, {
          cameras: s.cameras?.map((c) =>
            c.status === "OFFLINE" || c.status === "LIVE" ? c : { ...c, status: c.id === camera.id ? "PREVIEW" : "READY" },
          ),
        })
        return null
      }
      case "LYRICS_PREVIOUS":
      case "LYRICS_NEXT":
      case "LYRICS_SELECT": {
        const lyrics = s.lyrics!
        const index =
          command === "LYRICS_SELECT"
            ? Number(payload.card)
            : Math.min(Math.max(0, lyrics.previewIndex + (command === "LYRICS_NEXT" ? 1 : -1)), lyrics.cards.length - 1)
        if (command === "LYRICS_SELECT" && payload.revision !== lyrics.revision) {
          return "stale"
        }
        // as on the desktop with "click = live": Preview and Program together
        const shown = monitor({ kind: "CONTENT", title: lyrics.title, label: lyrics.cards[index].label })
        this.state({
          monitors: { preview: shown, program: shown, canTake: true },
          lyrics: { ...lyrics, previewIndex: index, liveIndex: index },
        })
        return null
      }
      case "BIBLE_PREVIOUS":
      case "BIBLE_NEXT":
      case "BIBLE_SELECT": {
        const bible = s.bible!
        const index =
          command === "BIBLE_SELECT"
            ? Number(payload.card)
            : Math.min(Math.max(0, bible.previewIndex + (command === "BIBLE_NEXT" ? 1 : -1)), bible.cards.length - 1)
        const shown = monitor({ kind: "CONTENT", title: bible.title, label: bible.cards[index].label })
        this.state({
          monitors: { preview: shown, program: shown, canTake: true },
          bible: { ...bible, previewIndex: index, liveIndex: index },
        })
        return null
      }
      case "LYRICS_CLEAR":
      case "BIBLE_CLEAR":
      case "PRESENTATION_CLEAR":
      case "MEDIA_CLEAR": {
        const clearLive = monitors.program.kind === "CONTENT" || (command === "MEDIA_CLEAR" && monitors.program.kind === "VIDEO")
        const previewHas = monitors.preview.kind === "CONTENT" || monitors.preview.kind === "VIDEO"
        if (!clearLive && !previewHas) {
          return "nothing_to_clear"
        }
        this.state({
          monitors: {
            preview: monitor({ kind: "EMPTY", scene: monitors.preview.scene }),
            program: clearLive ? monitor({ kind: "EMPTY", scene: monitors.program.scene }) : monitors.program,
            canTake: false,
          },
          lyrics: s.lyrics && { ...s.lyrics, previewIndex: -1, liveIndex: -1 },
          bible: s.bible && { ...s.bible, previewIndex: -1, liveIndex: -1 },
          presentation: s.presentation && { ...s.presentation, index: -1, previewIndex: -1, liveIndex: -1 },
        })
        return null
      }
      case "SET_SERVICE_PREVIEW": {
        const index = Number(payload.index)
        const items = s.service!.items.map((item, i) => ({
          ...item,
          status: i === index ? ("CURRENT" as const) : i < index ? ("DONE" as const) : ("UPCOMING" as const),
        }))
        setPreview({ kind: "CONTENT", title: items[index].title }, { service: { ...s.service!, items } })
        return null
      }
      case "PRESENTATION_FIRST":
      case "PRESENTATION_PREVIOUS":
      case "PRESENTATION_NEXT":
      case "PRESENTATION_LAST":
      case "PRESENTATION_SELECT": {
        const p = s.presentation!
        const index = { PRESENTATION_FIRST: 0, PRESENTATION_PREVIOUS: p.index - 1, PRESENTATION_NEXT: p.index + 1, PRESENTATION_LAST: p.total - 1, PRESENTATION_SELECT: Number(payload.index) }[command]
        const clamped = Math.min(Math.max(0, index), p.total - 1)
        setPreview({ kind: "CONTENT", title: p.title, label: `Slide ${clamped + 1}` }, { presentation: { ...p, index: clamped, previewIndex: clamped } })
        return null
      }
      case "BLACK_PROJECTOR":
      case "RESTORE_PROJECTOR":
        this.state({ projector: { ...s.projector!, black: command === "BLACK_PROJECTOR" } })
        return null
      case "MEDIA_PLAY":
      case "MEDIA_PAUSE":
      case "MEDIA_STOP":
      case "MEDIA_SEEK":
      case "MEDIA_MUTE":
      case "MEDIA_SET_VOLUME":
      case "MEDIA_SET_LOOP": {
        const m = s.media!
        this.state({
          media: {
            ...m,
            playing: command === "MEDIA_PLAY" ? true : command === "MEDIA_PAUSE" || command === "MEDIA_STOP" ? false : m.playing,
            seconds: command === "MEDIA_STOP" ? 0 : command === "MEDIA_SEEK" ? Math.round(Number(payload.position) * m.lengthSeconds) : m.seconds,
            muted: command === "MEDIA_MUTE" ? !m.muted : m.muted,
            volume: command === "MEDIA_SET_VOLUME" ? Number(payload.volume) : m.volume,
            loop: command === "MEDIA_SET_LOOP" ? !m.loop : m.loop,
          },
        })
        return null
      }
    }
  }

  private state(change: RemoteState): void {
    this.update({ state: { ...this.snapshot.state, ...change } })
  }

  private update(change: Partial<RemoteSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...change }
    this.listeners.forEach((listener) => listener())
  }
}
