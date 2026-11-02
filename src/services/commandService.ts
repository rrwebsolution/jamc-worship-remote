import type { RemoteDataProvider } from "@/services/remoteProvider"
import type { CommandName, CommandResult, Permission } from "@/types/remote"

/**
 * What each command needs. Only so the screens can hide what cannot work: the desktop checks every command itself
 * (RemoteCommand.java), and that check is the one that counts.
 */
const REQUIRED: Record<CommandName, Permission[]> = {
  TAKE: ["TAKE"],
  SET_SCENE_PREVIEW: ["SCENES", "PREVIEW"],
  SET_CAMERA_PREVIEW: ["CAMERAS", "PREVIEW"],
  PRESENTATION_FIRST: ["PRESENTATION"],
  PRESENTATION_PREVIOUS: ["PRESENTATION"],
  PRESENTATION_NEXT: ["PRESENTATION"],
  PRESENTATION_LAST: ["PRESENTATION"],
  PRESENTATION_SELECT: ["PRESENTATION"],
  LYRICS_PREVIOUS: ["LYRICS"],
  LYRICS_NEXT: ["LYRICS"],
  LYRICS_SELECT: ["LYRICS"],
  LYRICS_CLEAR: ["LYRICS"],
  BIBLE_CLEAR: ["BIBLE"],
  PRESENTATION_CLEAR: ["PRESENTATION"],
  MEDIA_CLEAR: ["MEDIA"],
  BIBLE_PREVIOUS: ["BIBLE"],
  BIBLE_NEXT: ["BIBLE"],
  BIBLE_SELECT: ["BIBLE"],
  SET_SERVICE_PREVIEW: ["SERVICE", "PREVIEW"],
  OPEN_SONG: ["LYRICS"],
  OPEN_BIBLE: ["BIBLE"],
  OPEN_PRESENTATION: ["PRESENTATION"],
  OPEN_MEDIA: ["MEDIA"],
  OPEN_SERVICE: ["SERVICE"],
  BLACK_PROJECTOR: ["BLACK_PROJECTOR"],
  RESTORE_PROJECTOR: ["BLACK_PROJECTOR"],
  MEDIA_PLAY: ["MEDIA"],
  MEDIA_PAUSE: ["MEDIA"],
  MEDIA_STOP: ["MEDIA"],
  MEDIA_SEEK: ["MEDIA"],
  MEDIA_MUTE: ["MEDIA"],
  MEDIA_SET_VOLUME: ["MEDIA"],
  MEDIA_SET_LOOP: ["MEDIA"],
}

export function commandPermissions(command: CommandName): Permission[] {
  return REQUIRED[command]
}

export function mayRun(command: CommandName, permissions: Permission[]): boolean {
  return REQUIRED[command].every((p) => permissions.includes(p))
}

const MESSAGES: Record<string, string> = {
  not_connected: "Not connected. Nothing was sent.",
  timeout: "The desktop did not answer. It may not have happened.",
  no_permission: "This device is not allowed to do that.",
  locked: "Remote commands are locked on the desktop.",
  stale: "This changed on the desktop. Check it and try again.",
  nothing_in_preview: "Nothing in Preview to take.",
  scene_unavailable: "That scene is no longer available.",
  camera_unavailable: "That camera is not available.",
  no_camera_scene: "The desktop has no scene with a camera.",
  no_presentation: "No presentation is open on the desktop.",
  no_song: "No lyrics are open on the desktop.",
  no_passage: "No Bible passage is open on the desktop.",
  no_media: "Nothing is playing on Program.",
  nothing_to_clear: "There are no words on Program to clear.",
  auto_take_on: "Auto-take is on at the desktop, so this would go live. Ask the operator.",
  desktop_editing: "The operator is on the Scenes page. Try again in a moment.",
  not_supported: "The desktop does not support this yet.",
  failed: "The desktop could not do that. Try again.",
}

export function commandMessage(code: string | null): string {
  return (code && MESSAGES[code]) || "That did not work. Try again."
}

/** The screens' way to ask the desktop for something, so they never touch raw messages. */
export function createCommandService(provider: RemoteDataProvider) {
  const send = (command: CommandName, payload?: Record<string, unknown>): Promise<CommandResult> => provider.send(command, payload)
  return {
    send,
    take: () => send("TAKE"),
    blackProjector: () => send("BLACK_PROJECTOR"),
    restoreProjector: () => send("RESTORE_PROJECTOR"),
    scenePreview: (id: number) => send("SET_SCENE_PREVIEW", { id }),
    cameraPreview: (id: string) => send("SET_CAMERA_PREVIEW", { id }),
    servicePreview: (index: number) => send("SET_SERVICE_PREVIEW", { index }),
  }
}

export type CommandService = ReturnType<typeof createCommandService>
