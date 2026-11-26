# MiFi Manager

A React Native (Expo) app for managing a "4G MIFI" pocket hotspot from your phone instead of the
built-in web page at `http://192.168.100.1`.

It talks to the hotspot's own JSON API, so it only works while the phone is connected to the
hotspot's Wi-Fi.

## Features

- **Home**: signal strength, carrier, connection state, battery, connected-device count, CPU
  temperature, uptime, WAN IP. Refreshes every 10 seconds while open.
- **Devices**: every device connected to the hotspot, with IP and MAC address.
- **Wi-Fi hotspot**: turn it on or off, change the name, password, security, channel and
  visibility.
- **Mobile network**: network mode (auto, 4G only, 3G only), SIM slot, USB tethering.
- **APN**: switch between the stored access points or add a new one.
- **Connection check**: the addresses the router uses to detect a dropped link.
- **LAN & DHCP**: router address, subnet mask, DHCP range and lease time.
- **System**: device info (firmware, IMEI, IMSI, ICCID), change the admin password, restart,
  factory reset.
- **Home-screen widgets** (Android): a 4×2 status widget and a 2×1 signal-and-battery widget.

Light and dark themes follow the phone's setting.

### Signing in

With **Remember me** on, the username and password are stored encrypted on the phone
(Android Keystore via `expo-secure-store`). The app then signs in by itself, including when the
router's session expires, and only asks again if the router rejects the saved password. Being
out of range of the hotspot does not clear the saved login.

With Remember me off, the password is kept only until the app is closed.

**Sign out** forgets the saved password.

### Widgets

Long-press the home screen, choose **Widgets**, and look for **MiFi Manager**.

Widgets refresh when the app is open, when you tap their refresh control, and on Android's
own schedule, which is at most once every 30 minutes. They need Remember me to be on, because
they sign in with the saved login in the background.

## Build and install (Android)

Requirements: Node 20 or newer, JDK 17, and the Android SDK (`ANDROID_HOME` set).

```bash
npm install
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

The APK is written to `android/app/build/outputs/apk/release/app-release.apk`. Copy it to the
phone and open it, or install over USB with `adb install -r <path-to-apk>`.

This build is signed with the debug key, which is fine for installing on your own phone. To
publish it, configure a release keystore first.

For development with live reload: `npx expo run:android`.

## Limitations

- **Phone must be on the hotspot's Wi-Fi.** If the hotspot has no internet and the phone has
  mobile data switched on, Android may send the app's traffic over mobile data instead, and
  the router will look unreachable. Turn mobile data off on the phone in that case.
- **Turning the Wi-Fi hotspot off** from the app disconnects the app too. Turn it back on with
  the router's button or over USB.
- **Firmware upgrade** and **IMEI rewrite** exist in the router's API but are deliberately not
  included: the first can brick the device, and changing an IMEI is illegal in many countries.
- **APNs cannot be deleted**: the router's API has no command for it.
- The API was worked out from firmware `HMIFI_X8S1U1W1_CM_V01_0727`. Other firmware versions
  may differ.
- The router's web server handles one request at a time and locks up under bursts, so the app
  sends requests strictly one after another.

## How the router API works

Every call is a `POST http://<router>/himiapi/json` with a JSON body:

```json
{ "cmdid": "getallstatus", "sessionId": "<session>" }
```

The session token comes from `{"cmdid": "login", "username": "...", "password": "..."}` and is
also sent in the `Authorization` header. Replies carry `"reply": "ok"` on success,
`"SessionOut"` when the session is missing or expired, and `"error"` when the router refuses.

The client lives in [src/lib/client.ts](src/lib/client.ts) and the typed commands in
[src/lib/api.ts](src/lib/api.ts).

## Project layout

```
index.ts               entry: registers the widget task, then starts the router
src/app/               screens (Expo Router)
src/components/        shared UI
src/context/auth.tsx   sign-in state
src/hooks/             data loading, form drafts, actions
src/lib/               router client, API commands, formatting, widget snapshot
src/widgets/           home-screen widgets and their background task
```
