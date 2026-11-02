import { useCommand, usePermissions, useRemote, useRemoteSnapshot } from "@/hooks/useRemoteState"
import { haptic } from "@/lib/haptics"
import type { CommandName } from "@/types/remote"

/** Clear empties Preview and Program. A video live on Program is only for the Media page's Clear. */
export function useClear(command: CommandName, onCleared?: (cleared: boolean) => void) {
  const { commands } = useRemote()
  const { state } = useRemoteSnapshot()
  const { canControl } = usePermissions()
  const { run, busy } = useCommand()
  const monitors = state.monitors
  const inPreview = monitors?.preview.kind === "CONTENT" || monitors?.preview.kind === "VIDEO"
  const onProgram = monitors?.program.kind === "CONTENT" || (command === "MEDIA_CLEAR" && monitors?.program.kind === "VIDEO")
  return {
    disabled: !canControl || busy || !(inPreview || onProgram),
    clear: () => {
      haptic()
      onCleared?.(true)
      void run(() => commands.send(command)).then((result) => {
        if (!result.ok) {
          onCleared?.(false)
        }
      })
    },
  }
}
