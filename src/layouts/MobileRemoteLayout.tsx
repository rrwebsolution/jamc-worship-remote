import { LoaderCircle, Lock, WifiOff } from "lucide-react"
import type { ReactNode } from "react"
import { NavLink, Outlet } from "react-router-dom"
import { ToastHost } from "@/components/common/ToastHost"
import { usePermissions, useRemoteSnapshot } from "@/hooks/useRemoteState"
import { allowed, MORE_PAGE, PRIMARY, type NavItem } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import type { ConnectionState } from "@/types/remote"

const LABELS: Record<ConnectionState, string> = {
  connecting: "Connecting",
  connected: "Connected",
  reconnecting: "Reconnecting",
  disconnected: "Disconnected",
  pairing_required: "Pairing Required",
  waiting_approval: "Waiting",
}

export function ConnectionBadge({ state, demo }: { state: ConnectionState; demo?: boolean }) {
  const trying = state === "connecting" || state === "reconnecting" || state === "waiting_approval"
  return (
    <span
      role="status"
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        state === "connected" && "border-take/50 bg-take/10 text-emerald-400",
        trying && "border-amber-500/40 bg-amber-500/10 text-amber-400",
        (state === "disconnected" || state === "pairing_required") && "border-live/50 bg-live/10 text-red-400",
      )}
    >
      {trying ? <LoaderCircle className="size-3 animate-spin" aria-hidden /> : <span className={cn("size-2 rounded-full", state === "connected" ? "bg-emerald-400" : "bg-red-400")} aria-hidden />}
      {demo ? "Demo" : LABELS[state]}
    </span>
  )
}

export function AppHeader({ state, demo }: { state: ConnectionState; demo?: boolean }) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <img src="/icons/icon-192.png" alt="" className="size-8 rounded-lg" />
        <div className="min-w-0 leading-tight">
          <p className="text-[11px] font-bold tracking-widest text-accent-brand">LIVECAT</p>
          <h1 className="truncate text-sm font-semibold">Remote</h1>
        </div>
      </div>
      <ConnectionBadge state={state} demo={demo} />
    </header>
  )
}

/** The page shape: clear of the phone's notch and home bar, full height, never scrolling as a whole. */
export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex h-dvh w-full flex-col pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]">
      {children}
    </div>
  )
}

function NavButton({ item, rail }: { item: NavItem; rail?: boolean }) {
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        cn(
          "flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium touch-manipulation",
          rail ? "h-16 w-full rounded-xl" : "h-14 flex-1",
          isActive ? "text-accent-brand" : "text-muted-foreground",
        )
      }
    >
      <item.icon className="size-5" aria-hidden />
      {item.title}
    </NavLink>
  )
}

/** The dashboard: a bottom bar on phones, a side rail where there is room. Only what this device may use. */
export function MobileRemoteLayout() {
  const snapshot = useRemoteSnapshot()
  const { permissions } = usePermissions()
  const items = [...PRIMARY.filter((item) => allowed(item, permissions)), MORE_PAGE]
  const lost = snapshot.connection !== "connected"
  return (
    <Shell>
      <AppHeader state={snapshot.connection} demo={snapshot.demo} />
      {lost && (
        <div role="alert" className="flex shrink-0 items-center gap-2 bg-live px-3 py-2 text-sm font-semibold text-white">
          <WifiOff className="size-4" aria-hidden /> CONNECTION LOST. Trying to reconnect…
        </div>
      )}
      {snapshot.locked && !lost && (
        <div role="status" className="flex shrink-0 items-center gap-2 bg-amber-600 px-3 py-2 text-sm font-semibold text-white">
          <Lock className="size-4" aria-hidden /> Remote commands are locked on the desktop
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <nav aria-label="Main" className="hidden w-20 shrink-0 flex-col gap-1 border-r border-border p-1.5 md:flex landscape:max-lg:flex">
          {items.map((item) => <NavButton key={item.path} item={item} rail />)}
        </nav>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Outlet />
        </main>
      </div>
      <nav aria-label="Main" className="flex shrink-0 border-t border-border bg-panel md:hidden landscape:max-lg:hidden">
        {items.map((item) => <NavButton key={item.path} item={item} />)}
      </nav>
      <ToastHost />
    </Shell>
  )
}
