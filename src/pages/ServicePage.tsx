import { useState } from "react"
import { Check, Library } from "lucide-react"
import { TakeButton } from "@/components/common/TakeButton"
import { Badge, BigButton, Page, PageTitle, Skeleton } from "@/components/common/ui"
import { ServicePicker } from "@/components/library/LibraryPickers"
import { useCommand, usePermissions, useRemote, useRemoteSnapshot } from "@/hooks/useRemoteState"
import { haptic } from "@/lib/haptics"
import { cn } from "@/lib/utils"

/** The running order. A tap opens the item into Preview at once; Program waits for TAKE. */
export function ServiceList() {
  const { commands } = useRemote()
  const { state } = useRemoteSnapshot()
  const { canControl, has } = usePermissions()
  const { run, busy } = useCommand()
  const [browsing, setBrowsing] = useState(false)
  const service = state.service
  if (service === undefined) {
    return <Skeleton rows={4} />
  }
  if (service === null || service.items.length === 0 || browsing) {
    return <ServicePicker onClose={browsing && service ? () => setBrowsing(false) : undefined} />
  }
  return (
    <>
      <div className="flex shrink-0 items-center justify-between gap-2">
        <PageTitle>{service.name || "Service"}</PageTitle>
        <BigButton className="h-11 px-3 text-sm" onClick={() => setBrowsing(true)}><Library className="size-4" aria-hidden /> Services</BigButton>
      </div>
      <ul className="flex flex-col gap-2">
        {service.items.map((item, i) => (
          <li key={i}>
            <button
              type="button"
              disabled={!has("PREVIEW") || !canControl || busy}
              aria-current={item.status === "CURRENT" ? "step" : undefined}
              onClick={() => {
                haptic()
                void run(() => commands.servicePreview(i))
              }}
              className={cn(
                "flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border-2 bg-card px-3 py-2 text-left touch-manipulation",
                item.status === "CURRENT" ? "border-preview" : "border-border",
                item.status === "DONE" && "opacity-60",
              )}
            >
              <span className="flex min-w-0 items-center gap-2 font-medium">
                {item.status === "DONE" && <Check className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
                <span className="truncate">{item.title}</span>
              </span>
              {item.status === "CURRENT" ? <Badge kind="preview">CURRENT</Badge> : item.status === "DONE" ? <Badge kind="neutral">DONE</Badge> : null}
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

export function ServicePage() {
  return (
    <Page>
      <ServiceList />
      <TakeButton />
    </Page>
  )
}
