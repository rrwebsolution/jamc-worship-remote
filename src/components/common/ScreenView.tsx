import { cn } from "@/lib/utils"

/**
 * The large display: what this device chose, nothing else. The words show at once while a picture is on its way, so a
 * tap never waits. `cleared` empties it, because the words are off the screen.
 */
export function ScreenView({ src, text, cleared, className }: { src?: string; text?: string | null; cleared?: boolean; className?: string }) {
  return (
    <div className={cn("relative aspect-video w-full shrink-0 bg-black", className)}>
      {cleared ? (
        <p className="absolute inset-0 flex items-center justify-center text-sm font-medium text-white/50">Cleared</p>
      ) : src ? (
        <img src={src} alt="On display" className="absolute inset-0 size-full object-contain" />
      ) : (
        <p className="absolute inset-x-3 top-1/2 -translate-y-1/2 text-center text-sm font-bold whitespace-pre-line text-white uppercase">{text}</p>
      )}
    </div>
  )
}
