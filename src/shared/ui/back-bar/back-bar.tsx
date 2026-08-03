import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing, useTheme } from '@/shared/ui/theme';

/** The tap target keeps the 44dp minimum; the glyph inside it is 24. */
const TargetSize = 44;
const IconSize = 24;

/**
 * Pull the target left by its own padding, so the *glyph* lands on the content
 * column's edge rather than the tap area's — an arrow indented 10dp past the
 * title under it reads as a mistake.
 */
const EdgeInset = Spacing.five - (TargetSize - IconSize) / 2;

/** Platform back convention: a chevron on iOS, an arrow on Android. */
const BackIcon = Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back';

export type BackBarProps = {
  onPress: () => void;
  /** Overridden when "back" needs naming for a specific screen. */
  accessibilityLabel?: string;
};

/**
 * The way out of a pushed screen, and nothing else.
 *
 * It exists because a titled navigation bar over these screens said the same
 * thing twice: the bar named the *kind* of screen (`템플릿`, `무비`) while the
 * screen's own first line named the thing itself (`동네 산책`). The generic one
 * is the one worth losing — every tab screen already opens on a large title
 * with no bar above it, so dropping the chrome is what makes a pushed screen
 * look like the rest of the app rather than an exception to it.
 *
 * What is left has to stay pinned rather than scroll away with the content: it
 * is the only visible way back on iOS, where there is no system back button.
 */
export function BackBar({ onPress, accessibilityLabel = '뒤로 가기' }: BackBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingTop: insets.top }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [styles.target, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Ionicons color={theme.text} name={BackIcon} size={IconSize} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: EdgeInset,
  },
  target: {
    width: TargetSize,
    height: TargetSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
