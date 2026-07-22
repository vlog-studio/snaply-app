# Local development and testing

Run and verify changes on the **iOS Simulator and the Android emulator**, not the web target. Web (`expo start --web`) is not the reference runtime for this project. You can run **one iOS simulator and one Android emulator side by side** against a single Metro server.

## Automated checks

Run the automated quality gates before device or simulator verification:

```bash
npm run lint
npm run typecheck
npm run test:ci
```

Use `npm test` during development for Jest watch mode. Tests use the `jest-expo` preset and should live beside the module they verify so their FSD ownership remains explicit. For what to test and the per-module-kind authoring patterns, see [`writing-unit-tests.md`](writing-unit-tests.md).

Jest and React Native Testing Library validate JavaScript logic and rendered interaction contracts; they do not replace iOS and Android verification for camera, permissions, file-system, animation, or other native behavior.

## Environment and legacy macOS limitation

The project does not prohibit `expo run:ios` on every development machine. The restriction applies only to older macOS machines that cannot install an Xcode version with the Swift 6.2 toolchain required by Expo SDK 57 / React Native 0.86.

- An older Intel Mac (`x86_64`) on macOS 15.7.7 is limited to **Xcode 16.4 (Swift 6.1.2)** and cannot install Xcode 26 (Swift 6.2).
- On that class of machine, a **local native iOS build is not possible**. Running `npx expo run:ios` fails with:
  `package 'apple' is using Swift tools version 6.2.0 but the installed version is 6.1.0`.
- A machine running a current macOS version with an Xcode release that provides Swift 6.2 is not subject to this limitation and may use `expo run:ios`.

On a legacy machine limited to Xcode 16.4, use **Expo Go** (below) as the default runtime on both platforms. Use **EAS Build** when a feature depends on native modules that Expo Go does not include.

The command examples below were validated with this legacy-machine profile. Adjust simulator names, SDK paths, and AVD names for the machine in use:

- iOS: Xcode 16.4 + iOS 18.6 simulators, CocoaPods 1.17.0 (via Homebrew).
- Android: Android SDK at `~/Library/Android/sdk`, Android Studio, JDK 17, system image `system-images;android-35;default;x86_64`, and the AVD **`Pixel_API_35`**.
- Expo CLI 57.x.

## Default procedure — Expo Go on both simulators

One Metro server serves both platforms. Boot the two devices, start Metro once, then open the app on each.

```bash
# --- Boot one iOS simulator + one Android emulator ---
xcrun simctl boot "iPhone 16"; open -a Simulator
~/Library/Android/sdk/emulator/emulator -avd Pixel_API_35 -no-snapshot-save &
# wait until the emulator reports boot complete:
until ~/Library/Android/sdk/platform-tools/adb -s emulator-5554 shell getprop sys.boot_completed 2>/dev/null | grep -q 1; do sleep 3; done

# --- Start Metro once, in Expo Go mode ---
npx expo start --go

# --- Open the app on iOS ---
xcrun simctl openurl "iPhone 16" "exp://127.0.0.1:8081"

# --- Open the app on Android (reverse the port so 127.0.0.1 works, then launch) ---
~/Library/Android/sdk/platform-tools/adb -s emulator-5554 reverse tcp:8081 tcp:8081
~/Library/Android/sdk/platform-tools/adb -s emulator-5554 shell am start \
  -a android.intent.action.VIEW -d "exp://127.0.0.1:8081" host.exp.exponent
```

Normally, pressing `i` (iOS) and `a` (Android) in the Metro terminal automates opening on each booted device. The explicit commands above are the non-interactive equivalents.

### First-time Expo Go install

Expo Go must be present on each device before the app can open. It only needs installing once per device.

