# Application shell and navigation

## User-visible behavior

Snaply opens into a three-tab application with Home, Capture, and Archive destinations. Settings and the three post-setup capture screens are presented by the root stack outside the tab navigator.

| Capability | Status | Notes |
| --- | --- | --- |
| Root stack and route composition | `Functional` | Route files are thin Expo Router adapters. |
| Native tab navigation | `Functional` | iOS and Android use `expo-router/unstable-native-tabs`. |
| Web tab navigation | `Functional` | Web uses a custom floating tab bar built with `expo-router/ui`. |
| Native animated splash transition | `Functional` | The system splash is hidden after the overlay lays out, then the overlay fades out. |
| Web splash transition | `Functional` | The overlay intentionally renders nothing on web. |
| Light application theme | `Functional` | The provider always selects `Colors.light`. |
| User-selectable or system dark theme | `Prototype` | Dark tokens exist, but they are not selected by the application provider. |

## Route map

| Route | Presentation | Owner |
| --- | --- | --- |
| `/` | Home tab | `pages/home` |
| `/capture` | Capture tab | `pages/capture-setup` |
| `/archive` | Archive tab | `pages/archive` |
| `/settings` | Root-stack modal | `pages/settings` |
| `/capture/record` | Headerless root-stack screen | `pages/capture-record` |
| `/capture/editing` | Headerless root-stack screen | `pages/capture-editing` |
| `/capture/result` | Headerless root-stack screen | `pages/capture-result` |

`src/app` parses string search parameters where needed and passes them to page components as explicit props. The `src/_app/routes` module owns stack and tab policies; page slices own screen content.

## Composition and ownership

- `src/app/_layout.tsx` exposes `RootLayout` from the `_app` Public API.
- `src/_app/providers/app-providers.tsx` creates the Expo Router navigation theme from Snaply light-theme tokens.
- `src/_app/routes/root-layout.tsx` composes providers, splash behavior, and stack presentations.
- `src/_app/routes/app-tabs.tsx` and `app-tabs.web.tsx` preserve the same export while implementing platform-specific navigation.
- `src/shared/ui/theme` owns colors, spacing, radii, content width, bottom-tab inset, and theme access.

## Known limitations

- The native tab implementation uses an unstable Expo Router API and should be verified when Expo Router changes.
- The configured application style is light-only even though a dark palette is defined.
- The splash animation is native-only.
