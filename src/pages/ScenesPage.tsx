import { Layers } from "lucide-react"
import { TakeButton } from "@/components/common/TakeButton"
import { Badge, EmptyState, Page, PageTitle, Skeleton } from "@/components/common/ui"
import { useCommand, usePermissions, useRemote, useRemoteSnapshot } from "@/hooks/useRemoteState"
import { haptic } from "@/lib/haptics"
import { cn } from "@/lib/utils"

/** Saved scenes only, with no editing. A tap sends the scene to Preview at once; Program waits for TAKE. */
export function SceneList() {
  const { commands } = useRemote()
  const { state } = useRemoteSnapshot()
  const { canControl, has } = usePermissions()
  const { run, busy } = useCommand()
  const scenes = state.scenes
  if (scenes === undefined) {
    return <Skeleton rows={4} />
  }
  if (scenes === null || scenes.length === 0) {
    return <EmptyState icon={Layers} title="No Saved Scenes">Scenes saved on the desktop appear here.</EmptyState>
  }
  return (
    <>
      <PageTitle>Scenes</PageTitle>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {scenes.map((scene) => (
          <li key={scene.id}>
            <button
              type="button"
              disabled={!has("PREVIEW") || !canControl || busy}
              onClick={() => {
                haptic()
                void run(() => commands.scenePreview(scene.id))
              }}
              className={cn(
                "flex min-h-16 w-full flex-col gap-1 rounded-xl border-2 bg-card px-3 py-2 text-left touch-manipulation",
                scene.live ? "border-live" : scene.preview ? "border-preview" : "border-border",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold">{scene.name}</span>
                <span className="flex gap-1">
                  {scene.live && <Badge kind="live">LIVE</Badge>}
                  {scene.preview && <Badge kind="preview">PREVIEW</Badge>}
                </span>
              </span>
              <span className="truncate text-xs text-muted-foreground">{scene.summary.join(" · ").toLowerCase()}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

export function ScenesPage() {
  return (
    <Page>
      <SceneList />
      <TakeButton />
    </Page>
  )
}
