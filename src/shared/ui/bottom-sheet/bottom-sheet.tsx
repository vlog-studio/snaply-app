import { type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing, useTheme } from '@/shared/ui/theme';

export type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  // Announced on the sheet surface for screen readers (e.g. "현상 안내").
  accessibilityLabel?: string;
};

// A lightweight bottom sheet built on the platform Modal. The panel is anchored
// to the bottom and slides up via the Modal's native slide animation (reliable
// inside Modal, unlike reanimated layout animations which mis-measure here);
// tapping the backdrop dismisses it. Kept business-agnostic — callers pass
// their own content.
export function BottomSheet({ visible, onClose, children, accessibilityLabel }: BottomSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      transparent
      statusBarTranslucent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="닫기"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View
          accessibilityLabel={accessibilityLabel}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
              paddingBottom: insets.bottom + Spacing.six,
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: theme.border }]} />
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    borderTopLeftRadius: Radius.xlarge,
    borderTopRightRadius: Radius.xlarge,
    borderCurve: 'continuous',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.five,
    gap: Spacing.three,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.two,
  },
});
