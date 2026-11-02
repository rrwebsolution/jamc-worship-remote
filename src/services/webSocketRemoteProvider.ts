import {
  clearPairingFromAddressBar,
  forgetDeviceToken,
  savedDeviceName,
  savePaired,
  webSocketUrl,
  type PairingInfo,
} from "@/services/pairingService"
import { RemoteSocketService } from "@/services/remoteSocket"

/** The real desktop. */
export function createWebSocketProvider({ server, deviceToken, pairingToken }: PairingInfo): RemoteSocketService {
  return new RemoteSocketService({
    url: webSocketUrl(server, window.location.protocol),
    address: server,
    deviceToken,
    pairingToken,
    deviceName: savedDeviceName(),
    onAccepted: (issued) => {
      savePaired(server, issued)
      clearPairingFromAddressBar()
    },
    onDeviceTokenInvalid: () => forgetDeviceToken(server),
  })
}
