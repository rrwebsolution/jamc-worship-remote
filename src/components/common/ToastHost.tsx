import { useSyncExternalStore } from "react"
import { cn } from "@/lib/utils"
import { toastStore } from "@/store/remoteStore"

export function ToastHost() {
  const toasts = useSyncExternalStore(toastStore.subscribe, toastStore.get)
  return (
    <div className="pointer-events-none fixed inset-x-0 top-14 z-40 flex flex-col items-center gap-2 px-3" aria-live="assertive">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={cn("w-full max-w-md rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg", t.kind === "error" ? "bg-live" : "bg-take")}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
