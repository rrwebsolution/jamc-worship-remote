import { describe, expect, it } from "vitest"
import { allowed, firstPermittedPath, MORE_PAGE, PRIMARY, ruleFor, SECONDARY } from "@/lib/navigation"
import { DEMO_ROLES, MockRemoteProvider } from "@/services/mockRemoteProvider"
import { mayRun } from "@/services/commandService"

describe("Demo Mode", () => {
  it("TAKE moves Preview to Program only when it runs", async () => {
    const demo = new MockRemoteProvider(0)
    const before = demo.getSnapshot().state.monitors!
    expect(before.program.scene).not.toBe(before.preview.scene)
    const sending = demo.send("TAKE")
    expect(demo.getSnapshot().state.monitors!.program).toBe(before.program)
    await expect(sending).resolves.toEqual({ ok: true, code: null })
    expect(demo.getSnapshot().state.monitors!.program).toEqual(before.preview)
  })

  it("sending a camera to Preview leaves Program alone", async () => {
    const demo = new MockRemoteProvider(0)
    const program = demo.getSnapshot().state.monitors!.program
    await demo.send("SET_CAMERA_PREVIEW", { id: "cam3" })
    const s = demo.getSnapshot().state
    expect(s.monitors!.program).toBe(program)
    expect(s.monitors!.preview.cameras).toEqual(["CAM 3 · Worship"])
    expect(s.cameras!.find((c) => c.id === "cam3")!.status).toBe("PREVIEW")
  })

  it("refuses an offline camera, and what the role may not do, like the desktop", async () => {
    const demo = new MockRemoteProvider(0)
    await expect(demo.send("SET_CAMERA_PREVIEW", { id: "cam4" })).resolves.toEqual({ ok: false, code: "camera_unavailable" })
    demo.setRole("Lyrics Only")
    await expect(demo.send("TAKE")).resolves.toEqual({ ok: false, code: "no_permission" })
    await expect(demo.send("LYRICS_NEXT")).resolves.toEqual({ ok: true, code: null })
  })

  it("lyrics Next moves Preview and Program together, as on the desktop", async () => {
    const demo = new MockRemoteProvider(0)
    demo.setRole("Lyrics Only")
    const at = demo.getSnapshot().state.lyrics!.previewIndex
    await demo.send("LYRICS_NEXT")
    const s = demo.getSnapshot().state
    expect(s.lyrics!.previewIndex).toBe(at + 1)
    expect(s.lyrics!.liveIndex).toBe(at + 1)
    expect(s.monitors!.preview.label).toBe(s.lyrics!.cards[at + 1].label)
    expect(s.monitors!.program).toEqual(s.monitors!.preview)
  })

  it("media shows what happened only after it happened", async () => {
    const demo = new MockRemoteProvider(0)
    expect(demo.getSnapshot().state.media!.muted).toBe(false)
    const muting = demo.send("MEDIA_MUTE")
    expect(demo.getSnapshot().state.media!.muted).toBe(false)
    await muting
    expect(demo.getSnapshot().state.media!.muted).toBe(true)
  })
})

describe("choosing from the library", () => {
  it("lists and searches only what the role may use", async () => {
    const demo = new MockRemoteProvider(0)
    demo.setRole("Lyrics Only")
    const songs = await demo.query("SONGS", { search: "grace" })
    expect(songs.data).toEqual([{ id: 1, title: "Amazing Grace" }])
    await expect(demo.query("PRESENTATIONS")).resolves.toEqual({ ok: false, code: "no_permission" })
    await expect(demo.send("OPEN_PRESENTATION", { id: 1, title: "x" })).resolves.toEqual({ ok: false, code: "no_permission" })
  })

  it("opening a song shows its first card in Preview and leaves Program alone", async () => {
    const demo = new MockRemoteProvider(0)
    const program = demo.getSnapshot().state.monitors!.program
    await demo.send("OPEN_SONG", { id: 1, title: "Amazing Grace" })
    const s = demo.getSnapshot().state
    expect(s.lyrics!.title).toBe("Amazing Grace")
    expect(s.lyrics!.previewIndex).toBe(0)
    expect(s.monitors!.preview.title).toBe("Amazing Grace")
    expect(s.monitors!.program).toBe(program)
  })
})

describe("camera pictures", () => {
  it("come only to a device with Cameras", async () => {
    const demo = new MockRemoteProvider(0)
    demo.setRole("Camera Operator")
    const picture = await demo.query("CAMERA_PICTURE", { id: "cam1" })
    expect((picture.data as { src: string }).src).toContain("data:image/")
    demo.setRole("Lyrics Only")
    await expect(demo.query("CAMERA_PICTURE", { id: "cam1" })).resolves.toEqual({ ok: false, code: "no_permission" })
  })
})

