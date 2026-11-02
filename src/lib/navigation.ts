import {
  Activity,
  Camera,
  Cast,
  CircleEllipsis,
  Film,
  Info,
  Layers,
  ListOrdered,
  type LucideIcon,
  Monitor,
  Music,
  Presentation,
  SlidersHorizontal,
  Video,
  Wifi,
} from "lucide-react"
import type { Permission } from "@/types/remote"

export interface NavItem {
  path: string
  title: string
  icon: LucideIcon
  /** Any one of these shows it; empty = every device. */
  anyOf: Permission[]
}

/** Bottom navigation. A device only sees what it may use. */
export const PRIMARY: NavItem[] = [
  { path: "/control", title: "Control", icon: SlidersHorizontal, anyOf: ["PREVIEW", "TAKE", "BLACK_PROJECTOR"] },
  { path: "/service", title: "Service", icon: ListOrdered, anyOf: ["SERVICE"] },
  { path: "/lyrics", title: "Lyrics", icon: Music, anyOf: ["LYRICS", "BIBLE"] },
  { path: "/media", title: "Media", icon: Film, anyOf: ["MEDIA"] },
]

export const MORE_PAGE: NavItem = { path: "/more", title: "More", icon: CircleEllipsis, anyOf: [] }

/** Inside More. */
export const SECONDARY: NavItem[] = [
  { path: "/scenes", title: "Scenes", icon: Layers, anyOf: ["SCENES"] },
  { path: "/cameras", title: "Cameras", icon: Camera, anyOf: ["CAMERAS"] },
  { path: "/presentation", title: "Presentation", icon: Presentation, anyOf: ["PRESENTATION"] },
  { path: "/pastor", title: "Pastor Remote", icon: Cast, anyOf: ["PRESENTATION"] },
  { path: "/camera-control", title: "Camera Control", icon: Video, anyOf: ["CAMERAS"] },
  { path: "/monitor", title: "Monitor", icon: Activity, anyOf: ["STREAM_MONITOR", "RECORDING_MONITOR"] },
  { path: "/connection", title: "Connection", icon: Wifi, anyOf: [] },
  { path: "/device", title: "Device Information", icon: Info, anyOf: [] },
]

export const MONITOR_ICON = Monitor

export function allowed(item: Pick<NavItem, "anyOf">, permissions: Permission[]): boolean {
  return item.anyOf.length === 0 || item.anyOf.some((p) => permissions.includes(p))
}

/** Where to land, or to fall back to when a permission is taken away. */
export function firstPermittedPath(permissions: Permission[]): string {
  const page = [...PRIMARY, ...SECONDARY.filter((s) => s.anyOf.length > 0)].find((item) => allowed(item, permissions))
  return page?.path ?? "/device"
}

/** The rule for one route path, or null when it has none. */
export function ruleFor(path: string): NavItem | null {
  return [...PRIMARY, ...SECONDARY, MORE_PAGE].find((item) => item.path === path) ?? null
}