- **iOS** (uses the CLI's cached client):
  ```bash
  xcrun simctl install "iPhone 16" ~/.expo/ios-simulator-app-cache/Expo-Go-57.0.4.tar.app
  ```
- **Android** (download the SDK-matched APK from `androidClientUrl`, then install):
  ```bash
  # androidClientUrl comes from: curl -s https://api.expo.dev/v2/versions | ... sdkVersions["57.0.0"].androidClientUrl
  curl -sL -o /tmp/ExpoGo.apk "https://github.com/expo/expo-go-releases/releases/download/Expo-Go-57.0.2/Expo-Go-57.0.2.apk"
  ~/Library/Android/sdk/platform-tools/adb -s emulator-5554 install -r /tmp/ExpoGo.apk
  ```

After install, Expo Go stays on each device across sessions; just re-run `npx expo start --go` and reopen the app.

### Reload, dev menu, screenshots

- Code changes hot-reload via Fast Refresh.
- iOS reload: `Cmd+R`; dev menu: `Ctrl+D`. Android reload: `R` `R`; dev menu: `Cmd+M`.
- Capture screens to confirm a change rendered:
  ```bash
  xcrun simctl io "iPhone 16" screenshot /tmp/ios.png
  ~/Library/Android/sdk/platform-tools/adb -s emulator-5554 exec-out screencap -p > /tmp/android.png
  ```

### iOS Simulator touch automation — idb

`xcrun simctl` cannot inject touches. For automated taps/swipes on the iOS Simulator, this machine has [idb](https://fbidb.io) set up (screen-coordinate tools like `cliclick` proved unreliable for in-app taps):

- `idb-companion` is installed via Homebrew (`brew install facebook/fb/idb-companion`).
- The `fb-idb` Python client lives in a dedicated venv at `~/.venvs/fb-idb` because it is incompatible with the system Python 3.14 out of the box — `idb/cli/main.py` in that venv is patched to replace `asyncio.get_event_loop()` with `asyncio.new_event_loop()`. Recreating the venv requires re-applying that one-line patch.

```bash
IDB=~/.venvs/fb-idb/bin/idb
$IDB list-targets                                   # find the booted simulator UDID
$IDB ui tap 285 723 --udid <UDID>                   # coordinates in device points (iPhone 16: 393x852)
$IDB ui swipe 200 600 200 300 --udid <UDID>         # scroll
$IDB ui text "hello" --udid <UDID>                  # type into the focused field
```

Verify each interaction with `xcrun simctl io "iPhone 16" screenshot <path>`. To bypass permission dialogs during automation, grant them directly: `xcrun simctl privacy booted grant camera host.exp.Exponent` (same for `microphone`).

### Notes when targeting the emulator specifically

- If physical Android devices are also connected over adb, target the emulator explicitly with `-s emulator-5554`; a bare `adb shell` errors with "more than one device".
- The `Pixel_API_35` image is a `default` (no Google Play) x86_64 image, which is correct for this Intel Mac and sufficient for Expo Go.

### Expo Go limitations

Only native modules bundled in Expo Go work, and `expo-dev-client` configuration is ignored. Custom native behavior (e.g. `expo-camera` config-plugin options, `expo-glass-effect`) may differ from a real build or be unavailable. When a feature depends on such modules, verify it with EAS Build instead.

Known Expo Go pitfall confirmed in this project: Reanimated `entering` presets (`FadeInDown`, `ZoomIn`, …) never start on iOS in Expo Go, leaving those views stuck at opacity 0 (Android runs them fine). Use the shared `FadeInView` (`src/shared/ui/fade-in-view`), which animates a shared value on mount and works on both platforms. Exception: the splash overlay (`src/_app/routes/animated-splash-overlay.tsx`) uses a custom `Keyframe` entering animation whose completion callback unmounts the overlay; this has worked where the presets do not, but re-verify splash dismissal on the iOS simulator whenever that file or Reanimated changes, because a non-starting animation there would leave the splash stuck on screen.

## Standalone install on a physical Android device — release variant

`npm run android:device:release` (`scripts/install-android-release.sh`) builds the release APK with Gradle (`gradlew app:assembleRelease`), then installs and launches it on the connected physical device via adb. The JS bundle is embedded in the APK, so the app runs standalone without Metro — use this to hand a device a self-contained build or to verify near-production behavior. The Expo prebuild template signs release builds with the debug keystore, so no signing setup is needed, and it overwrites an installed debug build in place. With multiple devices connected, set `ANDROID_SERIAL` to the adb serial of the target.

The script deliberately does **not** use `expo run:android --variant release`: on this machine the expo-driven release build repeatedly fails in `:app:mergeReleaseResources` with corrupted incremental state (`merged.dir/values*.xml (No such file or directory)`), while a direct Gradle build succeeds. The script also clears that incremental state and retries once if the build fails, and recreates `android/local.properties` / runs `expo prebuild` when the generated `android/` folder is missing.

Release builds need more Gradle daemon memory than the template default (`-Xmx2048m -XX:MaxMetaspaceSize=512m`): `lintVitalAnalyzeRelease` fails with a Metaspace OOM. The local config plugin `plugins/with-gradle-jvmargs.js` (registered in `app.json`) raises this to `-Xmx4096m -XX:MaxMetaspaceSize=1024m` via `withGradleProperties`, so the fix survives `prebuild --clean`. Do not hand-edit `android/gradle.properties` for this; change the plugin.

## Full native verification — EAS Build (cloud dev build)

When Expo Go is insufficient, build a simulator/emulator dev client in the cloud (Expo's servers have Xcode 26), install the result on the local device, and connect Metro with `npx expo start --dev-client`. This exercises all native modules regardless of the local Xcode version. It requires a free Expo account; `eas login` must be performed by the user (account authentication).

## Notes

- `ios/` and `android/` are git-ignored (managed workflow). A `prebuild` may generate `ios/`; do not commit it.
- To stop: Metro — free port 8081 (`lsof -ti :8081 | xargs kill`); Android — `adb -s emulator-5554 emu kill`; iOS — `xcrun simctl shutdown "iPhone 16"`.
