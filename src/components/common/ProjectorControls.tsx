import { useState } from "react"
import { MonitorOff, MonitorUp } from "lucide-react"
import { BigButton, ConfirmDialog } from "@/components/common/ui"
import { useCommand, usePermissions, useRemote, useRemoteSnapshot } from "@/hooks/useRemoteState"

/** Black Projector and Restore, apart from the normal controls. Only the projector goes black: Program, stream and recording carry on. */
export function ProjectorControls() {
  const { commands } = useRemote()
  const { state } = useRemoteSnapshot()
  const { canControl, has } = usePermissions()
  const { run, busy } = useCommand()
  const [confirming, setConfirming] = useState(false)
  if (!has("BLACK_PROJECTOR")) {
    return null
  }
  const black = state.projector?.black ?? false
  return (
    <div className="mt-2 border-t border-border pt-3">
      {black ? (
        <BigButton className="h-14 w-full" disabled={!canControl || busy} onClick={() => void run(commands.restoreProjector)}>
          <MonitorUp className="size-5" aria-hidden /> RESTORE PROJECTOR
        </BigButton>
      ) : (
        <BigButton className="h-14 w-full border border-live/50 text-live" disabled={!canControl || busy} onClick={() => setConfirming(true)}>
          <MonitorOff className="size-5" aria-hidden /> BLACK PROJECTOR
        </BigButton>
      )}
      {black && <p className="mt-2 text-center text-xs font-semibold text-live">Projector is black. Stream and recording continue.</p>}
      {confirming && (
        <ConfirmDialog
          title="Black the projector?"
          confirmLabel="Black"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false)
            void run(commands.blackProjector)
          }}
        >
          The room's screen goes black. Program, the livestream and recording continue.
        </ConfirmDialog>
      )}
    </div>
  )
}
