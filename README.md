# MiFi Manager

A React Native (Expo) app for managing a "4G MIFI" pocket hotspot from your phone instead of the
built-in web page at `http://192.168.100.1`.

It talks to the hotspot's own JSON API, so it only works while the phone is connected to the
hotspot's Wi-Fi.

## Features

**Status**

- **Home**: signal strength, carrier, connection state, battery with an estimate of time
  left, connected-device count, CPU temperature, uptime, WAN IP. Refreshes every 10 seconds
  while open.
- **Quick actions** on Home: share Wi-Fi, signal finder, history, switch SIM, backup, restart.
- **History**: charts of signal, battery, temperature and device count over the last 1, 6 or
  24 hours. Touch and drag to read any point.
- **Signal finder**: a large live signal reading with best, average and worst, for finding
  the best place to put the router.
- **Home-screen widgets** (Android): a 4×2 status widget and a 2×1 signal-and-battery widget.

**Devices**

- **Connected devices** with IP and MAC address, plus devices seen before and when.
- **Known devices**: give a device a name and mark it trusted. A device that has never
  connected before is flagged as new.

**Safety**

- **Security check**: warns about a factory-default or weak Wi-Fi password, an open network,
  older WPA security, and a factory-default admin password, with a shortcut to fix each.
- **Alerts**: notifications for low battery, internet lost or restored, a new device joining,
  overheating and a missing SIM. Each can be switched off, and the battery and temperature
  thresholds are adjustable.
- **Backup and restore**: saves the Wi-Fi, APN, network mode, LAN and connection-check
  settings on the phone, and puts them back in one step after a factory reset. Backups can
  be shared as text and imported again.

**Settings**

- **Wi-Fi hotspot**: turn it on or off, change the name, password, security, channel and
  visibility. **Share Wi-Fi** shows a QR code guests can scan to join.
- **Mobile network**: network mode (auto, 4G only, 3G only), SIM slot, USB tethering.
- **APN**: switch between the stored access points or add a new one.
- **Connection check**: the addresses the router uses to detect a dropped link.
- **LAN & DHCP**: router address, subnet mask, DHCP range and lease time.
- **System**: device info (firmware, IMEI, IMSI, ICCID), change the admin password, restart,
  factory reset.
- **About**: app version, a link to the developer's site, and **Check for updates**, which
  opens this repository's [releases page](https://github.com/nadun-dilshan/mifi-manager/releases).

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

### Alerts and background checks

While the app is open, alerts appear within seconds. With alerts switched on, the app also
checks the router in the background about every 15 minutes. Android decides the exact timing
and may delay checks to save battery. Background checks need Remember me to be on and the
phone to be on the hotspot's Wi-Fi.

History is recorded the same way: about one reading a minute while the app is open, and one
per background check otherwise. Readings are kept on the phone only.

### Known devices

The first time the app sees the device list, everything connected is treated as yours. After
that, a MAC address it has not seen before is marked **New** until you trust it. Many phones
use a random MAC address per network, so one phone can occasionally appear as a new device.
The router has no command to block a device; changing the Wi-Fi password is the way to remove
one.

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

## Releases

Production builds are published on the
[releases page](https://github.com/nadun-dilshan/mifi-manager/releases). In the app,
**Settings → About → Check for updates** opens the same page.

A release is made automatically whenever a pull request is merged into `main`
([.github/workflows/release.yml](.github/workflows/release.yml)):

1. The code is type-checked.
2. The next version number is chosen (see below).
3. Expo builds the production Android app in the cloud (EAS Build) as an APK.
4. A GitHub release tagged `v<version>` is created with `MiFi-Manager-<version>-android.apk`
   attached.
5. If iOS releases are switched on, Expo builds the production iOS app and
   `MiFi-Manager-<version>-ios.ipa` is added to the same release.

### Version numbers

Every release gets the next version automatically: `1.0.0`, then `1.0.1`, `1.0.2` and so on.
The pipeline looks at the releases already published and adds one to the last number.

To start a new series, raise `version` in [app.json](app.json) by hand in a pull request, for
example to `1.1.0` or `2.0.0`. That release uses your number, and later ones continue from it
(`1.1.1`, `1.1.2`, ...).

The version in `app.json` is not rewritten after each release, so it can lag behind the latest
release; the published releases are the record. The rule lives in
[scripts/next-version.mjs](scripts/next-version.mjs).

Pull requests that change only Markdown files do not trigger a release. To release by hand,
or to retry after a failure, open the **Actions** tab, choose **Release**, and press
**Run workflow**.

### One-time setup

The workflow needs an Expo access token.

1. Create a token at <https://expo.dev/settings/access-tokens>.
2. In the GitHub repository, go to **Settings → Secrets and variables → Actions**, add a new
   repository secret named `EXPO_TOKEN`, and paste the token.

### Switching on iOS releases

iOS builds need a paid Apple Developer Program membership.

1. On a Mac, run `npx eas-cli@latest build --platform ios --profile production` once and sign
   in with your Apple ID when asked. EAS creates the distribution certificate and provisioning
   profile and stores them, so later builds need no sign-in.
2. In the GitHub repository, go to **Settings → Secrets and variables → Actions → Variables**
   and add a variable named `IOS_RELEASE` with the value `true`.

The production `.ipa` is signed for the App Store. It cannot be installed by downloading it
from the release; it is there to be submitted to TestFlight or the App Store, for example with
`npx eas-cli@latest submit --platform ios`. Widgets are Android-only.

### Android APK or Play Store bundle

The production profile builds an `.apk` so it can be installed straight from the release. The
Play Store needs an `.aab` instead: remove `"buildType": "apk"` from the production profile in
[eas.json](eas.json) to get one.

## Limitations

- **Phone must be on the hotspot's Wi-Fi.** If the hotspot has no internet and the phone has
  mobile data switched on, Android may send the app's traffic over mobile data instead, and
  the router will look unreachable. Turn mobile data off on the phone in that case.
- **Turning the Wi-Fi hotspot off** from the app disconnects the app too. Turn it back on with
  the router's button or over USB.
- **Firmware upgrade** and **IMEI rewrite** exist in the router's API but are deliberately not
  included: the first can brick the device, and changing an IMEI is illegal in many countries.
- **APNs cannot be deleted**: the router's API has no command for it.
- **No per-device blocking, data-usage counters, SMS or port forwarding**: the router's API
  has no commands for them.
- **Widgets and background checks do not run in Expo Go.** They need an installed build.
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
src/lib/               router client and API commands, plus the logic for alerts,
                       history, known devices, security checks, backups and charts
src/widgets/           home-screen widgets and their background task
```

## Author

Developed by [Nadun Dilshan](https://nadun.me).

## Licence

Released under the [MIT licence](LICENSE).
