import { useState } from "react"
import { Ban, Hourglass, Lock, QrCode, RefreshCw, Unplug, WifiOff } from "lucide-react"
import { BigButton, EmptyState } from "@/components/common/ui"
import { AppHeader, Shell } from "@/layouts/MobileRemoteLayout"
import { useRemote, useRemoteSnapshot } from "@/hooks/useRemoteState"
import { chooseServer, isValidServer } from "@/services/pairingService"
import type { ConnectionState } from "@/types/remote"

function ChangeAddress({ current, onCancel }: { current: string | null; onCancel: () => void }) {
  const [value, setValue] = useState(current ?? "")
  const valid = isValidServer(value.trim())
  return (
    <form
      className="flex flex-col gap-2 text-left"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) {
          chooseServer(value.trim())
          window.location.reload()
        }
      }}
    >
      <label htmlFor="address" className="text-sm font-medium">Address from Settings → Remote Control</label>
      <input
        id="address"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        inputMode="url"
        autoCapitalize="none"
        placeholder="IP address:port"
        className="h-12 rounded-xl border border-input bg-card px-3 text-base outline-none focus-visible:border-accent-brand"
      />
      <BigButton className="h-14 bg-accent-brand text-white hover:bg-accent-brand/90" type="submit" disabled={!valid}>Connect</BigButton>
      <BigButton className="h-14" type="button" onClick={onCancel}>Cancel</BigButton>
    </form>
  )
}

function TryDemo() {
  return (
    <a href="/demo" className="py-2 text-center text-sm font-medium text-muted-foreground underline underline-offset-4">Try Demo Mode</a>
  )
}

/** Everything before the dashboard: connecting, pairing, waiting for approval, and why it stopped. */
export function PairingPage() {
  const { provider } = useRemote()
  const snapshot = useRemoteSnapshot()
  const [changing, setChanging] = useState(false)
  const retry = <BigButton className="h-14" onClick={() => provider.retry()}><RefreshCw className="size-5" aria-hidden />Retry</BigButton>
  const change = <BigButton className="h-14" onClick={() => setChanging(true)}>Change Address</BigButton>

  const body = () => {
    if (changing) {
      return (
        <EmptyState icon={WifiOff} title="Change Address" action={<ChangeAddress current={snapshot.address} onCancel={() => setChanging(false)} />}>
          The Presenter shows its address under Remote Control.
        </EmptyState>
      )
    }
    switch (snapshot.stopReason) {
      case "needs_pairing":
        return <EmptyState icon={QrCode} title="Scan the QR code">This device is not paired, or the code has changed. On the desktop, open Settings → Remote Control and scan the QR code.</EmptyState>
      case "forgotten":
        return <EmptyState icon={QrCode} title="This device was removed">The operator removed this device. To use the remote again, scan the QR code in Settings → Remote Control.</EmptyState>
      case "denied":
        return <EmptyState icon={Ban} title="Request denied">The operator did not allow this device. Ask them, then scan the QR code again.</EmptyState>
      case "new_devices_off":
        return <EmptyState icon={Lock} title="New devices are off" action={retry}>The operator has stopped new devices from joining right now.</EmptyState>
      case "remotes_disabled":
        return <EmptyState icon={Lock} title="Remotes are disabled" action={retry}>The operator has disabled all remotes. The presentation carries on.</EmptyState>
      case "disconnected":
        return <EmptyState icon={Unplug} title="Disconnected by the operator" action={retry}>The operator ended this connection.</EmptyState>
      case "too_many_devices":
        return <EmptyState icon={Ban} title="Too many devices" action={retry}>The desktop has reached its device limit. Ask the operator to forget a device no longer in use.</EmptyState>
      case "busy":
        return <EmptyState icon={Hourglass} title="Too many requests" action={retry}>Several devices are waiting for approval. Try again in a moment.</EmptyState>
      case "unsupported":
        return <EmptyState icon={Ban} title="Update needed">This remote and the desktop app do not match. Update the desktop app.</EmptyState>
    }
    if (snapshot.connection === "waiting_approval") {
      return (
        <EmptyState icon={Hourglass} title="Pairing Request Sent">
          Waiting for approval from LiveCat Multimedia…
        </EmptyState>
      )
    }
    if (snapshot.connection === "reconnecting") {
      return (
        <EmptyState icon={WifiOff} title="Unable to connect" action={<>{retry}{change}<TryDemo /></>}>
          Unable to connect to LiveCat Multimedia at {snapshot.address}. Check that this device is on the same Wi-Fi and the Remote Server is on. Still trying…
        </EmptyState>
      )
    }
    return <EmptyState icon={RefreshCw} title="Connecting">Connecting to LiveCat Multimedia…</EmptyState>
  }

  return (
    <Shell>
      <AppHeader state={snapshot.connection} />
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">{body()}</main>
    </Shell>
  )
}

/** When no address is known at all. */
export function NoServerPage() {
  const [changing, setChanging] = useState(false)
  const state: ConnectionState = "pairing_required"
  return (
    <Shell>
      <AppHeader state={state} />
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {changing ? (
          <EmptyState icon={WifiOff} title="Enter Address" action={<ChangeAddress current={null} onCancel={() => setChanging(false)} />}>
            The Presenter shows its address under Remote Control.
          </EmptyState>
        ) : (
          <EmptyState icon={QrCode} title="Scan the QR code" action={<><BigButton className="h-14" onClick={() => setChanging(true)}>Enter Address</BigButton><TryDemo /></>}>
            On the desktop, open Settings → Remote Control and scan the QR code with this device.
          </EmptyState>
        )}
      </main>
    </Shell>
  )
}
