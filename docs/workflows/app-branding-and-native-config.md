# App branding and native config (icon, name, splash)

How to change app-level branding — the launcher **icon**, the display **name**, and the **splash screen** — and how to make those changes actually appear on a device.

Read this whenever a task touches the app icon, app display name, splash screen, adaptive-icon colors, or any other value that is baked into the native project rather than rendered by React at runtime.

## Mental model: this is a CNG (managed) project

`/ios` and `/android` are **git-ignored generated folders** (see `.gitignore` → "generated native folders"). This project uses Expo **Continuous Native Generation (CNG)**: the native projects are produced from configuration, not hand-edited and not committed.

The **source of truth** is:

- `app.json` — `expo.name`, `expo.icon`, `expo.ios`, `expo.android`, and the `expo-splash-screen` plugin config.
- `assets/` — the image/`.icon` files those fields point to.

Consequences you must internalize:

- **Never edit files under `android/` or `ios/` to change branding.** Those edits are discarded the next time the native project is regenerated. Change `app.json` / `assets/` instead.
- The local `android/` and `ios/` folders can be **stale** — generated before a branding change and never regenerated. When they are stale, the emulator/simulator shows the *old* icon/name even though `app.json` is already correct. This is the single most common symptom (a "the icon didn't change" report).
- Icon, name, and splash are **build-time** resources. They are compiled into the app binary and **cannot be updated over-the-air (OTA)**. Seeing a change requires regenerating native code **and** rebuilding + reinstalling the app.
- **EAS Build re-runs prebuild in the cloud** from `app.json` + `assets/`. So a stale *local* native folder does not affect EAS builds — if the source config is correct, EAS produces the correct app. Regenerating locally only matters for local builds and local verification.

## Where each value lives

| Branding element | Source (edit here) | Generated native output (do not edit) |
| --- | --- | --- |
| Display name | `expo.name` in `app.json` | Android `strings.xml` → `app_name`; iOS `Info.plist` → `CFBundleDisplayName` |
| iOS icon | `expo.ios.icon` → `./assets/expo.icon` (Apple Icon Composer `.icon`) | `ios/<Name>/expo.icon`, `Images.xcassets/AppIcon.appiconset` |
| Android adaptive icon | `expo.android.adaptiveIcon` (`foregroundImage`, `backgroundImage`/`backgroundColor`, `monochromeImage`) | `res/mipmap-*/ic_launcher*.webp`, `res/mipmap-anydpi-v26/ic_launcher.xml` |
| Legacy/base icon | `expo.icon` → `./assets/images/icon.png` | included in generated icon sets |
| Splash screen | `expo-splash-screen` plugin config (`backgroundColor`, `image`, `imageWidth`) | Android `res/drawable-*/splashscreen_logo.png`, `colors.xml`; iOS `SplashScreen.storyboard`, `Images.xcassets` |

## Standard procedure

### 1. Change the source config

Edit `app.json` and/or replace the asset files under `assets/`. Keep asset dimensions consistent with what they replace (e.g. Android adaptive foreground/background are 512×512, `icon.png` is 1024×1024).

Example — the 2026-07-20 rename + logo change:

```jsonc
// app.json → expo
"name": "Snaply",            // was "snaply-app"  → display name only
"slug": "snaply-app",        // leave slug alone (EAS project linkage)
```

Changing `expo.name` also renames the iOS Xcode project folder/target (e.g. `ios/snaplyapp/` → `ios/Snaply/`). The `bundleIdentifier` / `package` are **not** derived from `name` and stay unchanged.

### 2. Regenerate the native project

```bash
# Android
npx expo prebuild --clean --platform android

# iOS (file generation only; safe even where a local iOS *build* is impossible)
npx expo prebuild --clean --platform ios
```

Use `--platform` to regenerate one platform at a time so you don't disturb the other. `--clean` deletes and recreates the native folder — this is the reliable way to pick up branding changes (a non-`--clean` prebuild may not overwrite existing generated resources).

### 3. Rebuild and reinstall (to actually see the change)

Icon/name/splash are build-time, so reinstall is required:

```bash
# Android — see the local development guide; run:android needs the AVD *name*, not the adb serial
npx expo run:android --device Pixel_API_35
```

iOS cannot be built locally on the current machine (Xcode too old — see
[`local-development-and-testing.md`](local-development-and-testing.md)). Verify iOS at the config level, or through an **EAS Build**.

### 4. Verify

- **Android** — open the launcher app drawer and confirm the icon art and the label. Non-interactively:
  ```bash
  adb -s emulator-5554 exec-out screencap -p > drawer.png   # inspect the icon
  adb -s emulator-5554 shell dumpsys package com.anonymous.snaplyapp | grep versionName
  cat android/app/src/main/res/values/strings.xml            # app_name should match expo.name
  ```
- **iOS** — the app icon **cannot be seen locally**: no local native build is possible, and Expo Go renders *its own* icon regardless of this config. Verify by inspection instead:
  ```bash
  /usr/libexec/PlistBuddy -c "Print :CFBundleDisplayName" ios/<Name>/Info.plist   # expect the new name
  diff -rq assets/expo.icon ios/<Name>/expo.icon                                  # expect identical
  ```
  For a real visual check, produce an **EAS Build** and install it on a device/simulator.

## Known pitfalls (all observed on this project)

- **`prebuild --clean` deletes `android/local.properties`.** The next Gradle build then fails with `SDK location not found`. Recreate it (or export `ANDROID_HOME`) before building:
  ```bash
  printf 'sdk.dir=%s/Library/Android/sdk\n' "$HOME" > android/local.properties
  ```
- **Splash config must include an `image`.** The generated `styles.xml` always references `@drawable/splashscreen_logo`. If the `expo-splash-screen` plugin has only a `backgroundColor` and no `image`, a clean prebuild produces no such drawable and the Android build fails resource linking:
  `error: resource drawable/splashscreen_logo ... not found`. This project uses `./assets/images/brand-glyph-white.png` at `imageWidth` 200. (A stale native folder can hide this — an old splash drawable lingers until the first clean prebuild.)
- **`expo run:android --device` wants the AVD name, not the adb serial.** Pass `Pixel_API_35`, not `emulator-5554`; the serial errors with "Could not find device with name". Find the AVD name via `adb -s emulator-5554 emu avd name`.
- **`pod install` is broken locally.** During iOS prebuild the final `pod install` throws `Unicode Normalization not appropriate for ASCII-8BIT` (Homebrew Ruby 4.0.6 + CocoaPods 1.17.0). Native *file* generation completes before that step, so name/icon still update correctly. It is irrelevant here because local iOS builds are already blocked by Xcode and EAS runs its own `pod install`.

## Related

- [`local-development-and-testing.md`](local-development-and-testing.md) — machine constraints, emulator/simulator boot, and why local iOS native builds are not possible here.
- [`feature-development.md`](feature-development.md) — general implementation workflow and completion checklist.
