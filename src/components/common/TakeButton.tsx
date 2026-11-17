import { Check, LoaderCircle, MoveRight } from "lucide-react"
import { BigButton } from "@/components/common/ui"
import { useCommand, usePermissions, useRemote, useRemoteSnapshot } from "@/hooks/useRemoteState"
import { useSelectedCamera } from "@/hooks/useSelectedCamera"
import { cameraSelectionStore } from "@/store/remoteStore"
import { haptic } from "@/lib/haptics"
import { cn } from "@/lib/utils"

/**
 * TAKE: Preview → Program. "Taken" shows only after the desktop confirmed; Program changes when its state arrives.
 * With a camera marked by one tap (white border), TAKE first sends that camera to Preview, then takes it.
 */
export function TakeButton({ className }: { className?: string }) {
  const { commands } = useRemote()
  const { state } = useRemoteSnapshot()
  const { canControl, has } = usePermissions()
  const { status, run, busy } = useCommand()
  const camera = useSelectedCamera()
  if (!has("TAKE")) {
    return null
  }
  const takeCamera = camera !== null && has("CAMERAS") && has("PREVIEW")
  const label = status === "sending" ? "Sending…" : status === "done" ? "Taken" : status === "failed" ? "TAKE FAILED" : "TAKE"
  return (
    <BigButton
      className={cn("h-20 w-full bg-take text-2xl font-bold tracking-wide text-white hover:bg-take/90", status === "failed" && "bg-live hover:bg-live/90", className)}
      disabled={!canControl || busy || (!takeCamera && !state.monitors?.canTake)}
      onClick={() => {
        haptic(20)
        if (takeCamera) {
          void run(async () => {
            if (camera.status !== "PREVIEW") {
              const previewed = await commands.cameraPreview(camera.id)
              if (!previewed.ok) {
                return previewed
              }
            }
            const taken = await commands.take()
            if (taken.ok) {
              cameraSelectionStore.set(null)
            }
            return taken
          })
        } else {
          void run(commands.take)
        }
      }}
    >
      {status === "sending" ? <LoaderCircle className="size-6 animate-spin" aria-hidden /> : status === "done" ? <Check className="size-6" aria-hidden /> : <MoveRight className="size-6" aria-hidden />}
      {label}
    </BigButton>
  )
}
