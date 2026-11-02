import { useEffect, useMemo, useState } from "react"
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom"
import { usePermissions, useRemoteSnapshot } from "@/hooks/useRemoteState"
import { MobileRemoteLayout } from "@/layouts/MobileRemoteLayout"
import { allowed, firstPermittedPath, ruleFor } from "@/lib/navigation"
import { CameraControlPage, CamerasPage } from "@/pages/CamerasPage"
import { ControlPage } from "@/pages/ControlPage"
import { LyricsBiblePage } from "@/pages/LyricsBiblePage"
import { MediaPage } from "@/pages/MediaPage"
import { ConnectionPage, DevicePage, MonitorPage, MorePage } from "@/pages/MorePages"
import { NoServerPage, PairingPage } from "@/pages/PairingPage"
import { PastorPage, PresentationPage } from "@/pages/PresentationPage"
import { ScenesPage } from "@/pages/ScenesPage"
import { ServicePage } from "@/pages/ServicePage"
import { createCommandService } from "@/services/commandService"
import { MockRemoteProvider } from "@/services/mockRemoteProvider"
import { readPairing } from "@/services/pairingService"
import type { RemoteDataProvider } from "@/services/remoteProvider"
import { RemoteSocketService } from "@/services/remoteSocket"
import { createWebSocketProvider } from "@/services/webSocketRemoteProvider"
import { RemoteContext } from "@/store/remoteStore"

const DEMO_KEY = "jamc.remote.demo"

function inDemoMode(): boolean {
  const url = new URL(window.location.href)
  try {
    if (url.pathname === "/demo" || url.searchParams.has("demo")) {
      sessionStorage.setItem(DEMO_KEY, "1")
    }
    return sessionStorage.getItem(DEMO_KEY) === "1"
  } catch {
    return url.pathname === "/demo"
  }
}

function createProvider(): RemoteDataProvider | null {
  if (inDemoMode()) {
    return new MockRemoteProvider()
  }
  const pairing = readPairing({
    url: window.location.href,
    servedByPresenter: import.meta.env.PROD,
    devServer: import.meta.env.VITE_REMOTE_WS_URL,
  })
  return pairing && createWebSocketProvider(pairing)
}

/** Before the dashboard: connecting, pairing, waiting for approval. A lost connection stays on the dashboard, disabled. */
function ConnectionGate() {
  const s = useRemoteSnapshot()
  // without permissions yet (reconnecting after being stopped), pages would all look forbidden and redirect away
  const blocked = s.stopReason !== null || (s.connection !== "connected" && s.permissions.length === 0)
  return blocked ? <PairingPage /> : <Outlet />
}

/** A page this device may not use redirects to the first it may, so removing a permission takes effect at once. */
function PermissionGate() {
  const { permissions } = usePermissions()
  const { pathname } = useLocation()
  const rule = ruleFor(pathname)
  return rule && !allowed(rule, permissions) ? <Navigate to={firstPermittedPath(permissions)} replace /> : <Outlet />
}

function Landing() {
  const { permissions } = usePermissions()
  return <Navigate to={firstPermittedPath(permissions)} replace />
}

export default function App() {
  const [provider] = useState(createProvider)
  const value = useMemo(() => provider && { provider, commands: createCommandService(provider) }, [provider])

  useEffect(() => {
    provider?.start()
    const wake = () => {
      if (document.visibilityState === "visible" && provider instanceof RemoteSocketService) {
        provider.checkNow()
      }
    }
    document.addEventListener("visibilitychange", wake)
    window.addEventListener("online", wake)
    return () => {
      document.removeEventListener("visibilitychange", wake)
      window.removeEventListener("online", wake)
      provider?.stop()
    }
  }, [provider])

  if (!value) {
    return <NoServerPage />
  }
  return (
    <RemoteContext.Provider value={value}>
      <BrowserRouter>
        <Routes>
          <Route element={<ConnectionGate />}>
            <Route element={<MobileRemoteLayout />}>
              <Route element={<PermissionGate />}>
                <Route path="/control" element={<ControlPage />} />
                <Route path="/service" element={<ServicePage />} />
                <Route path="/lyrics" element={<LyricsBiblePage />} />
                <Route path="/media" element={<MediaPage />} />
                <Route path="/more" element={<MorePage />} />
                <Route path="/scenes" element={<ScenesPage />} />
                <Route path="/cameras" element={<CamerasPage />} />
                <Route path="/camera-control" element={<CameraControlPage />} />
                <Route path="/presentation" element={<PresentationPage />} />
                <Route path="/pastor" element={<PastorPage />} />
                <Route path="/monitor" element={<MonitorPage />} />
                <Route path="/connection" element={<ConnectionPage />} />
                <Route path="/device" element={<DevicePage />} />
              </Route>
            </Route>
            <Route path="*" element={<Landing />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </RemoteContext.Provider>
  )
}
