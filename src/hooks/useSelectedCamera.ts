import { useSyncExternalStore } from "react"
import { useRemoteSnapshot } from "@/hooks/useRemoteState"
import { cameraSelectionStore } from "@/store/remoteStore"
import type { CameraInfo } from "@/types/remote"

/** The camera this device marked with one tap, or null; a camera that went away, offline or off counts as none. */
export function useSelectedCamera(): CameraInfo | null {
  const id = useSyncExternalStore(cameraSelectionStore.subscribe, cameraSelectionStore.get)
  const { state } = useRemoteSnapshot()
  const camera = id ? state.cameras?.find((c) => c.id === id) : undefined
  return camera && camera.status !== "OFFLINE" && camera.on ? camera : null
}