describe("Clear", () => {
  it("empties Preview and Program, and has nothing to do twice", async () => {
    const demo = new MockRemoteProvider(0)
    demo.setRole("Lyrics Only")
    await demo.send("LYRICS_NEXT")
    await expect(demo.send("LYRICS_CLEAR")).resolves.toEqual({ ok: true, code: null })
    const s = demo.getSnapshot().state
    expect(s.monitors!.program.kind).toBe("EMPTY")
    expect(s.monitors!.preview.kind).toBe("EMPTY")
    expect(s.lyrics!.previewIndex).toBe(-1)
    expect(s.lyrics!.liveIndex).toBe(-1)
    await expect(demo.send("LYRICS_CLEAR")).resolves.toEqual({ ok: false, code: "nothing_to_clear" })
  })

  it("needs the permission of what it clears", async () => {
    const demo = new MockRemoteProvider(0)
    demo.setRole("Lyrics Only")
    await expect(demo.send("BIBLE_CLEAR")).resolves.toEqual({ ok: false, code: "no_permission" })
  })
})

describe("saved in the service", () => {
  it("each role sees only the kind it may use", async () => {
    const demo = new MockRemoteProvider(0)
    demo.setRole("Lyrics Only")
    const songs = await demo.query("SERVICE_SONGS")
    expect(songs.data).toMatchObject({ service: "Sunday Service", items: [{ title: "Great Is Thy Faithfulness" }] })
    await expect(demo.query("SERVICE_BIBLE")).resolves.toEqual({ ok: false, code: "no_permission" })
    await expect(demo.query("SERVICE_PRESENTATIONS")).resolves.toEqual({ ok: false, code: "no_permission" })
    await expect(demo.query("SERVICE_MEDIA")).resolves.toEqual({ ok: false, code: "no_permission" })
  })
})

describe("presentation slides", () => {
  it("lists every slide and hands out its picture", async () => {
    const demo = new MockRemoteProvider(0)
    const p = demo.getSnapshot().state.presentation!
    expect(p.slides).toHaveLength(p.total)
    const picture = await demo.query("PRESENTATION_THUMBNAIL", { id: p.id, number: 3 })
    expect((picture.data as { src: string }).src).toContain("data:image")
  })

  it("a tap goes to that slide, and only for a device allowed presentations", async () => {
    const demo = new MockRemoteProvider(0)
    await demo.send("PRESENTATION_SELECT", { index: 4 })
    expect(demo.getSnapshot().state.presentation).toMatchObject({ index: 4, previewIndex: 4 })
    demo.setRole("Lyrics Only")
    await expect(demo.send("PRESENTATION_SELECT", { index: 1 })).resolves.toEqual({ ok: false, code: "no_permission" })
    await expect(demo.query("PRESENTATION_THUMBNAIL", { id: 1, number: 1 })).resolves.toEqual({ ok: false, code: "no_permission" })
  })
})

describe("what a device sees", () => {
  const visible = (role: string) => [...PRIMARY, ...SECONDARY].filter((i) => i.anyOf.length > 0 && allowed(i, DEMO_ROLES[role])).map((i) => i.title)

  it("Lyrics Only shows only Lyrics", () => {
    expect(visible("Lyrics Only")).toEqual(["Lyrics"])
    expect(firstPermittedPath(DEMO_ROLES["Lyrics Only"])).toBe("/lyrics")
  })

  it("a pastor lands on the presentation", () => {
    expect(visible("Pastor")).toEqual(["Presentation", "Pastor Remote"])
    expect(firstPermittedPath(DEMO_ROLES.Pastor)).toBe("/presentation")
  })

  it("no permission still leaves connection and device information", () => {
    expect(firstPermittedPath([])).toBe("/device")
    expect(allowed(MORE_PAGE, [])).toBe(true)
    expect(allowed(ruleFor("/cameras")!, [])).toBe(false)
  })

  it("Cameras alone cannot prepare or take; Preview and TAKE are separate", () => {
    expect(mayRun("SET_CAMERA_PREVIEW", ["CAMERAS"])).toBe(false)
    expect(mayRun("SET_CAMERA_PREVIEW", ["CAMERAS", "PREVIEW"])).toBe(true)
    expect(mayRun("TAKE", ["CAMERAS", "PREVIEW"])).toBe(false)
    expect(mayRun("LYRICS_SELECT", ["LYRICS"])).toBe(true)
  })
})
