/** A short tap where the device supports it; nothing where it does not (iPhone browsers do not). */
export function haptic(ms = 10): void {
  try {
    navigator.vibrate?.(ms)
  } catch {
    // unsupported: no feedback is fine
  }
}

/** Seconds as 3:05 or 1:02:05. */
export function clock(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0")
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`
}
