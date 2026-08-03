import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, type ThemeColor, useTheme } from '@/shared/ui/theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'display'
    | 'title'
    | 'heading'
    | 'xsmall'
    | 'small'
    | 'smallBold'
    | 'subtitle'
    | 'eyebrow'
    | 'edge'
    | 'button'
    | 'link'
    | 'linkPrimary'
    | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({
  selectable = true,
  style,
  type = 'default',
  themeColor,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      selectable={selectable}
      style={[
        { color: theme.text },
        type === 'default' && styles.default,
        type === 'display' && styles.display,
        type === 'title' && styles.title,
        type === 'heading' && styles.heading,
        type === 'xsmall' && styles.xsmall,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'eyebrow' && styles.eyebrow,
        type === 'edge' && styles.edge,
        type === 'button' && styles.button,
        type === 'link' && styles.link,
        type === 'linkPrimary' && [styles.linkPrimary, { color: theme.primary }],
        type === 'code' && styles.code,
        themeColor && { color: theme[themeColor] },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  xsmall: { fontSize: 12, lineHeight: 16, fontWeight: 500 },
  small: { fontSize: 14, lineHeight: 20, fontWeight: 500 },
  smallBold: { fontSize: 14, lineHeight: 20, fontWeight: 700 },
  default: { fontSize: 16, lineHeight: 24, fontWeight: 500 },
  display: { fontFamily: Fonts.rounded, fontSize: 42, fontWeight: 800, lineHeight: 48 },
  title: { fontFamily: Fonts.rounded, fontSize: 32, fontWeight: 800, lineHeight: 39 },
  subtitle: { fontFamily: Fonts.rounded, fontSize: 26, lineHeight: 34, fontWeight: 700 },
  heading: { fontFamily: Fonts.rounded, fontSize: 21, lineHeight: 28, fontWeight: 700 },
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 800,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  // Mono micro-label — the app's signature small type, used for counts, states,
  // and durations (e.g. "3 / 10 · 약 24초"). Pair with a muted or accent
  // themeColor.
  edge: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: 600,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  button: { fontSize: 16, lineHeight: 21, fontWeight: 800 },
  link: { lineHeight: 30, fontSize: 14 },
  linkPrimary: { lineHeight: 30, fontSize: 14, fontWeight: 700 },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
