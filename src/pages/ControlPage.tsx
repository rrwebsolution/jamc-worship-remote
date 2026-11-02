import { ChevronLeft, ChevronRight } from "lucide-react"
import { ProjectorControls } from "@/components/common/ProjectorControls"
import { TakeButton } from "@/components/common/TakeButton"
import { BigButton, Page } from "@/components/common/ui"
import { MonitorPair } from "@/components/monitors/Monitors"
import { useCommand, usePermissions, useRemote, useRemoteSnapshot } from "@/hooks/useRemoteState"
import { haptic } from "@/lib/haptics"
import { CameraGrid } from "@/pages/CamerasPage"
import { SceneList } from "@/pages/ScenesPage"
import { ServiceList } from "@/pages/ServicePage"
import type { CommandName } from "@/types/remote"

/** What Previous / Next move right now: whatever the operator has open that this device may control. */
function useStep(): { previous: CommandName; next: CommandName; label: string } | null {
  const { state } = useRemoteSnapshot()
  const { has } = usePermissions()
  if (state.presentation && has("PRESENTATION")) {
    return { previous: "PRESENTATION_PREVIOUS", next: "PRESENTATION_NEXT", label: state.presentation.title }
  }
  if (state.lyrics && has("LYRICS")) {
    return { previous: "LYRICS_PREVIOUS", next: "LYRICS_NEXT", label: state.lyrics.title }
  }
  if (state.bible && has("BIBLE")) {
    return { previous: "BIBLE_PREVIOUS", next: "BIBLE_NEXT", label: state.bible.title }
  }
  return null
}

/** The main dashboard. On a tablet: lists on the left, monitors large, and Previous, TAKE, Next along the bottom. */
export function ControlPage() {
  const { commands } = useRemote()
  const { canControl, has } = usePermissions()
  const step = useStep()
  const { run, busy } = useCommand()
  const press = (command: CommandName) => {
    haptic()
    void run(() => commands.send(command))
  }
  const hasLists = has("SERVICE") || has("SCENES") || has("CAMERAS")
  return (
    <div className="flex min-h-0 flex-1 flex-col md:portrait:flex-row lg:flex-row">
      {hasLists && (
        <aside className="hidden w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r border-border p-4 md:portrait:flex lg:flex lg:w-80">
          {has("SERVICE") && <ServiceList />}
          {has("SCENES") && <SceneList />}
          {has("CAMERAS") && <CameraGrid />}
        </aside>
      )}
      {/* a phone on its side: monitors on the left, controls on the right, all in view */}
      <Page className="lg:justify-between landscape:max-lg:grid landscape:max-lg:grid-cols-2 landscape:max-lg:content-start">
        <MonitorPair large />
        <div className="mt-auto flex flex-col gap-3 landscape:max-lg:mt-0 landscape:max-lg:gap-2">
          {step && <p className="truncate text-center text-sm text-muted-foreground landscape:max-lg:hidden">{step.label}</p>}
          <div className="grid grid-cols-2 items-stretch gap-3 lg:grid-cols-[1fr_2fr_1fr]">
            {step && (
              <BigButton disabled={!canControl || busy} aria-label="Previous" onClick={() => press(step.previous)} className="order-1 landscape:max-lg:h-12">
                <ChevronLeft className="size-6" aria-hidden /> Previous
              </BigButton>
            )}
            <div className="order-3 col-span-2 lg:order-2 lg:col-span-1"><TakeButton className="lg:h-full landscape:max-lg:h-14 landscape:max-lg:text-xl" /></div>
            {step && (
              <BigButton disabled={!canControl || busy} aria-label="Next" onClick={() => press(step.next)} className="order-2 lg:order-3 landscape:max-lg:h-12">
                Next <ChevronRight className="size-6" aria-hidden />
              </BigButton>
            )}
          </div>
          <ProjectorControls />
        </div>
      </Page>
    </div>
  )
}
