import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CaptureDuration, CaptureMood } from '@/entities/capture-session';
import { SnaplyButton } from '@/shared/ui/snaply-button';
import { MaxContentWidth, Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

type CaptureSetupPageProps = {
  context?: string;
};

const moodOptions: {
  accent: string;
  description: string;
  emoji: string;
  id: CaptureMood;
  label: string;
}[] = [
  {
    id: 'hip',
    emoji: '🔥',
    label: '힙하게',
    description: '선명하고 트렌디한 감성',
    accent: '#EA5E38', // ember
  },
  {
    id: 'lovely',
    emoji: '💕',
    label: '러블리하게',
    description: '따뜻하고 사랑스러운 톤',
    accent: '#D98AA0', // warm rose
  },
  {
    id: 'energy',
    emoji: '⚡',
    label: '신나게',
    description: '빠르고 에너지 넘치게',
    accent: '#82D6CE', // lumen
  },
];

export function CaptureSetupPage({ context }: CaptureSetupPageProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [mood, setMood] = useState<CaptureMood>('hip');
  const [duration, setDuration] = useState<CaptureDuration>(3);

  const selectMood = (nextMood: CaptureMood) => {
    setMood(nextMood);
    if (Platform.OS === 'ios') void Haptics.selectionAsync();
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* The footer wrapper keeps this ScrollView from being the screen root,
          so iOS automatic content-inset adjustment no longer applies here;
          safe-area padding is set explicitly instead. */}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: Spacing.six + insets.top }]}
      >
        <View style={styles.hero}>
          <View style={[styles.brandMark, { backgroundColor: theme.primary }]}>
            <Image
              contentFit="contain"
              source={require('@/assets/images/brand-glyph-white.png')}
              style={styles.brandGlyph}
            />
          </View>
          <View style={styles.heroCopy}>
            <ThemedText type="edge" themeColor="amber">
              NEW CLIP · 오늘의 롤
            </ThemedText>
            <ThemedText type="title">오늘은 어떤{`\n`}분위기예요?</ThemedText>
            <ThemedText themeColor="textSecondary">
              두 가지만 고르면 바로 담을 수 있어요.
            </ThemedText>
          </View>
          <Link href="/" asChild>
            <Pressable
              accessibilityLabel="촬영 설정 닫기"
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                pressed && styles.pressed,
              ]}
            >
              <ThemedText selectable={false} style={styles.closeIcon} themeColor="textSecondary">
                ✕
              </ThemedText>
            </Pressable>
          </Link>
        </View>

        {context === 'cafe' ? (
          <View style={[styles.contextHint, { backgroundColor: theme.warmSurface }]}>
            <ThemedText selectable={false} style={styles.contextEmoji}>
              ☕
            </ThemedText>
            <View style={styles.contextHintCopy}>
              <ThemedText type="smallBold">카페 무드를 감지했어요</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                힙한 감성을 먼저 추천할게요.
              </ThemedText>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <ThemedText type="heading">무드</ThemedText>
          <View style={styles.optionList}>
            {moodOptions.map((option) => {
              const isSelected = mood === option.id;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  onPress={() => selectMood(option.id)}
                  style={({ pressed }) => [
                    styles.moodOption,
                    {
                      backgroundColor: isSelected
                        ? theme.backgroundSelected
                        : theme.backgroundElement,
                      borderColor: isSelected ? option.accent : theme.border,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.moodIcon, { backgroundColor: `${option.accent}18` }]}>
                    <ThemedText selectable={false} style={styles.moodEmoji}>
                      {option.emoji}
                    </ThemedText>
                  </View>
                  <View style={styles.moodCopy}>
                    <ThemedText type="heading">{option.label}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {option.description}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.radio,
                      { borderColor: isSelected ? option.accent : theme.border },
                      isSelected && { backgroundColor: option.accent },
                    ]}
                  >
                    {isSelected ? <View style={styles.radioDot} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="heading">영상 길이</ThemedText>
          <View
            style={[
              styles.durationGroup,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}
          >
            {([3, 5] as const).map((seconds) => {
              const isSelected = duration === seconds;
              return (
                <Pressable
                  key={seconds}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  onPress={() => setDuration(seconds)}
                  style={[styles.durationButton, isSelected && { backgroundColor: theme.text }]}
                >
                  <ThemedText
                    selectable={false}
                    type="heading"
                    style={{ color: isSelected ? theme.background : theme.text }}
                  >
                    {seconds}초
                  </ThemedText>
                  <ThemedText
                    selectable={false}
                    type="small"
                    style={{ color: isSelected ? theme.background : theme.textSecondary }}
                  >
                    {seconds === 3 ? '짧고 강렬하게' : '조금 더 여유롭게'}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom + Spacing.four,
          },
        ]}
      >
        <Link
          href={{ pathname: '/capture/record', params: { mood, duration: String(duration) } }}
          asChild
        >
          <SnaplyButton title={`${duration}초 담기 시작`} icon="●" />
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.six,
    gap: Spacing.six,
  },
  footer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.four,
  },
  hero: { flexDirection: 'row', gap: Spacing.four, alignItems: 'flex-start' },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: { fontSize: 18, fontWeight: '700' },
  brandMark: {
    width: 54,
    height: 54,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandGlyph: { width: 30, height: 30 },
  heroCopy: { flex: 1, gap: Spacing.two },
  contextHint: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.large,
    borderCurve: 'continuous',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  contextEmoji: { fontSize: 28 },
  contextHintCopy: { flex: 1, gap: 2 },
  section: { gap: Spacing.four },
  optionList: { gap: Spacing.three },
  moodOption: {
    minHeight: 88,
    borderRadius: Radius.large,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    padding: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  moodIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodEmoji: { fontSize: 25 },
  moodCopy: { flex: 1, gap: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  durationGroup: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: Radius.large,
    borderCurve: 'continuous',
    padding: Spacing.one,
    gap: Spacing.one,
  },
  durationButton: {
    flex: 1,
    minHeight: 78,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  pressed: { opacity: 0.72 },
});
