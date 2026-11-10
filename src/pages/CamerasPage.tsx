import { useEffect, useState } from "react"
import { Camera, CameraOff } from "lucide-react"
import { TakeButton } from "@/components/common/TakeButton"
import { Badge, EmptyState, Page, PageTitle, Skeleton } from "@/components/common/ui"
import { useCommand, usePermissions, useRemote, useRemoteSnapshot } from "@/hooks/useRemoteState"
import { haptic } from "@/lib/haptics"
import { cn } from "@/lib/utils"
import type { CameraInfo } from "@/types/remote"

const STATUS_BADGE: Record<CameraInfo["status"], "live" | "preview" | "neutral"> = { LIVE: "live", PREVIEW: "preview", READY: "neutral", OFFLINE: "neutral" }

/** How often the whole multiview refreshes: small pictures, not video, so the Wi-Fi stays free for commands. */
const ROUND_MS = 1000

/**
 * The latest picture of each camera, asked for one after another, so a slow connection only slows the pictures.
 * Nothing is asked while the page is closed or the phone's screen is off, and the desktop then closes unused cameras.
 */
function useCameraPictures(ids: string[]): Record<string, string> {
  const { provider } = useRemote()
  const [pictures, setPictures] = useState<Record<string, string>>({})
  const signature = JSON.stringify(ids)

  useEffect(() => {
    let cancelled = false
    const list = JSON.parse(signature) as string[]
    const run = async () => {
      while (!cancelled) {
        const started = Date.now()
        for (const id of document.hidden ? [] : list) {
          const result = await provider.query("CAMERA_PICTURE", { id })
          const src = result.ok ? (result.data as { src: string }).src : ""
          if (cancelled) {
            return
          }
          if (src) {
            setPictures((now) => ({ ...now, [id]: src }))
          }
        }
        await new Promise((resolve) => setTimeout(resolve, Math.max(200, ROUND_MS - (Date.now() - started))))
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [provider, signature])

  return pictures
}

/** Any number of cameras. A tap only sends a camera to Preview; TAKE puts it on Program. With `multiview`, each shows its picture. */
export function CameraGrid({ large, multiview }: { large?: boolean; multiview?: boolean }) {
  const { commands } = useRemote()
  const { state } = useRemoteSnapshot()
  const { canControl, has } = usePermissions()
  const { run, busy } = useCommand()
  const cameras = state.cameras
  const pictures = useCameraPictures(multiview && cameras ? cameras.filter((c) => c.status !== "OFFLINE").map((c) => c.id) : [])
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
              "flex flex-col items-stretch overflow-hidden rounded-xl border-2 bg-card text-left touch-manipulation disabled:cursor-not-allowed",
              !multiview && (large ? "min-h-28" : "min-h-20"),
              camera.status === "LIVE" ? "border-live" : camera.status === "PREVIEW" ? "border-preview" : "border-border",
              offline && "opacity-50",
            )}
          >
            {multiview && (
              <span className="relative block aspect-video w-full bg-black">
                {offline ? (
                  <CameraOff className="absolute inset-0 m-auto size-6 text-muted-foreground" aria-hidden />
                ) : pictures[camera.id] ? (
                  <img src={pictures[camera.id]} alt={camera.name} className="absolute inset-0 size-full object-contain" />
                ) : (
                  <span className="absolute inset-0 animate-pulse bg-secondary" aria-hidden />
                )}
              </span>
            )}
            {/* below the picture: over it, the badge would hide part of the camera's view */}
            <span className="flex flex-col items-start gap-2 p-3">
              <Badge kind={STATUS_BADGE[camera.status]}>{camera.status}</Badge>
              <span className="flex w-full min-w-0 items-center gap-1.5 text-sm font-semibold">
                <Camera className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{camera.name}</span>
              </span>
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
      <CameraGrid multiview />
      <TakeButton />
    </Page>
  )
}

/** Camera Control: only the cameras and TAKE, as a simple camera switcher. */
export function CameraControlPage() {
  return (
    <Page>
      <div className="flex-1"><CameraGrid large multiview /></div>
      <TakeButton />
    </Page>
  )
}
