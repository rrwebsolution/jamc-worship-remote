import { useEffect, useRef, useState } from "react"
import { ChevronsLeft, ChevronsRight, Library, MonitorOff, MonitorUp } from "lucide-react"
import { ScreenView } from "@/components/common/ScreenView"
import { TakeButton } from "@/components/common/TakeButton"
import { ConfirmDialog, Page, Skeleton } from "@/components/common/ui"
import { useClear } from "@/components/common/useClear"
import { BiblePicker, SongPicker } from "@/components/library/LibraryPickers"
import { useCursor } from "@/hooks/useCursor"
import { usePictureQueue } from "@/hooks/usePictureQueue"
import { useCommand, usePermissions, useRemote, useRemoteSnapshot } from "@/hooks/useRemoteState"
import { haptic } from "@/lib/haptics"
import { cn } from "@/lib/utils"
import type { Card, CardsState, CommandName, Permission, QueryName } from "@/types/remote"

interface Commands {
  previous: CommandName
  next: CommandName
  select: CommandName
  clear: CommandName
  thumbnail: QueryName
}

const LYRICS: Commands = { previous: "LYRICS_PREVIOUS", next: "LYRICS_NEXT", select: "LYRICS_SELECT", clear: "LYRICS_CLEAR", thumbnail: "LYRICS_THUMBNAIL" }
const BIBLE: Commands = { previous: "BIBLE_PREVIOUS", next: "BIBLE_NEXT", select: "BIBLE_SELECT", clear: "BIBLE_CLEAR", thumbnail: "BIBLE_THUMBNAIL" }

/** "Verse 1 (2/3)" belongs to "Verse 1". */
function sectionOf(card: Card | undefined): string {
  return card?.label?.replace(/\s*\(\d+\/\d+\)$/, "") ?? ""
}

/** The colour of a section's number, so the song's shape reads at a glance. */
function sectionColor(section: string): string {
  const name = section.toLowerCase()
  if (name.startsWith("chorus") || name.startsWith("refrain")) {
    return "bg-pink-800 text-pink-100"
  }
  if (name.startsWith("bridge")) {
    return "bg-amber-700 text-amber-100"
  }
  if (name.startsWith("pre")) {
    return "bg-teal-700 text-teal-100"
  }
  return "bg-blue-800 text-blue-100"
}

/**
 * The cards as on the desktop: what is on screen large at the top, Previous and Next beside the title, and the cards
 * below. A tap acts at once, like a click on the desktop. Lyrics and Bible follow its "click = live" setting, so with
 * it on Preview and Program change together.
 */
