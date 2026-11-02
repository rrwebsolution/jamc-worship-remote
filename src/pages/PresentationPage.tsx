import { useState } from "react"
import { ChevronFirst, ChevronLast, ChevronsLeft, ChevronsRight, Library } from "lucide-react"
import { ScreenView } from "@/components/common/ScreenView"
import { TakeButton } from "@/components/common/TakeButton"
import { BigButton, Page, Skeleton } from "@/components/common/ui"
import { useClear } from "@/components/common/useClear"
import { PresentationPicker } from "@/components/library/LibraryPickers"
import { SlideGrid, useSlidePictures } from "@/components/presentation/SlideGrid"
import { useCursor } from "@/hooks/useCursor"
import { usePictureQueue } from "@/hooks/usePictureQueue"
import { useCommand, usePermissions, useRemote, useRemoteSnapshot } from "@/hooks/useRemoteState"
import { haptic } from "@/lib/haptics"
import type { PresentationState } from "@/types/remote"

/**
 * What this device has chosen, its display moving at once on a tap, and the sharp pictures of that slide and its
 * neighbours fetched ahead, so Next is already there.
 */
function useSlideRemote(p: PresentationState) {
  const { commands } = useRemote()
  const { canControl } = usePermissions()
  const { run } = useCommand()
  const [cursor, setCursor] = useCursor(`${p.id}/${p.total}`, Math.max(0, p.index))
  const pictures = useSlidePictures(p)
  const near = [cursor, cursor + 1, cursor - 1].flatMap((i) => (p.slides[i] ? [p.slides[i].number] : []))
  const large = usePictureQueue(
    "PRESENTATION_THUMBNAIL",
    near.map((number) => ({ key: `large:${p.id}:${number}`, params: { id: p.id, number, large: true } })),
    0,
  )
  const number = p.slides[cursor]?.number ?? 0
  const go = (index: number) => {
    const target = Math.min(Math.max(0, index), p.total - 1)
    const before = cursor
    haptic()
    setCursor(target)
    void run(() => commands.send("PRESENTATION_SELECT", { index: target })).then((result) => {
      if (!result.ok) {
        setCursor(before)
      }
    })
  }
  return {
    cursor,
    go,
    disabled: !canControl,
    atStart: cursor <= 0,
    atEnd: cursor >= p.total - 1,
    picture: large(`large:${p.id}:${number}`) ?? pictures.get(number),
    pictureAt: (i: number) => (p.slides[i] ? pictures.get(p.slides[i].number) : undefined),
  }
}

function SlidesPanel({ p, onBrowse }: { p: PresentationState; onBrowse: () => void }) {
  const r = useSlideRemote(p)
  const [cleared, setCleared] = useState(false)
  const clearing = useClear("PRESENTATION_CLEAR", setCleared)
  const go = (index: number) => {
    setCleared(false)
    r.go(index)
  }
  const showTake = p.mode !== "LIVE_CONTROL"
  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row landscape:max-lg:flex-row">
      <div className="flex shrink-0 flex-col lg:w-1/2 lg:shrink landscape:max-lg:w-1/2">
        <ScreenView src={r.picture} text={p.slides[r.cursor]?.label} cleared={cleared} className="max-h-[20dvh] lg:max-h-[36dvh] landscape:max-lg:max-h-[42dvh]" />
        <div className="flex items-center gap-2 border-b border-border bg-panel px-2 py-1">
          <button type="button" aria-label="Presentations" onClick={onBrowse} className="flex size-11 shrink-0 items-center justify-center touch-manipulation">
            <Library className="size-6" aria-hidden />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <h2 className="truncate text-base font-semibold">{p.title}</h2>
            <p className="truncate text-xs text-muted-foreground">
              Slide <b className="text-foreground">{r.cursor + 1}</b> of <b className="text-foreground">{p.total}</b>
              {" · "}Tap = {p.mode === "LIVE_CONTROL" ? "Live" : "Preview"}
            </p>
          </div>
          <button type="button" disabled={clearing.disabled} onClick={clearing.clear} className="h-11 shrink-0 rounded-lg border border-border bg-secondary px-3 text-sm font-semibold touch-manipulation disabled:opacity-40">
            Clear
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <SlideGrid p={p} selected={cleared ? -1 : r.cursor} disabled={r.disabled} onSelect={go} />
        </div>
        <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-panel p-2">
          <div className="grid grid-cols-[2.75rem_1fr_1fr_2.75rem] gap-2">
            <BigButton className="h-14 px-0" disabled={r.disabled || r.atStart} aria-label="First slide" onClick={() => go(0)}>
              <ChevronFirst className="size-5" aria-hidden />
            </BigButton>
            <BigButton className="h-14 px-0" disabled={r.disabled || r.atStart} aria-label="Previous slide" onClick={() => go(r.cursor - 1)}>
              <ChevronsLeft className="size-8" aria-hidden />
            </BigButton>
            <BigButton className="h-14 px-0" disabled={r.disabled || r.atEnd} aria-label="Next slide" onClick={() => go(r.cursor + 1)}>
              <ChevronsRight className="size-8" aria-hidden />
            </BigButton>
            <BigButton className="h-14 px-0" disabled={r.disabled || r.atEnd} aria-label="Last slide" onClick={() => go(p.total - 1)}>
              <ChevronLast className="size-5" aria-hidden />
            </BigButton>
          </div>
          {showTake && <TakeButton className="h-14 text-xl" />}
        </div>
      </div>
    </div>
  )
}

