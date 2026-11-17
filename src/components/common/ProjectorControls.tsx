import { MonitorUp } from "lucide-react"
import { BigButton } from "@/components/common/ui"
import { useCommand, usePermissions, useRemote, useRemoteSnapshot } from "@/hooks/useRemoteState"

/**
 * The remote has no Black button (user's request): the projector is blacked from the computer only.
 * Restore shows only while the projector is already black, so the remote can still bring it back.
 */
export function ProjectorControls() {
  const { commands } = useRemote()
  const { state } = useRemoteSnapshot()
  const { canControl, has } = usePermissions()
  const { run, busy } = useCommand()
  const black = state.projector?.black ?? false
  if (!has("BLACK_PROJECTOR") || !black) {
    return null
  }
  return (
    <div className="mt-2 border-t border-border pt-3">
      <BigButton className="h-14 w-full" disabled={!canControl || busy} onClick={() => void run(commands.restoreProjector)}>
        <MonitorUp className="size-5" aria-hidden /> RESTORE PROJECTOR
      </BigButton>
      <p className="mt-2 text-center text-xs font-semibold text-live">Projector is black. Stream and recording continue.</p>
    </div>
  )
}
