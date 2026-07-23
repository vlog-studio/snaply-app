import { renderHook } from '@testing-library/react-native';

import { Colors } from './theme';
import { useResolvedColorScheme, useTheme } from './use-theme';

jest.mock('react-native', () => ({
  // theme.ts only reaches `Platform` for its font map; the dark-fixed
  // resolution no longer touches `useColorScheme`.
  Platform: {
    OS: 'ios',
    select: (options: Record<string, unknown>) => options.ios ?? options.default,
  },
}));

describe('useResolvedColorScheme', () => {
  it('always resolves to dark — the app is dark-fixed (the darkroom)', async () => {
    const { result } = await renderHook(() => useResolvedColorScheme());
    expect(result.current).toBe('dark');
  });
});

describe('useTheme', () => {
  it('returns the darkroom palette', async () => {
    const { result } = await renderHook(() => useTheme());
    expect(result.current).toBe(Colors.dark);
  });
});