/** Slide remote. LIVE CONTROL moves Program too; PREVIEW FIRST moves Preview and TAKE puts it live. The desktop decides. */
export function PresentationPage() {
  const { state } = useRemoteSnapshot()
  const p = state.presentation
  const [browsing, setBrowsing] = useState(false)
  if (p === undefined) {
    return <Page><Skeleton /></Page>
  }
  if (p === null || browsing) {
    return (
      <Page>
        <PresentationPicker onClose={browsing && p ? () => setBrowsing(false) : undefined} />
      </Page>
    )
  }
  return <SlidesPanel p={p} onBrowse={() => setBrowsing(true)} />
}

function PastorThumb({ src, label }: { src?: string; label: string }) {
  return (
    <figure className="w-28 min-w-0">
      <span className="block aspect-video overflow-hidden rounded-lg bg-black">
        {src && <img src={src} alt="" className="size-full object-contain" />}
      </span>
      <figcaption className="mt-1 truncate text-center text-xs text-muted-foreground">{label}</figcaption>
    </figure>
  )
}

function PastorPanel({ p }: { p: PresentationState }) {
  const r = useSlideRemote(p)
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 md:p-5 landscape:max-lg:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center gap-2 overflow-y-auto text-center">
        <h2 className="w-full shrink-0 truncate text-xl font-semibold">{p.title}</h2>
        <ScreenView src={r.picture} text={p.slides[r.cursor]?.label} className="max-h-[32dvh] rounded-xl" />
        <p className="shrink-0 text-3xl font-bold tabular-nums">Slide {r.cursor + 1} / {p.total}</p>
        <div className="flex w-full shrink-0 justify-between gap-3 landscape:max-lg:hidden">
          {r.cursor > 0 ? <PastorThumb src={r.pictureAt(r.cursor - 1)} label="Previous" /> : <span />}
          {r.cursor < p.total - 1 ? <PastorThumb src={r.pictureAt(r.cursor + 1)} label="Next" /> : <span />}
        </div>
      </div>
      <div className="grid shrink-0 grid-cols-2 gap-3 landscape:max-lg:w-80 landscape:max-lg:self-end">
        <BigButton className="h-32 flex-col text-xl" disabled={r.disabled || r.atStart} aria-label="Previous slide" onClick={() => r.go(r.cursor - 1)}>
          <ChevronsLeft className="size-9" aria-hidden /> PREVIOUS
        </BigButton>
        <BigButton className="h-32 flex-col bg-accent-brand text-xl text-white hover:bg-accent-brand/90" disabled={r.disabled || r.atEnd} aria-label="Next slide" onClick={() => r.go(r.cursor + 1)}>
          <ChevronsRight className="size-9" aria-hidden /> NEXT
        </BigButton>
      </div>
    </div>
  )
}

/** Pastor Presentation Remote: the slide and two very large buttons, nothing else. */
export function PastorPage() {
  const { state } = useRemoteSnapshot()
  const p = state.presentation
  if (p === undefined) {
    return <Page><Skeleton /></Page>
  }
  if (p === null) {
    return <Page><PresentationPicker /></Page>
  }
  return <PastorPanel p={p} />
}
