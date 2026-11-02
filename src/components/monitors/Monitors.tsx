import { useEffect } from "react"
import { CircleDot, Eye } from "lucide-react"
import { Badge } from "@/components/common/ui"
import { useRemote, useRemoteSnapshot } from "@/hooks/useRemoteState"
import { cn } from "@/lib/utils"
import type { MonitorState } from "@/types/remote"

function describe(m: MonitorState | undefined): { main: string; sub: string | null } {
  if (!m || m.kind === "EMPTY") {
    return { main: "Nothing", sub: null }
  }
  const main = m.title ?? m.cameras[0] ?? m.scene ?? "Scene"
  const sub = [m.label, m.title || m.scene !== main ? m.scene : null, m.title ? m.cameras[0] : null].filter(Boolean).join(" · ")
  return { main, sub: sub || null }
}

function MonitorCard({ kind, state, picture, large }: { kind: "preview" | "program"; state?: MonitorState; picture?: string | null; large?: boolean }) {
  const { main, sub } = describe(state)
  const preview = kind === "preview"
  const Icon = preview ? Eye : CircleDot
  return (
    <section
      aria-label={preview ? "Preview" : "Program, live"}
      className={cn("min-w-0 overflow-hidden rounded-2xl border-2 bg-card", preview ? "border-preview" : "border-live")}
    >
      <div className="flex items-center gap-1.5 px-2.5 pt-2">
        <Icon className={cn("size-3.5", preview ? "text-preview" : "text-live")} aria-hidden />
        <Badge kind={preview ? "preview" : "live"}>{preview ? "PREVIEW" : "PROGRAM"}</Badge>
      </div>
      {picture && (
        <img src={picture} alt="" className="mx-2.5 mt-2 aspect-video w-[calc(100%-1.25rem)] rounded-md bg-black object-cover" />
      )}
      <div className={cn("px-2.5 py-2", large && "md:px-4 md:py-3")}>
        <p className={cn("truncate text-sm font-semibold", large && "md:text-xl")}>{main}</p>
        <p className={cn("truncate text-xs text-muted-foreground", large && "md:text-sm")}>{sub ?? " "}</p>
      </div>
    </section>
  )
}

/**
 * Preview and Program as the desktop reports them, on every page: whatever this device does shows here, because it
 * did happen on the desktop.
 */
export function MonitorPair({ large }: { large?: boolean }) {
  const { state } = useRemoteSnapshot()
  const { provider } = useRemote()
  // only while this is on screen: the pictures are heavy, and every other page has no use for them
  useEffect(() => {
    provider.watchPictures(true)
    return () => provider.watchPictures(false)
  }, [provider])
  return (
    <div className="grid shrink-0 grid-cols-2 gap-2 md:gap-3">
      <MonitorCard kind="preview" state={state.monitors?.preview} picture={state.pictures?.preview} large={large} />
      <MonitorCard kind="program" state={state.monitors?.program} picture={state.pictures?.program} large={large} />
    </div>
  )
}
