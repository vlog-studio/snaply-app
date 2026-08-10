/**
 * API transport configuration.
 *
 * The backend endpoints (see the location-notifications plan) do not exist yet,
 * so the app runs against in-code mocks by default. Mock mode is on whenever no
 * base URL is configured, or when explicitly forced with
 * `EXPO_PUBLIC_USE_MOCK_API=true`. Once the real API is available, set
 * `EXPO_PUBLIC_API_BASE_URL` and mock mode turns off automatically.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

export const USE_MOCK_API = process.env.EXPO_PUBLIC_USE_MOCK_API === 'true' || API_BASE_URL === '';

/**
 * The same origin, addressed as a WebSocket.
 *
 * The backend serves its one streaming endpoint (`/edit-jobs/:id/progress`) from
 * the HTTP origin, so there is no second base URL to configure — deriving it
 * here keeps a socket from being pointed somewhere the requests are not. Empty
 * whenever `API_BASE_URL` is, which is one of the conditions that turns mock
 * mode on, so nothing ever tries to open a socket to `ws://`.
 */
export const API_SOCKET_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');
