import { useState } from "react"

/**
 * What this device last chose, so its display changes the moment it is tapped and follows nothing the desktop does.
 * It starts at `start`, and again whenever `key` says the list itself changed: another song or presentation.
 */
export function useCursor(key: string, start: number): [number, (index: number) => void] {
  const [state, setState] = useState({ key, index: start })
  if (state.key !== key) {
    setState({ key, index: start })
    return [start, (index) => setState({ key, index })]
  }
  return [state.index, (index) => setState({ key, index })]
}
