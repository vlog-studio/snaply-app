# Local development and testing

Run and verify changes on the **iOS Simulator**, not the web target. Web (`expo start --web`) is not the reference runtime for this project.

## Environment

This workflow is defined for the current **macOS development machine**:

- Intel Mac, macOS 15.7.7, **Xcode 16.4 (Swift 6.1.2)**.
- The machine **cannot install Xcode 26 (Swift 6.2)** because the OS/hardware is too old.
- Expo SDK 57 / React Native 0.86 require the Swift 6.2 toolchain, so a **local native build is not possible** here. Running `npx expo run:ios` fails with:
  `package 'apple' is using Swift tools version 6.2.0 but the installed version is 6.1.0`.

Therefore, do not attempt `expo run:ios` (local native dev build) on this machine. Use **Expo Go** (below) as the default runtime. Use **EAS Build** only when a feature depends on native modules that Expo Go does not include.

Tooling already installed on this machine: Xcode 16.4 + iOS 18.6 simulators, CocoaPods 1.17.0 (via Homebrew), Expo CLI 57.x.

## Default procedure — Expo Go on the iOS Simulator

Use this after any change to verify behavior:

```bash
# 1. Boot a simulator
xcrun simctl boot "iPhone 16"; open -a Simulator

# 2. Start Metro in Expo Go mode
npx expo start --go

# 3. First launch only: install the cached Expo Go and open the app
xcrun simctl install "iPhone 16" ~/.expo/ios-simulator-app-cache/Expo-Go-57.0.4.tar.app
xcrun simctl openurl "iPhone 16" "exp://127.0.0.1:8081"
```

After the first launch, Expo Go stays installed on the simulator: run `npx expo start --go` and reopen the app (or press `i` in the Metro terminal, which automates step 3). Code changes hot-reload via Fast Refresh; use `Cmd+R` in the simulator to reload manually and `Ctrl+D` for the developer menu.

To confirm a change actually rendered, capture the simulator screen:

```bash
xcrun simctl io "iPhone 16" screenshot /tmp/sim.png
```

### Expo Go limitations

Only native modules bundled in Expo Go work, and `expo-dev-client` configuration is ignored. Custom native behavior (e.g. `expo-camera` config-plugin options, `expo-glass-effect`) may differ from a real build or be unavailable. When a feature depends on such modules, verify it with EAS Build instead.

## Full native verification — EAS Build (cloud dev build)

When Expo Go is insufficient, build a simulator dev client in the cloud (Expo's servers have Xcode 26), install the result on the local simulator, and connect Metro with `npx expo start --dev-client`. This exercises all native modules regardless of the local Xcode version. It requires a free Expo account; `eas login` must be performed by the user (account authentication).

## Notes

- `ios/` and `android/` are git-ignored (managed workflow). A `prebuild` may generate `ios/`; do not commit it.
