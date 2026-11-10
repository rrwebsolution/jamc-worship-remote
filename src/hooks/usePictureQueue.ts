import { useEffect, useRef, useState } from "react"
import { useRemote, useRemoteSnapshot } from "@/hooks/useRemoteState"
import type { QueryName } from "@/types/remote"

/** Several at once, so a long list fills in steadily without flooding the connection. */
const LOADING_AT_ONCE = 4

/** Pictures already fetched this visit. */
const pictures = new Map<string, string>()

export interface PictureRequest {
  /** Unique across everything: a picture with the same key is not fetched twice. */
  key: string
  params: Record<string, unknown>
}

/**
 * The small pictures of a list, fetched one at a time from the desktop, the ones nearest `around` first. Each comes
 * separately because a long list would be many megabytes in one message.
 */
export function usePictureQueue(query: QueryName, requests: PictureRequest[], around: number): (key: string) => string | undefined {
  const { provider } = useRemote()
  const [, redraw] = useState(0)
  const center = useRef(around)
  const list = useRef(requests)
  const signature = requests.map((r) => r.key).join("|")
  // pictures that failed while the connection was lost are fetched again once it is back
  const connected = useRemoteSnapshot().connection === "connected"

  useEffect(() => {
    center.current = around
    list.current = requests
  })

  useEffect(() => {
    if (!connected) {
      return
    }
    let cancelled = false
    const waiting = new Map<number, PictureRequest>()
    list.current.forEach((r, i) => {
      if (!pictures.has(r.key)) {
        waiting.set(i, r)
      }
    })
    const next = () => {
      let best: number | undefined
      for (const i of waiting.keys()) {
        if (best === undefined || Math.abs(i - center.current) < Math.abs(best - center.current)) {
          best = i
        }
      }
      if (best === undefined) {
        return undefined
      }
      const request = waiting.get(best)
      waiting.delete(best)
      return request
    }
    const worker = async () => {
      for (let r = next(); r && !cancelled; r = next()) {
        const result = await provider.query(query, r.params)
        const src = result.ok ? (result.data as { src: string }).src : ""
        if (src) {
          pictures.set(r.key, src) // kept even when the list has moved on: tapping back then needs no second fetch
          if (!cancelled) {
            redraw((v) => v + 1)
          }
        }
      }
    }
    for (let i = 0; i < LOADING_AT_ONCE; i++) {
      void worker()
    }
    return () => {
      cancelled = true
    }
  }, [provider, query, signature, connected])

  return (key) => pictures.get(key)
}
