import { useEffect, useRef, useState } from "react"
import { Camera, CameraOff, Eye, LoaderCircle, PowerOff } from "lucide-react"
import { TakeButton } from "@/components/common/TakeButton"
import { Badge, BigButton, EmptyState, Page, PageTitle, Skeleton } from "@/components/common/ui"
import { useCommand, usePermissions, useRemote, useRemoteSnapshot } from "@/hooks/useRemoteState"
import { useSelectedCamera } from "@/hooks/useSelectedCamera"
import { haptic } from "@/lib/haptics"
import { cn } from "@/lib/utils"
import { cameraSelectionStore } from "@/store/remoteStore"
import type { CameraInfo } from "@/types/remote"

/** Two taps on the same camera within this time count as a double tap (dblclick is unreliable on phones). */
const DOUBLE_TAP_MS = 350

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

/**
 * The camera's on / off switch, the same one as on the desktop's Camera page (both follow each other). A camera on
 * Preview or Program stays on, so its switch cannot be turned off.
 */
function CameraSwitch({ camera }: { camera: CameraInfo }) {
  const { commands } = useRemote()
  const { canControl, has } = usePermissions()
  const { run, busy } = useCommand()
  const inUse = camera.status === "LIVE" || camera.status === "PREVIEW"
  const offline = camera.status === "OFFLINE"
  return (
    <button
      type="button"
      role="switch"
      aria-checked={camera.on}
      aria-label={(camera.on ? "Switch off " : "Switch on ") + camera.name}
      disabled={!has("CAMERAS") || !has("PREVIEW") || !canControl || busy || inUse || (offline && !camera.on)}
      onClick={() => {
        haptic()
        if (camera.on && cameraSelectionStore.get() === camera.id) {
          cameraSelectionStore.set(null) // an off camera cannot stay marked
        }
        void run(() => commands.cameraPower(camera.id, !camera.on))
      }}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-white/20 transition-colors touch-manipulation disabled:opacity-50",
        camera.on ? "bg-take" : "bg-secondary",
      )}
    >
      <span className={cn("inline-block size-5 rounded-full bg-white shadow transition-transform", camera.on ? "translate-x-6" : "translate-x-1")} aria-hidden />
    </button>
  )
}

/**
 * Any number of cameras, each with its on / off switch; every camera starts off. One tap marks a camera that is on
 * (white border); nothing changes on the desktop until PREVIEW or TAKE. A double tap sends it to Preview at once.
 * With `multiview`, each camera that is on shows its picture.
 */
export function CameraGrid({ large, multiview }: { large?: boolean; multiview?: boolean }) {
  const { commands } = useRemote()
  const { state } = useRemoteSnapshot()
  const { canControl, has } = usePermissions()
  const { run, busy } = useCommand()
  const cameras = state.cameras
  const selected = useSelectedCamera()
  const lastTap = useRef<{ id: string; at: number } | null>(null)
  const pictures = useCameraPictures(multiview && cameras ? cameras.filter((c) => c.status !== "OFFLINE" && c.on).map((c) => c.id) : [])
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
        const off = !camera.on
        return (
          <div
            key={camera.id}
            className={cn(
              "relative flex flex-col overflow-hidden rounded-xl border-2 bg-card",
              selected?.id === camera.id ? "border-white ring-2 ring-white" : camera.status === "LIVE" ? "border-live" : camera.status === "PREVIEW" ? "border-preview" : "border-border",
            )}
          >
            <button
              type="button"
              disabled={!has("PREVIEW") || !canControl || busy || offline || off}
              onClick={() => {
                haptic()
                const now = Date.now()
                const double = lastTap.current?.id === camera.id && now - lastTap.current.at < DOUBLE_TAP_MS
                lastTap.current = double ? null : { id: camera.id, at: now }
                if (double) {
                  void run(() => commands.cameraPreview(camera.id)).then((result) => {
                    if (result.ok) {
                      cameraSelectionStore.set(null)
                    }
                  })
                } else {
                  cameraSelectionStore.set(camera.id)
                }
              }}
              className={cn(
                "flex flex-1 flex-col items-stretch text-left touch-manipulation disabled:cursor-not-allowed",
                !multiview && (large ? "min-h-28" : "min-h-20"),
                (offline || off) && "opacity-50",
              )}
            >
              {multiview && (
                <span className="relative block aspect-video w-full bg-black">
                  {offline ? (
                    <CameraOff className="absolute inset-0 m-auto size-6 text-muted-foreground" aria-hidden />
                  ) : off ? (
                    <PowerOff className="absolute inset-0 m-auto size-6 text-muted-foreground" aria-hidden />
                  ) : pictures[camera.id] ? (
                    <img src={pictures[camera.id]} alt={camera.name} className="absolute inset-0 size-full object-contain" />
                  ) : (
                    <span className="absolute inset-0 animate-pulse bg-secondary" aria-hidden />
                  )}
                </span>
              )}
              {/* below the picture: over it, the badge would hide part of the camera's view; room on the right for the switch */}
              <span className="flex flex-col items-start gap-2 p-3 pr-16">
                <Badge kind={off ? "neutral" : STATUS_BADGE[camera.status]}>{off && !offline ? "OFF" : camera.status}</Badge>
                <span className="flex w-full min-w-0 items-center gap-1.5 text-sm font-semibold">
                  <Camera className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{camera.name}</span>
                </span>
              </span>
            </button>
            <span className="absolute bottom-3 right-3">
              <CameraSwitch camera={camera} />
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** PREVIEW: sends the camera marked with one tap to Preview. Shown only while a camera is marked. */
export function CameraPreviewButton({ className }: { className?: string }) {
  const { commands } = useRemote()
  const { canControl, has } = usePermissions()
  const { run, busy } = useCommand()
  const selected = useSelectedCamera()
  if (!selected || !has("CAMERAS") || !has("PREVIEW")) {
    return null
  }
  return (
    <BigButton
      className={cn("h-20 w-full bg-preview text-2xl font-bold tracking-wide text-white hover:bg-preview/90", className)}
      disabled={!canControl || busy}
      onClick={() => {
        haptic()
        void run(() => commands.cameraPreview(selected.id)).then((result) => {
          if (result.ok) {
            cameraSelectionStore.set(null)
          }
        })
      }}
    >
      {busy ? <LoaderCircle className="size-6 animate-spin" aria-hidden /> : <Eye className="size-6" aria-hidden />}
      PREVIEW
    </BigButton>
  )
}

/** PREVIEW and TAKE side by side; PREVIEW shows only while a camera is marked. */
export function CameraButtons({ className }: { className?: string }) {
  return (
    <div className={cn("flex gap-3", className)}>
      <CameraPreviewButton className="flex-1" />
      <div className="flex-1"><TakeButton /></div>
    </div>
  )
}

export function CamerasPage() {
  return (
    <Page>
      <PageTitle>Cameras</PageTitle>
      <CameraGrid multiview />
      <CameraButtons />
    </Page>
  )
}

/** Camera Control: only the cameras, PREVIEW and TAKE, as a simple camera switcher. */
export function CameraControlPage() {
  return (
    <Page>
      <div className="flex-1"><CameraGrid large multiview /></div>
      <CameraButtons />
    </Page>
  )
}