function CardsPanel({ data, commands, cleared, onShown }: { data: CardsState; commands: Commands; cleared: boolean; onShown: () => void }) {
  const remote = useRemote()
  const { canControl } = usePermissions()
  const { run } = useCommand()
  const list = useRef<HTMLUListElement>(null)
  const goesLive = data.clickGoesLive
  const previewAt = data.previewIndex
  const liveAt = data.liveIndex
  // what this device chose: its display changes the moment it is tapped, and follows nothing the desktop does
  const [at, setAt] = useCursor(String(data.revision), Math.max(0, previewAt))
  const current = data.cards[at]
  const requests = data.cards.map((_, card) => ({
    key: `${commands.thumbnail}:${data.revision}:${card}`,
    params: { card, revision: data.revision },
  }))
  const picture = usePictureQueue(commands.thumbnail, requests, at)

  useEffect(() => {
    // the card's own list scrolls, so the picture and the buttons above it stay where they are
    const row = list.current?.children[at] as HTMLElement | undefined
    row?.scrollIntoView({ block: "center", behavior: "smooth" })
  }, [at, data.revision])

  const select = (card: number) => {
    const before = at
    haptic()
    setAt(card)
    onShown()
    void run(() => remote.commands.send(commands.select, { card, revision: data.revision })).then((result) => {
      if (!result.ok) {
        setAt(before)
      }
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row landscape:max-lg:flex-row">
      <div className="flex shrink-0 flex-col lg:w-1/2 lg:shrink landscape:max-lg:w-1/2">
        <ScreenView
          src={picture(`${commands.thumbnail}:${data.revision}:${at}`)}
          text={current?.text}
          cleared={cleared}
          className="max-h-[20dvh] lg:max-h-[36dvh] landscape:max-lg:max-h-[42dvh]"
        />
        <div className="flex items-center gap-1 border-y border-border bg-panel">
          <button
            type="button"
            aria-label="Previous"
            disabled={!canControl || at <= 0}
            onClick={() => select(at - 1)}
            className="flex h-16 w-20 shrink-0 items-center justify-center touch-manipulation disabled:opacity-30"
          >
            <ChevronsLeft className="size-10" aria-hidden />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <h2 className="truncate text-base font-semibold">{data.title}</h2>
            <p className="truncate text-xs text-muted-foreground">
              {current?.label ?? ""} (slide <b className="text-foreground">{at + 1}</b> of <b className="text-foreground">{data.cards.length}</b>)
              {" · "}Tap = {goesLive ? "Live" : "Preview"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Next"
            disabled={!canControl || at >= data.cards.length - 1}
            onClick={() => select(at + 1)}
            className="flex h-16 w-20 shrink-0 items-center justify-center touch-manipulation disabled:opacity-30"
          >
            <ChevronsRight className="size-10" aria-hidden />
          </button>
        </div>
        {!goesLive && <div className="p-2"><TakeButton className="h-14 text-xl" /></div>}
      </div>

      <ul ref={list} aria-label="Cards" className="min-h-0 flex-1 overflow-y-auto">
        {data.cards.map((card, i) => {
          const chosen = at === i && !cleared
          const live = liveAt === i
          const inPreview = previewAt === i
          const section = sectionOf(card)
          const firstOfSection = section !== sectionOf(data.cards[i - 1])
          const src = picture(`${commands.thumbnail}:${data.revision}:${i}`)
          return (
            <li key={i}>
              <button
                type="button"
                disabled={!canControl}
                aria-current={chosen ? "true" : undefined}
                onClick={() => select(i)}
                className={cn(
                  "flex w-full items-stretch gap-3 border-b border-border px-3 py-2.5 text-left touch-manipulation disabled:opacity-60",
                  chosen ? "bg-preview text-white" : "bg-card",
                )}
              >
                <span className="relative aspect-video w-[38%] max-w-48 shrink-0 self-start border border-black/60 bg-black">
                  {src ? (
                    <img src={src} alt="" className="absolute inset-0 size-full object-contain" />
                  ) : (
                    <span className="absolute inset-0 animate-pulse bg-secondary" aria-hidden />
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-center gap-2 text-sm">
                    <span className={cn("inline-flex h-6 min-w-7 items-center justify-center rounded px-1.5 text-xs font-semibold tabular-nums", firstOfSection ? sectionColor(section) : chosen ? "text-white/70" : "text-muted-foreground")}>{i + 1}</span>
                    {firstOfSection && <span className="truncate font-medium">{section}</span>}
                    {live && <span className="ml-auto shrink-0 text-[11px] font-bold">LIVE</span>}
                    {inPreview && !live && <span className={cn("ml-auto shrink-0 text-[11px] font-bold", chosen ? "text-white" : "text-blue-300")}>PREVIEW</span>}
                  </span>
                  <span className={cn("text-sm leading-snug whitespace-pre-line", !chosen && "text-foreground/90")}>{card.text}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

const TABS: { id: "lyrics" | "bible"; label: string; permission: Permission }[] = [
  { id: "lyrics", label: "LYRICS", permission: "LYRICS" },
  { id: "bible", label: "BIBLE", permission: "BIBLE" },
]

const SEGMENT = "flex h-11 items-center gap-1.5 px-3 text-sm font-semibold touch-manipulation disabled:opacity-40"

/** Black and Clear, side by side at the top, and what is open or a way to choose something else. */
function TopBar({ clear, onCleared, browse, browseLabel, children }: {
  clear: CommandName
  onCleared: (cleared: boolean) => void
  browse?: () => void
  browseLabel: string
  children?: React.ReactNode
}) {
  const remote = useRemote()
  const { state } = useRemoteSnapshot()
  const { canControl, has } = usePermissions()
  const { run, busy } = useCommand()
  const clearing = useClear(clear, onCleared)
  const [confirming, setConfirming] = useState(false)
  const black = state.projector?.black ?? false
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border bg-panel px-2 py-1.5">
      {browse && (
        <button type="button" aria-label={browseLabel} onClick={browse} className="flex size-11 shrink-0 items-center justify-center rounded-lg touch-manipulation">
          <Library className="size-6" aria-hidden />
        </button>
      )}
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex shrink-0 divide-x divide-border overflow-hidden rounded-lg border border-border bg-secondary">
        {has("BLACK_PROJECTOR") && (
          black ? (
            <button type="button" disabled={!canControl || busy} onClick={() => void run(remote.commands.restoreProjector)} className={cn(SEGMENT, "bg-live text-white")}>
              <MonitorUp className="size-4" aria-hidden /> Restore
            </button>
          ) : (
            <button type="button" disabled={!canControl || busy} onClick={() => setConfirming(true)} className={SEGMENT}>
              <MonitorOff className="size-4" aria-hidden /> Black
            </button>
          )
        )}
        <button type="button" disabled={clearing.disabled} onClick={clearing.clear} className={SEGMENT}>
          Clear
        </button>
      </div>
      {confirming && (
        <ConfirmDialog
          title="Black the projector?"
          confirmLabel="Black"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false)
            void run(remote.commands.blackProjector)
          }}
        >
          The room's screen goes black. Program, the livestream and recording continue.
        </ConfirmDialog>
      )}
    </div>
  )
}

export function LyricsBiblePage() {
  const { state } = useRemoteSnapshot()
  const { has } = usePermissions()
  const tabs = TABS.filter((t) => has(t.permission))
  const [chosen, setChosen] = useState<"lyrics" | "bible" | null>(null)
  const [browsing, setBrowsing] = useState(false)
  const [cleared, setCleared] = useState(false)
  const active = tabs.find((t) => t.id === chosen) ?? tabs[0]
  if (!active) {
    return null
  }
  const isLyrics = active.id === "lyrics"
  const data = isLyrics ? state.lyrics : state.bible
  const open = !!data && data.cards.length > 0
  const close = browsing && open ? () => setBrowsing(false) : undefined
  return (
    <>
      <TopBar
        clear={isLyrics ? "LYRICS_CLEAR" : "BIBLE_CLEAR"}
        onCleared={setCleared}
        browse={open && !browsing ? () => setBrowsing(true) : undefined}
        browseLabel={isLyrics ? "Songs" : "Verses"}
      >
        {tabs.length > 1 && (
          <div role="tablist" className="grid max-w-44 grid-cols-2 gap-0.5 rounded-lg bg-secondary p-0.5">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={t.id === active.id}
                onClick={() => {
                  setChosen(t.id)
                  setBrowsing(false)
                }}
                className={cn("h-10 rounded-md text-xs font-semibold touch-manipulation", t.id === active.id ? "bg-accent-brand text-white" : "text-muted-foreground")}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </TopBar>
      {data === undefined ? (
        <Page><Skeleton /></Page>
      ) : !open || browsing ? (
        // nothing open on the desktop is no reason to wait: this device chooses from the library itself
        <Page>{isLyrics ? <SongPicker onClose={close} /> : <BiblePicker current={data} onClose={close} />}</Page>
      ) : (
        <CardsPanel data={data} commands={isLyrics ? LYRICS : BIBLE} cleared={cleared} onShown={() => setCleared(false)} />
      )}
    </>
  )
}
