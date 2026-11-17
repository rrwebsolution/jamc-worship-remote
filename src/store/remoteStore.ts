import { createContext } from "react"
import type { CommandService } from "@/services/commandService"
import type { RemoteDataProvider } from "@/services/remoteProvider"

export interface RemoteContextValue {
  provider: RemoteDataProvider
  commands: CommandService
}

/** The provider in use. Its snapshot is the one centralized state: everything on screen comes from it. */
export const RemoteContext = createContext<RemoteContextValue | null>(null)

export interface Toast {
  id: number
  message: string
  kind: "error" | "success"
}

let nextToast = 1
let toasts: Toast[] = []
const toastListeners = new Set<() => void>()

function publish(next: Toast[]): void {
  toasts = next
  toastListeners.forEach((listener) => listener())
}

export const toastStore = {
  subscribe(listener: () => void): () => void {
    toastListeners.add(listener)
    return () => toastListeners.delete(listener)
  },
  get: (): Toast[] => toasts,
  show(message: string, kind: Toast["kind"] = "error"): void {
    const id = nextToast++
    publish([...toasts.slice(-2), { id, message, kind }])
    setTimeout(() => publish(toasts.filter((t) => t.id !== id)), 3500)
  },
}

let selectedCamera: string | null = null
const cameraListeners = new Set<() => void>()

/**
 * The camera tapped once on this device: only marked (white border), nothing sent. PREVIEW sends it to Preview,
 * TAKE puts it on Program. A double tap sends it to Preview at once. Kept here so the grid and the buttons share it.
 */
export const cameraSelectionStore = {
  subscribe(listener: () => void): () => void {
    cameraListeners.add(listener)
    return () => cameraListeners.delete(listener)
  },
  get: (): string | null => selectedCamera,
  set(id: string | null): void {
    if (selectedCamera !== id) {
      selectedCamera = id
      cameraListeners.forEach((listener) => listener())
    }
  },
}
