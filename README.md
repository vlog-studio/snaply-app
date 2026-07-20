# Snaply

Snaply is a short-form daily-vlog app: users pick a mood and a 3- or 5-second duration, record a clip with the camera, review the saved original, and walk through a (currently simulated) AI-editing flow to a result screen. Recordings persist only in the app's local document directory.

Built with Expo SDK 57 (React Native 0.86, expo-router) and organized by Feature-Sliced Design v2.1.

## Getting started

```bash
npm install
npx expo start --go
```

**Do not run `npx expo run:ios` on the current development machine** — Expo SDK 57 needs the Swift 6.2 toolchain and the machine's Xcode 16.4 cannot build it. Use Expo Go on the iOS Simulator and Android emulator instead; see [docs/workflows/local-development-and-testing.md](docs/workflows/local-development-and-testing.md) for the full procedure (boot commands, first-time Expo Go install, EAS Build fallback for native modules).

Web (`expo start --web`) runs but is not the reference runtime; recording is disabled there.

## Project structure

Routes live under `src/app/` as thin adapters; all real code lives in FSD layers:

```text
src/
├── app/        Expo Router route files (thin re-exports / param parsing only)
├── _app/       Providers, root stack, splash, platform tab navigation
├── pages/      Screen composition and screen state (home, capture-*, archive, settings)
├── features/   Reusable user actions (manage-recordings)
├── entities/   Domain models (capture-session)
└── shared/     Design tokens, UI kit, platform adapters (recording-files, secure-storage)
```

## Documentation

[AGENTS.md](AGENTS.md) indexes the task-specific guides. Key entry points:

- [docs/architecture/feature-sliced-design.md](docs/architecture/feature-sliced-design.md) — layer rules for any change under `src/`
- [docs/conventions/module-boundaries.md](docs/conventions/module-boundaries.md) — imports, public APIs, naming
- [docs/features/README.md](docs/features/README.md) — what the product currently does, and the doc-maintenance contract
- [docs/workflows/feature-development.md](docs/workflows/feature-development.md) — implementation workflow and completion checklist

### Developer guides (한국어)

Guides under `docs/guides/` are written in Korean for human developers and are not part of the agent documentation indexed by `AGENTS.md`:

- [docs/guides/android-wireless-debugging.md](docs/guides/android-wireless-debugging.md) — 실제 Android 기기 무선(Wi-Fi) 연동 및 Expo Go 실행 가이드

## Commands

| Command | Purpose |
| --- | --- |
| `npx expo start --go` | Start Metro for Expo Go (default runtime) |
| `npm run web` | Start the web target (not the reference runtime) |
| `npm run lint` | ESLint via `expo lint` |
| `npx tsc --noEmit` | Type check |
