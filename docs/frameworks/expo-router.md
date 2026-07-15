# Expo Router v57 with FSD

## Project decision

This project uses Expo SDK 57 and Expo Router `~57.0.4`. Expo Router's `src/app` is a framework route adapter, not the FSD App layer. Application-wide composition belongs in `src/_app`, and screen implementations belong in `src/pages`.

```text
src/app/        # Route files scanned by Expo
src/_app/       # Providers, root-layout implementation, and app initialization
src/pages/      # Screen slices
```

The Expo Router documentation states that files under `src/app` are treated as routes and that non-navigation code belongs outside it. The documentation also strongly discourages customizing the Router root directory, so this project keeps the standard root.

## Route files are thin adapters

A route file is responsible only for:

- Connecting a URL or route filename to a page slice
- Providing the default export required by Expo Router
- Re-exporting route-level static configuration when necessary
- Performing a minimal conversion from route parameters to explicit page props

```ts
// src/app/index.tsx
export { HomePage as default } from '@/pages/home';
```

```ts
// src/app/photo/[photoId].tsx
import { useLocalSearchParams } from 'expo-router';

import { PhotoDetailPage } from '@/pages/photo-detail';

export default function PhotoDetailRoute() {
  const { photoId } = useLocalSearchParams<{ photoId: string }>();
  return <PhotoDetailPage photoId={photoId} />;
}
```

Using a hook in a route adapter, as in the second example, is allowed when its purpose is parameter conversion. Move data fetching, validation, state, and UI into the page or a lower layer.

## Root layout and providers

`src/app/_layout.tsx` must exist because it is the Expo Router entry point, but its implementation comes from `_app`.

```ts
// src/app/_layout.tsx
export { RootLayout as default } from '@/_app/routes';
```

```text
src/_app/
├── providers/
│   ├── app-providers.tsx
│   └── index.ts
└── routes/
    ├── root-layout.tsx
    └── index.ts
```

- Put theme, QueryClient, error boundaries, and splash initialization in `_app/providers` or `_app/routes`.
- If provider order matters, compose it in one `app-providers.tsx`.
- Features and pages must not register global providers.
- Keep nested `_layout.tsx` files focused on route structure. Move reusable navigation UI to widgets or shared.

## Navigation ownership

| Concern | Location |
| --- | --- |
| Route filenames, route groups, and `_layout.tsx` | `src/app` |
| Root navigator composition and global auth routing policy | `src/_app/routes` |
| Href constants and parameter builders or parsers | `src/shared/routes` |
| Navigation after a specific user action | The relevant `feature/model` or calling page |
| Screen UI and screen-level loading or error states | `src/pages/<page>` |

Consult the SDK 57 documentation when a React Navigation API is needed. Since SDK 56, application code cannot import directly from external `@react-navigation/*` packages. Import the corresponding APIs from `expo-router`.

## Route groups and FSD are different concepts

Expo Router groups such as `(tabs)` and `(auth)` organize the URL or navigation tree. They are not FSD slices or business-domain boundaries.

```text
src/app/(tabs)/feed.tsx          # Route group
src/pages/feed/index.ts          # Page slice
src/features/sign-in/index.ts    # Feature slice
```

Do not place authentication logic under `(auth)`. Keep only routes and layouts in a route group. Put the sign-in action in a feature, the session concept in an entity, and global access control composition in `_app/routes`.

## Deep links and typed routes

This project enables `typedRoutes: true` in `app.json`.

- Prefer Expo Router's typed `Href` and static pathnames for navigation targets.
- Do not trust parsed URL parameters; validate them at the page or model boundary.
- Do not scatter raw URL strings through business code. Put reused builders in `shared/routes`.
- Do not use route names as business entity identifiers.

## Platform-specific code

- Keep `.ios.tsx`, `.android.tsx`, `.native.tsx`, and `.web.tsx` UI variants in the same slice as the module they implement.
- Generic connections to Expo SDK packages such as Camera, Location, or Notifications may be wrapped in narrow `shared/lib` adapters.
- Product actions that use those adapters belong in a feature or page. For example, a camera-permission adapter may be shared, while the photo-capture flow may belong in `features/capture-photo`.
- Platform files must preserve the same Public API contract.

## Asset placement

- Keep build assets referenced directly by `app.json`, such as icons, splash images, and adaptive icons, under the root `assets` directory.
- Keep an asset rendered by only one slice close to that slice.
- Put runtime assets reused by multiple slices in `shared/assets`.
- When Metro requires a static `require()`, use a literal path that it can analyze.

## Checks before writing Expo code

1. Confirm the package version and API in the [Expo SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/).
2. Use `npx expo install <package>` instead of a plain `npm install` to select an SDK-compatible package version.
3. For native configuration changes, check whether a config plugin and development build are required.
4. Check for conflicts with `reactCompiler`, `typedRoutes`, and platform settings in `app.json`.
5. Prefer the versioned documentation because examples in the latest Expo documentation may differ from SDK 57.

## Sources

- [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/)
- [Expo Router SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/sdk/router/)
- [Expo Router core concepts](https://docs.expo.dev/router/basics/core-concepts/)
- [Expo Router top-level src directory](https://docs.expo.dev/router/reference/src-directory/)
- [FSD framework folder conflict pattern](https://feature-sliced.design/docs/guides/tech/with-nextjs)

The final FSD link is an official precedent for separating framework-reserved folders from FSD layer names, not an instruction to copy the Next.js implementation. The `src/app` and `src/_app` separation is an explicit project decision for Expo Router.
