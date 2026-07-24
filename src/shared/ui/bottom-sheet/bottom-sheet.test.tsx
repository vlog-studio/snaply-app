import { fireEvent, render, screen } from '@testing-library/react-native';
import { type ReactNode } from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BottomSheet } from './bottom-sheet';

// useSafeAreaInsets needs a provider; seed fixed metrics so insets resolve
// synchronously in tests.
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function withSafeArea(node: ReactNode) {
  return <SafeAreaProvider initialMetrics={metrics}>{node}</SafeAreaProvider>;
}

describe('BottomSheet', () => {
  it('renders its children while visible', async () => {
    await render(
      withSafeArea(
        <BottomSheet visible onClose={jest.fn()}>
          <Text>현상 안내</Text>
        </BottomSheet>,
      ),
    );

    expect(screen.getByText('현상 안내')).toBeTruthy();
  });

  it('calls onClose when the backdrop is pressed', async () => {
    const onClose = jest.fn();
    await render(
      withSafeArea(
        <BottomSheet visible onClose={onClose}>
          <Text>내용</Text>
        </BottomSheet>,
      ),
    );

    fireEvent.press(screen.getByRole('button', { name: '닫기' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
