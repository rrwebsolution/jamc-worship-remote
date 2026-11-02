import type { ComponentType, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** A rounded panel. */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border border-border bg-card", className)}>{children}</div>
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-lg font-semibold">{children}</h2>
}

/** Words as well as color: LIVE, PREVIEW and OFFLINE must read without seeing color. */
export function Badge({ kind, children }: { kind: "live" | "preview" | "neutral" | "take"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[11px] font-bold tracking-wide",
        kind === "live" && "bg-live text-white",
        kind === "preview" && "bg-preview text-white",
        kind === "take" && "bg-take text-white",
        kind === "neutral" && "bg-secondary text-muted-foreground",
      )}
    >
      {children}
    </span>
  )
}

export function EmptyState({ icon: Icon, title, children, action }: {
  icon: ComponentType<{ className?: string }>
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <Icon className="size-11 text-muted-foreground" aria-hidden />
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{children}</p>
      {action && <div className="mt-2 flex w-full max-w-xs flex-col gap-2">{action}</div>}
    </div>
  )
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl bg-card" />
      ))}
    </div>
  )
}

const BASE = "rounded-xl font-semibold touch-manipulation disabled:opacity-40"

/** The large buttons every control uses. */
export function BigButton({ className, ...props }: React.ComponentProps<typeof Button>) {
  return <Button variant="secondary" className={cn(BASE, "h-16 text-base", className)} {...props} />
}

/** A page body that scrolls, so the navigation stays put. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 md:gap-4 md:p-5", className)}>{children}</div>
}

/** A message over the page for something not to press by accident. */
export function ConfirmDialog({ title, children, confirmLabel, onConfirm, onCancel }: {
  title: string
  children: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <Card className="w-full max-w-sm p-5">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{children}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <BigButton className="h-14" onClick={onCancel}>Cancel</BigButton>
          <BigButton className="h-14 bg-live text-white hover:bg-live/90" onClick={onConfirm}>{confirmLabel}</BigButton>
        </div>
      </Card>
    </div>
  )
}
