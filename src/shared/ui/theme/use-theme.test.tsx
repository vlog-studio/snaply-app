import { useColorScheme } from 'react-native';
import { renderHook } from '@testing-library/react-native';

import { Colors } from './theme';
import { useThemeMode, type ThemeMode } from './theme-mode';
import { useResolvedColorScheme, useTheme } from './use-theme';

jest.mock('react-native', () => ({
  // A minimal manual stand-in for the two `react-native` exports this graph
  // touches: `useColorScheme` (use-theme.ts) and `Platform` (theme.ts fonts).
  // Spreading `requireActual('react-native')` is not viable under jest-expo —
  // it eagerly loads the full index and trips native TurboModule invariants.
  useColorScheme: jest.fn(),
  Platform: {
    OS: 'ios',
    select: (options: Record<string, unknown>) => options.ios ?? options.default,
  },
}));

jest.mock('./theme-mode', () => ({
  useThemeMode: jest.fn(),
}));

const useColorSchemeMock = jest.mocked(useColorScheme);
const useThemeModeMock = jest.mocked(useThemeMode);

// `useColorScheme()` returns 'unspecified' (not null) when there is no
// system preference in React Native 0.86.
function setup(mode: ThemeMode, systemScheme: 'light' | 'dark' | 'unspecified') {
  useThemeModeMock.mockReturnValue(mode);
  useColorSchemeMock.mockReturnValue(systemScheme);
}

beforeEach(() => jest.clearAllMocks());

describe('useResolvedColorScheme', () => {
  it.each(['light', 'dark'] as const)(
    'honors the explicit "%s" mode regardless of the system scheme',
    async (mode) => {
      setup(mode, mode === 'light' ? 'dark' : 'light');
      const { result } = await renderHook(() => useResolvedColorScheme());
      expect(result.current).toBe(mode);
    },
  );

  it('follows the dark system scheme when the mode is "system"', async () => {
    setup('system', 'dark');
    const { result } = await renderHook(() => useResolvedColorScheme());
    expect(result.current).toBe('dark');
  });

  it.each(['light', 'unspecified'] as const)(
    'resolves to light in system mode when the system scheme is %s',
    async (systemScheme) => {
      setup('system', systemScheme);
      const { result } = await renderHook(() => useResolvedColorScheme());
      expect(result.current).toBe('light');
    },
  );
});

describe('useTheme', () => {
  it('returns the palette matching the resolved scheme', async () => {
    setup('dark', 'light');
    const { result } = await renderHook(() => useTheme());
    expect(result.current).toBe(Colors.dark);
  });
});
