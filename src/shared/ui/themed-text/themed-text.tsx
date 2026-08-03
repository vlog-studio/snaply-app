import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, type ThemeColor, Typography, useTheme } from '@/shared/ui/theme';

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

// Each variant is a step of `Typography` plus the things that make it a role —
// family, weight, letter spacing, casing. No variant writes a size or a leading
// of its own: those belong to the scale, and a role that needs different ones
// needs a new step there instead.
const styles = StyleSheet.create({
  xsmall: { ...Typography.xsmall, fontWeight: 500 },
  small: { ...Typography.small, fontWeight: 500 },
  smallBold: { ...Typography.small, fontWeight: 700 },
  default: { ...Typography.body, fontWeight: 500 },
  display: { ...Typography.display, fontFamily: Fonts.rounded, fontWeight: 800 },
  title: { ...Typography.title, fontFamily: Fonts.rounded, fontWeight: 800 },
  subtitle: { ...Typography.subtitle, fontFamily: Fonts.rounded, fontWeight: 700 },
  heading: { ...Typography.heading, fontFamily: Fonts.rounded, fontWeight: 700 },
  eyebrow: {
    ...Typography.xsmall,
    fontWeight: 800,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  // Mono micro-label — the app's signature small type, used for counts, states,
  // and durations (e.g. "3 / 10 · 약 24초"). Pair with a muted or accent
  // themeColor.
  edge: {
    ...Typography.micro,
    fontFamily: Fonts.mono,
    fontWeight: 600,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  button: { ...Typography.body, fontWeight: 800 },
  // Links are body-small text, not a step of their own. They used to carry
  // lineHeight 30 at 14px (ratio 2.14) — the Expo starter's 16/30 with the size
  // cut and the leading left behind — and `link` declared no weight at all, so
  // it rendered at 400 against every neighbor's 500.
  link: { ...Typography.small, fontWeight: 500 },
  linkPrimary: { ...Typography.small, fontWeight: 700 },
  // Leading was missing here, which left it to the platform default: iOS
  // `ui-monospace` and Android `monospace` disagree, so the same inline code
  // changed its row height per platform.
  code: {
    ...Typography.xsmall,
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
  },
});
