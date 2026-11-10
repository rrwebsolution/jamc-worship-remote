import { useState } from "react"
import { Film, Music, Pause, Play, Repeat, Square, Volume2, VolumeX } from "lucide-react"
import { TakeButton } from "@/components/common/TakeButton"
import { Badge, BigButton, Card, Page, Skeleton } from "@/components/common/ui"
import { useClear } from "@/components/common/useClear"
import { MediaPicker } from "@/components/library/LibraryPickers"
import { useCommand, usePermissions, useRemote, useRemoteSnapshot } from "@/hooks/useRemoteState"
import { clock } from "@/lib/haptics"
import { cn } from "@/lib/utils"

/**
 * A slider that follows the desktop's value, except while the finger is on it: then it shows the finger's value, and
 * only letting go sends one command. Sending on every step disabled the slider mid-drag (busy) and flooded the desktop.
 */
function CommitSlider({ value, max, disabled, onCommit, ...rest }: {
  value: number
  max: number
  disabled: boolean
  onCommit: (value: number) => void
  id?: string
  "aria-label"?: string
}) {
  const [draft, setDraft] = useState<number | null>(null)
  const commit = () => {
    if (draft !== null) {
      onCommit(draft)
      setDraft(null)
    }
  }
  return (
    <input
      {...rest}
      type="range"
      min={0}
      max={max}
      value={draft ?? value}
      disabled={disabled}
      className="h-8 w-full accent-[var(--brand)]"
      onChange={(e) => setDraft(Number(e.target.value))}
      onPointerUp={commit}
      onTouchEnd={commit}
      onKeyUp={commit}
      onBlur={commit}
    />
  )
}

/** What is playing on Program. Every value shown is what the desktop reported: a press changes nothing here until it confirms. */
export function MediaPage() {
  const { commands } = useRemote()
  const { state } = useRemoteSnapshot()
  const { canControl } = usePermissions()
  const { run, busy } = useCommand()
  const clearing = useClear("MEDIA_CLEAR")
  const clearButton = <BigButton disabled={clearing.disabled} onClick={clearing.clear}>Clear</BigButton>
  const m = state.media
  if (m === undefined) {
    return <Page><Skeleton /></Page>
  }
  if (m === null) {
    // nothing playing: choose something. It goes to Preview, and TAKE puts it on Program.
    return (
      <Page>
        <TakeButton />
        {clearButton}
        <MediaPicker />
      </Page>
    )
  }
  const send = (name: Parameters<typeof commands.send>[0], payload?: Record<string, unknown>) => void run(() => commands.send(name, payload))
  const disabled = !canControl || busy
  return (
    <Page>
      <Card className="flex shrink-0 flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          {m.kind === "VIDEO" ? <Film className="size-5 shrink-0 text-accent-brand" aria-hidden /> : <Music className="size-5 shrink-0 text-accent-brand" aria-hidden />}
          <h2 className="min-w-0 flex-1 truncate font-semibold">{m.title}</h2>
          <Badge kind={m.playing ? "take" : "neutral"}>{m.playing ? "PLAYING" : "PAUSED"}</Badge>
        </div>
        <CommitSlider
          max={1000}
          value={m.lengthSeconds > 0 ? Math.round((m.seconds / m.lengthSeconds) * 1000) : 0}
          disabled={!canControl || m.lengthSeconds <= 0}
          aria-label="Position"
          onCommit={(v) => send("MEDIA_SEEK", { position: v / 1000 })}
        />
        <p className="flex justify-between text-xs text-muted-foreground tabular-nums"><span>{clock(m.seconds)}</span><span>{clock(m.lengthSeconds)}</span></p>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        {m.playing ? (
          <BigButton disabled={disabled} onClick={() => send("MEDIA_PAUSE")}><Pause className="size-6" aria-hidden /> Pause</BigButton>
        ) : (
          <BigButton disabled={disabled} className="bg-take text-white hover:bg-take/90" onClick={() => send("MEDIA_PLAY")}><Play className="size-6" aria-hidden /> Play</BigButton>
        )}
        <BigButton disabled={disabled} onClick={() => send("MEDIA_STOP")}><Square className="size-5" aria-hidden /> Stop</BigButton>
        <BigButton disabled={disabled} className={cn(m.muted && "text-live")} aria-pressed={m.muted} onClick={() => send("MEDIA_MUTE", { muted: !m.muted })}>
          {m.muted ? <VolumeX className="size-6" aria-hidden /> : <Volume2 className="size-6" aria-hidden />} {m.muted ? "Muted" : "Mute"}
        </BigButton>
        <BigButton disabled={disabled} className={cn(m.loop && "text-accent-brand")} aria-pressed={m.loop} onClick={() => send("MEDIA_SET_LOOP", { loop: !m.loop })}>
          <Repeat className="size-5" aria-hidden /> Loop {m.loop ? "ON" : "OFF"}
        </BigButton>
      </div>
      <Card className="flex shrink-0 items-center gap-3 p-4">
        <label htmlFor="volume" className="shrink-0 text-sm font-medium">Volume {m.volume}%</label>
        <CommitSlider
          id="volume"
          max={100}
          value={m.volume}
          disabled={!canControl}
          onCommit={(v) => send("MEDIA_SET_VOLUME", { volume: v })}
        />
      </Card>
      <TakeButton />
      {clearButton}
      <MediaPicker />
    </Page>
  )
}
