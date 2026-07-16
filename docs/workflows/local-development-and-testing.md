# Local development and testing

Run and verify changes on the **iOS Simulator and the Android emulator**, not the web target. Web (`expo start --web`) is not the reference runtime for this project. On this machine you can run **one iOS simulator and one Android emulator side by side** against a single Metro server.

## Environment

This workflow is defined for the current **macOS development machine**:

- Intel Mac (`x86_64`), macOS 15.7.7, **Xcode 16.4 (Swift 6.1.2)**.
- The machine **cannot install Xcode 26 (Swift 6.2)** because the OS/hardware is too old.
- Expo SDK 57 / React Native 0.86 require the Swift 6.2 toolchain, so a **local native iOS build is not possible** here. Running `npx expo run:ios` fails with:
  `package 'apple' is using Swift tools version 6.2.0 but the installed version is 6.1.0`.

Therefore, do not attempt `expo run:ios` (local native dev build) on this machine. Use **Expo Go** (below) as the default runtime on both platforms. Use **EAS Build** only when a feature depends on native modules that Expo Go does not include.

Tooling already installed on this machine:

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

### Notes when targeting the emulator specifically

- If physical Android devices are also connected over adb, target the emulator explicitly with `-s emulator-5554`; a bare `adb shell` errors with "more than one device".
- The `Pixel_API_35` image is a `default` (no Google Play) x86_64 image, which is correct for this Intel Mac and sufficient for Expo Go.

### Expo Go limitations

Only native modules bundled in Expo Go work, and `expo-dev-client` configuration is ignored. Custom native behavior (e.g. `expo-camera` config-plugin options, `expo-glass-effect`) may differ from a real build or be unavailable. When a feature depends on such modules, verify it with EAS Build instead.

Known Expo Go pitfall confirmed in this project: Reanimated `entering` presets (`FadeInDown`, `ZoomIn`, …) never start on iOS in Expo Go, leaving those views stuck at opacity 0 (Android runs them fine). Use the shared `FadeInView` (`src/shared/ui/fade-in-view`), which animates a shared value on mount and works on both platforms. Exception: the splash overlay (`src/_app/routes/animated-splash-overlay.tsx`) uses a custom `Keyframe` entering animation whose completion callback unmounts the overlay; this has worked where the presets do not, but re-verify splash dismissal on the iOS simulator whenever that file or Reanimated changes, because a non-starting animation there would leave the splash stuck on screen.

## Full native verification — EAS Build (cloud dev build)

When Expo Go is insufficient, build a simulator/emulator dev client in the cloud (Expo's servers have Xcode 26), install the result on the local device, and connect Metro with `npx expo start --dev-client`. This exercises all native modules regardless of the local Xcode version. It requires a free Expo account; `eas login` must be performed by the user (account authentication).

## Notes

- `ios/` and `android/` are git-ignored (managed workflow). A `prebuild` may generate `ios/`; do not commit it.
- To stop: Metro — free port 8081 (`lsof -ti :8081 | xargs kill`); Android — `adb -s emulator-5554 emu kill`; iOS — `xcrun simctl shutdown "iPhone 16"`.
