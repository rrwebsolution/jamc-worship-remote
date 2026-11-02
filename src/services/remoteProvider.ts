import type { CommandName, CommandResult, QueryName, RemoteSnapshot } from "@/types/remote"

/**
 * Where the remote's data comes from. The screens only know this interface, so they work the same on the real
 * desktop (WebSocket) and in Demo Mode (mock).
 */
export interface RemoteDataProvider {
  subscribe(listener: () => void): () => void
  getSnapshot(): RemoteSnapshot
  start(): void
  stop(): void
  /** Try now, for the Retry button or the phone coming back. */
  retry(): void
  /** Never rejects: a failure comes back as a result with a code. */
  send(command: CommandName, payload?: Record<string, unknown>): Promise<CommandResult>
  /** Whether this screen shows the monitors, so their heavy pictures are only sent while it does. */
  watchPictures(on: boolean): void
  /** A list from the library. Never rejects; the list is in `data`. */
  query(name: QueryName, params?: Record<string, unknown>): Promise<CommandResult>
}
