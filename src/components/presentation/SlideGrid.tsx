import { useEffect, useRef } from "react"
import { Badge } from "@/components/common/ui"
import { usePictureQueue } from "@/hooks/usePictureQueue"
import { cn } from "@/lib/utils"
import type { PresentationState } from "@/types/remote"

/** The pictures of a presentation's slides, by slide number. */
export function useSlidePictures(p: PresentationState | null | undefined): Map<number, string> {
  const id = p?.id
  const requests = (p?.slides ?? []).map((s) => ({ key: `slide:${id}:${s.number}`, params: { id, number: s.number } }))
  const picture = usePictureQueue("PRESENTATION_THUMBNAIL", requests, p?.index ?? 0)
  const found = new Map<number, string>()
  for (const s of p?.slides ?? []) {
    const src = picture(`slide:${id}:${s.number}`)
    if (src) {
      found.set(s.number, src)
    }
  }
  return found
}

/** The slides as on the desktop's list: a tap goes to that slide at once. `selected` is what this device chose. */
export function SlideGrid({ p, selected, disabled, onSelect }: { p: PresentationState; selected: number; disabled: boolean; onSelect: (index: number) => void }) {
  const found = useSlidePictures(p)
  const current = useRef<HTMLLIElement>(null)
  useEffect(() => {
    current.current?.scrollIntoView({ block: "center", behavior: "smooth" })
  }, [selected, p.id])
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3 lg:grid-cols-4" aria-label="Slides">
      {p.slides.map((slide, i) => {
        const live = p.liveIndex === i
        const inPreview = p.previewIndex === i
        const src = found.get(slide.number)
        return (
          <li key={i} ref={i === selected ? current : undefined}>
            <button
              type="button"
              disabled={disabled}
              aria-label={`Slide ${i + 1}`}
              aria-current={i === selected ? "true" : undefined}
              onClick={() => onSelect(i)}
              className={cn(
                "flex w-full flex-col overflow-hidden rounded-xl border-2 text-left touch-manipulation disabled:opacity-60",
                i === selected ? "border-preview bg-preview text-white" : "border-border bg-card",
              )}
            >
              <span className="relative block aspect-video w-full bg-black">
                {src ? (
                  <img src={src} alt="" className="absolute inset-0 size-full object-contain" />
                ) : (
                  <span className="absolute inset-0 animate-pulse bg-secondary" aria-hidden />
                )}
              </span>
              {/* below the picture: over it, the badges would hide the slide's own words */}
              <span className={cn("flex min-h-7 items-center justify-between gap-1 px-2 py-1 text-xs font-medium", i !== selected && "text-muted-foreground")}>
                <span className="truncate">{i + 1}</span>
                <span className="flex shrink-0 gap-1">
                  {live && <Badge kind="live">LIVE</Badge>}
                  {inPreview && <Badge kind="preview">PREVIEW</Badge>}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
