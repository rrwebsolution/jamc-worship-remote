import { Camera, CameraOff } from "lucide-react"
import { TakeButton } from "@/components/common/TakeButton"
import { Badge, EmptyState, Page, PageTitle, Skeleton } from "@/components/common/ui"
import { useCommand, usePermissions, useRemote, useRemoteSnapshot } from "@/hooks/useRemoteState"
import { haptic } from "@/lib/haptics"
import { cn } from "@/lib/utils"
import type { CameraInfo } from "@/types/remote"

const STATUS_BADGE: Record<CameraInfo["status"], "live" | "preview" | "neutral"> = { LIVE: "live", PREVIEW: "preview", READY: "neutral", OFFLINE: "neutral" }

/** Any number of cameras. A tap only sends a camera to Preview; TAKE puts it on Program. */
export function CameraGrid({ large }: { large?: boolean }) {
  const { commands } = useRemote()
  const { state } = useRemoteSnapshot()
  const { canControl, has } = usePermissions()
  const { run, busy } = useCommand()
  const cameras = state.cameras
  if (cameras === undefined) {
    return <Skeleton rows={4} />
  }
  if (cameras === null || cameras.length === 0) {
    return <EmptyState icon={CameraOff} title="No Cameras Available">Cameras connected to the desktop appear here.</EmptyState>
  }
  return (
    <div className={cn("grid grid-cols-2 gap-2 md:gap-3", large && "lg:grid-cols-3")}>
      {cameras.map((camera) => {
        const offline = camera.status === "OFFLINE"
        return (
          <button
            key={camera.id}
            type="button"
            disabled={!has("PREVIEW") || !canControl || busy || offline}
            onClick={() => {
              haptic()
              void run(() => commands.cameraPreview(camera.id))
            }}
            className={cn(
              "flex flex-col items-start gap-2 rounded-xl border-2 bg-card p-3 text-left touch-manipulation disabled:cursor-not-allowed",
              large ? "min-h-28" : "min-h-20",
              camera.status === "LIVE" ? "border-live" : camera.status === "PREVIEW" ? "border-preview" : "border-border",
              offline && "opacity-50",
            )}
          >
            <Badge kind={STATUS_BADGE[camera.status]}>{camera.status}</Badge>
            <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
              <Camera className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{camera.name}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function CamerasPage() {
  return (
    <Page>
      <PageTitle>Cameras</PageTitle>
      <CameraGrid />
      <TakeButton />
    </Page>
  )
}

/** Camera Control: only the cameras and TAKE, as a simple camera switcher. */
export function CameraControlPage() {
  return (
    <Page>
      <div className="flex-1"><CameraGrid large /></div>
      <TakeButton />
    </Page>
  )
}
