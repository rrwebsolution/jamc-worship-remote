import { useCallback, useContext, useState, useSyncExternalStore } from "react"
import { commandMessage } from "@/services/commandService"
import { RemoteContext, toastStore, type RemoteContextValue } from "@/store/remoteStore"
import type { CommandResult, Permission, RemoteSnapshot } from "@/types/remote"

export function useRemote(): RemoteContextValue {
  const value = useContext(RemoteContext)
  if (!value) {
    throw new Error("useRemote needs a RemoteContext provider")
  }
  return value
}

export function useRemoteSnapshot(): RemoteSnapshot {
  const { provider } = useRemote()
  return useSyncExternalStore(
    useCallback((listener) => provider.subscribe(listener), [provider]),
    useCallback(() => provider.getSnapshot(), [provider]),
  )
}

export function usePermissions() {
  const { permissions, connection, locked } = useRemoteSnapshot()
  return {
    permissions,
    has: (p: Permission) => permissions.includes(p),
    /** Commands only go while connected and unlocked; dangerous controls disable themselves otherwise. */
    canControl: connection === "connected" && !locked,
  }
}

export type CommandStatus = "idle" | "sending" | "done" | "failed"

/**
 * Runs a command and tracks its feedback: "done" only after the desktop confirmed. The screen itself never changes
 * here: it changes when the desktop's new state arrives.
 */
export function useCommand() {
  const [status, setStatus] = useState<CommandStatus>("idle")
  const run = useCallback(async (send: () => Promise<CommandResult>) => {
    setStatus("sending")
    const result = await send()
    setStatus(result.ok ? "done" : "failed")
    if (!result.ok) {
      toastStore.show(commandMessage(result.code))
    }
    setTimeout(() => setStatus("idle"), 1200)
    return result
  }, [])
  return { status, run, busy: status === "sending" }
}
