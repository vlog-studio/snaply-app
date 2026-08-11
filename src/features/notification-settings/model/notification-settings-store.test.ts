import { act, renderHook } from '@testing-library/react-native';

import {
  useInterests,
  useMovieReadyEnabled,
  useNotificationEnabled,
  useQuietEnd,
  useQuietStart,
  useSetMovieReadyEnabled,
  useSetNotificationEnabled,
  useSetQuietEnd,
  useSetQuietStart,
  useToggleInterest,
} from './notification-settings-store';

const mockStorageSetItem = jest.fn();

jest.mock('@/shared/lib/secure-storage', () => ({
  secureStorage: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: (...args: unknown[]) => mockStorageSetItem(...args),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

function useSettings() {
  return {
    enabled: useNotificationEnabled(),
    quietStart: useQuietStart(),
    quietEnd: useQuietEnd(),
    interests: useInterests(),
    movieReady: useMovieReadyEnabled(),
    setEnabled: useSetNotificationEnabled(),
    setQuietStart: useSetQuietStart(),
    setQuietEnd: useSetQuietEnd(),
    toggleInterest: useToggleInterest(),
    setMovieReady: useSetMovieReadyEnabled(),
  };
}

describe('notification settings', () => {
  it('starts with alerts enabled but does not opt into movie completion prompts', async () => {
    const { result } = await renderHook(useSettings);

    expect(result.current).toMatchObject({
      enabled: true,
      quietStart: 22,
      quietEnd: 8,
      interests: [],
      movieReady: false,
    });
  });

  it('updates product preferences and toggles an interest without duplicates', async () => {
    const { result } = await renderHook(useSettings);

    await act(async () => {
      result.current.setEnabled(false);
      result.current.setQuietStart(23);
      result.current.setQuietEnd(7);
      result.current.toggleInterest('travel');
      result.current.toggleInterest('food');
      result.current.setMovieReady(true);
    });

    expect(result.current).toMatchObject({
      enabled: false,
      quietStart: 23,
      quietEnd: 7,
      interests: ['travel', 'food'],
      movieReady: true,
    });

    await act(async () => {
      result.current.toggleInterest('travel');
    });
    expect(result.current.interests).toEqual(['food']);
    expect(mockStorageSetItem).toHaveBeenCalled();

    await act(async () => {
      result.current.setEnabled(true);
      result.current.setQuietStart(22);
      result.current.setQuietEnd(8);
      result.current.toggleInterest('food');
      result.current.setMovieReady(false);
    });
  });
});
