import { ChevronRight, Radio, RefreshCw, Video } from "lucide-react"
import { Link } from "react-router-dom"
import { Badge, BigButton, Card, Page, PageTitle, Skeleton } from "@/components/common/ui"
import { usePermissions, useRemote, useRemoteSnapshot } from "@/hooks/useRemoteState"
import { allowed, SECONDARY } from "@/lib/navigation"
import { DEMO_ROLES, MockRemoteProvider } from "@/services/mockRemoteProvider"
import { clock } from "@/lib/haptics"
import type { Permission, SessionState } from "@/types/remote"

export function MorePage() {
  const { permissions } = usePermissions()
  return (
    <Page>
      <PageTitle>More</PageTitle>
      <ul className="flex flex-col gap-2">
        {SECONDARY.filter((item) => allowed(item, permissions)).map((item) => (
          <li key={item.path}>
            <Link to={item.path} className="flex min-h-14 items-center gap-3 rounded-xl border border-border bg-card px-3 font-medium touch-manipulation">
              <item.icon className="size-5 text-accent-brand" aria-hidden />
              <span className="flex-1">{item.title}</span>
              <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Page>
  )
}

function SessionCard({ title, icon: Icon, session, activeLabel, idleLabel }: {
  title: string
  icon: typeof Radio
  session: SessionState | null | undefined
  activeLabel: string
  idleLabel: string
}) {
  if (session === undefined) {
    return <Skeleton rows={1} />
  }
  const active = session?.state === "ACTIVE"
  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-center gap-2">
        <Icon className="size-5 text-accent-brand" aria-hidden />
        <h2 className="flex-1 font-semibold">{title}</h2>
        <Badge kind={active ? "live" : session?.state === "ERROR" ? "preview" : "neutral"}>{active ? activeLabel : session?.state === "ERROR" ? "ERROR" : session?.state === "STARTING" ? "STARTING" : idleLabel}</Badge>
      </div>
      {active && (
        <>
          <p className="text-3xl font-bold tabular-nums">{clock(session.seconds)}</p>
          <p className="text-sm text-muted-foreground">
            {[session.fps ? `${session.fps} fps` : null, session.kbps ? `${(session.kbps / 1000).toFixed(1)} Mbps` : null, session.file].filter(Boolean).join(" · ")}
          </p>
        </>
      )}
    </Card>
  )
}

/** Monitoring only: starting or stopping stays on the desktop. */
export function MonitorPage() {
  const { state } = useRemoteSnapshot()
  const { has } = usePermissions()
  return (
    <Page>
      <PageTitle>Monitor</PageTitle>
      {has("STREAM_MONITOR") && <SessionCard title="Stream" icon={Radio} session={state.stream} activeLabel="LIVE" idleLabel="OFFLINE" />}
      {has("RECORDING_MONITOR") && <SessionCard title="Recording" icon={Video} session={state.recording} activeLabel="RECORDING" idleLabel="NOT RECORDING" />}
    </Page>
  )
}

export function ConnectionPage() {
  const { provider } = useRemote()
  const s = useRemoteSnapshot()
  return (
    <Page>
      <PageTitle>Connection</PageTitle>
      <Card className="flex flex-col gap-2 p-4 text-sm">
        <p><span className="text-muted-foreground">Status: </span><span className="font-semibold capitalize">{s.demo ? "Demo Mode" : s.connection.replace("_", " ")}</span></p>
        <p><span className="text-muted-foreground">Presenter: </span><span className="font-semibold">{s.address ?? "None (demo data)"}</span></p>
      </Card>
      {!s.demo && (
        <BigButton className="h-14 w-full" disabled={s.connection === "connected"} onClick={() => provider.retry()}>
          <RefreshCw className="size-5" aria-hidden /> Reconnect
        </BigButton>
      )}
    </Page>
  )
}

const PERMISSION_LABELS: Record<Permission, string> = {
  LYRICS: "Lyrics",
  BIBLE: "Bible",
  PRESENTATION: "Presentation",
  SERVICE: "Service",
  SCENES: "Scenes",
  CAMERAS: "Cameras",
  MEDIA: "Media",
  PREVIEW: "Preview",
  TAKE: "TAKE",
  BLACK_PROJECTOR: "Black Projector",
  STREAM_MONITOR: "Stream Status",
  RECORDING_MONITOR: "Recording Status",
}

export function DevicePage() {
  const { provider } = useRemote()
  const s = useRemoteSnapshot()
  return (
    <Page>
      <PageTitle>Device Information</PageTitle>
      <Card className="flex flex-col gap-2 p-4 text-sm">
        <p><span className="text-muted-foreground">Device: </span><span className="font-semibold">{s.deviceName}</span></p>
        <p><span className="text-muted-foreground">Connected as: </span><span className="font-semibold uppercase">{s.role} Remote</span></p>
        <p className="text-muted-foreground">Allowed by the desktop:</p>
        <ul className="flex flex-wrap gap-1.5">
          {s.permissions.length === 0 && <li className="text-muted-foreground">Nothing yet</li>}
          {s.permissions.map((p) => <li key={p}><Badge kind="neutral">{PERMISSION_LABELS[p]}</Badge></li>)}
        </ul>
      </Card>
      {provider instanceof MockRemoteProvider && (
        <>
          <PageTitle>Demo: try a role</PageTitle>
          <div className="grid grid-cols-2 gap-2">
            {Object.keys(DEMO_ROLES).map((role) => (
              <BigButton key={role} className={s.role === role ? "h-12 bg-accent-brand text-sm text-white hover:bg-accent-brand/90" : "h-12 text-sm"} onClick={() => provider.setRole(role)}>{role}</BigButton>
            ))}
          </div>
          <BigButton className="h-14 w-full" onClick={() => { sessionStorage.removeItem("jamc.remote.demo"); window.location.assign("/") }}>Exit Demo Mode</BigButton>
        </>
      )}
    </Page>
  )
}
