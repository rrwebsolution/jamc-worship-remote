# LiveCat Remote

Remote Control for LiveCat Multimedia: a browser remote for phones, tablets and computers on the same Wi-Fi or LAN.
React, Vite, TypeScript, Tailwind CSS. No cloud and no internet needed. All rendering and streaming stay on the Windows
PC; this only controls it.

## Use it in church

In the Presenter: Settings → Remote Control → turn it ON, scan the QR code, then allow the device on the PC. The
Presenter serves this app itself, so nothing else is installed on the church computer.

Update the copy inside the Presenter after changing this app:

```
npm run build:presenter
```

That builds `dist/` and copies it to the Presenter's `src/main/resources/remote-app`.

## Develop

```
npm install
npm run dev
```

- Demo Mode (no Presenter needed): open `/demo`. Device Information lets you try each role.
- Against a real Presenter: copy `.env.example` to `.env` and set `VITE_REMOTE_WS_URL`, or open
  `/pair?server=<pc>:8080&token=<token>`. The Presenter accepts connections from port 5173 on its own address.

Scripts: `npm run dev` · `npm test` · `npm run lint` · `npm run build` · `npm run build:presenter`

## How it connects

1. The QR code opens `http://<pc>:8080/pair?token=<pairing token>`.
2. The app derives `ws://<pc>:8080/ws` from the page's own address and sends `hello` with the token. It never invents an IP.
3. The device waits (`pending`) until the operator allows it on the PC.
4. `welcome` brings this device's own token and permissions. The token is saved for that server only, and the pairing
   token leaves the address bar.
5. Later visits connect with the saved token.

The messages are described in the Presenter's `RemoteServer.java` and typed in `src/types/remote.ts`.

## Rules the code keeps

- **The desktop is the source of truth.** A press sends a command; the screen changes when the desktop's new state
  arrives. Nothing is shown as done before that.
- **Permissions are enforced on the desktop.** Hiding a button here is only convenience: the server refuses any command
  a device may not run, and does not send it state it may not see.
- **What a remote does appears in the real Preview and Program**, because commands take the operator's own paths. Every
  remote shows both monitors, and every remote hears what any other did.
- **A tap acts at once, like a click on the desktop.** Lyrics and Bible cards, scenes, cameras and service items have no
  second "send" step. Lyrics and Bible cards follow the desktop's "click = live" setting on every device, so with it on,
  Preview and Program change together. A Bible chapter opens as one card per verse, with all of them in view. Everything
  else reaches Program only with TAKE (presentations: LIVE CONTROL).
- **A device does not wait for the operator.** With nothing open, it chooses from the library its role allows: songs,
  Bible, presentations, media, services. What is saved in the open service comes first, so a large library is no burden. Opening never goes live by itself. The desktop follows to that category, because
  it has one slide strip.
- **No scene editing, settings or keys here.** There are no commands for them. Scenes come from the saved list, and the
  Scene Editor's draft is never touched.

## Adding a module

1. Add the page under `src/pages/` and its route in `src/App.tsx`.
2. Add it to `src/lib/navigation.ts` with the permission it needs.
3. Add its state slice and commands to `src/types/remote.ts` and `src/services/commandService.ts`.
4. Add the same to `MockRemoteProvider`, so Demo Mode keeps working.
5. In the Presenter: `RemoteCommand`, `RemoteServer.SLICES` and the desk in `MainFrame`.

## Project layout

- `src/types/` messages and state
- `src/services/` `RemoteDataProvider` with its two implementations (`remoteSocket` + `webSocketRemoteProvider`, and
  `mockRemoteProvider`), `commandService`, `pairingService`. No React in them.
- `src/store/`, `src/hooks/` connecting React to the provider
- `src/layouts/`, `src/pages/`, `src/components/` the screens, which do not know which provider is in use
