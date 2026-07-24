import { act, renderHook } from '@testing-library/react-native';

import { useSetTabBarHidden, useTabBarHidden } from './tab-bar-chrome';

describe('tab bar chrome store', () => {
  afterEach(async () => {
    // The store is a module-level singleton; reset it so tests stay independent.
    const { result } = await renderHook(() => useSetTabBarHidden());
    await act(async () => result.current(false));
  });

  it('shows the tab bar by default', async () => {
    const { result } = await renderHook(() => useTabBarHidden());
    expect(result.current).toBe(false);
  });

  it('hides and restores the tab bar via the setter', async () => {
    const { result } = await renderHook(() => ({
      hidden: useTabBarHidden(),
      setHidden: useSetTabBarHidden(),
    }));

    await act(async () => result.current.setHidden(true));
    expect(result.current.hidden).toBe(true);

    await act(async () => result.current.setHidden(false));
    expect(result.current.hidden).toBe(false);
  });
});
