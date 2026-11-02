import { Check, LoaderCircle, MoveRight } from "lucide-react"
import { BigButton } from "@/components/common/ui"
import { useCommand, usePermissions, useRemote, useRemoteSnapshot } from "@/hooks/useRemoteState"
import { haptic } from "@/lib/haptics"
import { cn } from "@/lib/utils"

/** TAKE: Preview → Program. "Taken" shows only after the desktop confirmed; Program changes when its state arrives. */
export function TakeButton({ className }: { className?: string }) {
  const { commands } = useRemote()
  const { state } = useRemoteSnapshot()
  const { canControl, has } = usePermissions()
  const { status, run, busy } = useCommand()
  if (!has("TAKE")) {
    return null
  }
  const label = status === "sending" ? "Sending…" : status === "done" ? "Taken" : status === "failed" ? "TAKE FAILED" : "TAKE"
  return (
    <BigButton
      className={cn("h-20 w-full bg-take text-2xl font-bold tracking-wide text-white hover:bg-take/90", status === "failed" && "bg-live hover:bg-live/90", className)}
      disabled={!canControl || busy || !state.monitors?.canTake}
      onClick={() => {
        haptic(20)
        void run(commands.take)
      }}
    >
      {status === "sending" ? <LoaderCircle className="size-6 animate-spin" aria-hidden /> : status === "done" ? <Check className="size-6" aria-hidden /> : <MoveRight className="size-6" aria-hidden />}
      {label}
    </BigButton>
  )
}
