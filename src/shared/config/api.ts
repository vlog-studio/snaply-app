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
