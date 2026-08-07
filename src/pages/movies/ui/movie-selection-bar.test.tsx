import { fireEvent, render, screen } from '@testing-library/react-native';

import { MovieSelectionBar } from './movie-selection-bar';

// The bar reads safe-area insets — a native answer a test has no provider for.
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const shareLabel = '\uACF5\uC720'; // 공유
const clearLabel = '\uC120\uD0DD \uD574\uC81C'; // 선택 해제

function makeBar(overrides: Partial<Parameters<typeof MovieSelectionBar>[0]> = {}) {
  const handlers = {
    onShare: jest.fn(),
    onDelete: jest.fn(),
    onClear: jest.fn(),
  };
  const props = { selectedCount: 1, shareBlocked: true, ...handlers, ...overrides };
  return { handlers, ui: <MovieSelectionBar {...props} /> };
}

describe('MovieSelectionBar', () => {
  it('offers share only when one movie is selected and a file exists', async () => {
    const { rerender } = await render(makeBar({ selectedCount: 1, shareBlocked: true }).ui);
    expect(screen.queryByRole('button', { name: shareLabel })).toBeNull();

    await rerender(makeBar({ selectedCount: 2, shareBlocked: false }).ui);
    expect(screen.queryByRole('button', { name: shareLabel })).toBeNull();

    const shareable = makeBar({ selectedCount: 1, shareBlocked: false });
    await rerender(shareable.ui);
    await fireEvent.press(screen.getByRole('button', { name: shareLabel }));
    expect(shareable.handlers.onShare).toHaveBeenCalled();
  });

  it('deletes and clears the selection through its own buttons', async () => {
    const { handlers, ui } = makeBar({ selectedCount: 3 });
    await render(ui);

    // 3편 무비 삭제
    await fireEvent.press(
      screen.getByRole('button', { name: '3\uD3B8 \uBB34\uBE44 \uC0AD\uC81C' }),
    );
    expect(handlers.onDelete).toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: clearLabel }));
    expect(handlers.onClear).toHaveBeenCalled();
  });

  it('disables delete and clear while nothing is selected', async () => {
    const { handlers, ui } = makeBar({ selectedCount: 0 });
    await render(ui);

    // 0편 무비 삭제
    const deleteButton = screen.getByLabelText('0\uD3B8 \uBB34\uBE44 \uC0AD\uC81C');
    expect(deleteButton).toBeDisabled();
    await fireEvent.press(deleteButton);
    expect(handlers.onDelete).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByLabelText(clearLabel));
    expect(handlers.onClear).not.toHaveBeenCalled();
  });
});
