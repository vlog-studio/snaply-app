import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SnaplyButton } from '@/shared/ui/snaply-button';
import { BottomTabInset, MaxContentWidth, Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

export function HomePage() {
  const theme = useTheme();
  const today = new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date());

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: BottomTabInset + Spacing.six },
      ]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <ThemedText type="eyebrow" themeColor="primary">
            {today}
          </ThemedText>
          <ThemedText type="title">오늘도 찰나를 남겨요.</ThemedText>
        </View>
        <Link href="/settings" asChild>
          <Pressable
            accessibilityLabel="설정 열기"
            style={({ pressed }) => [
              styles.settingsButton,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              pressed && styles.pressed,
            ]}>
            <ThemedText selectable={false} style={styles.settingsIcon}>
              ⚙
            </ThemedText>
          </Pressable>
        </Link>
      </View>

      <Animated.View
        entering={FadeInDown.duration(420)}
        style={[styles.contextCard, { backgroundColor: theme.media }]}>
        <View style={[styles.glow, { backgroundColor: theme.primary }]} />
        <View style={styles.contextTopRow}>
          <View style={styles.contextBadge}>
            <ThemedText selectable={false} style={styles.contextBadgeText}>
              📍 카페 · 오후
            </ThemedText>
          </View>
          <ThemedText style={styles.spark}>✦</ThemedText>
        </View>
        <View style={styles.contextCopy}>
          <ThemedText type="heading" style={styles.whiteText}>
            지금 이 분위기,{`\n`}3초면 충분해요.
          </ThemedText>
          <ThemedText style={styles.mutedWhite}>
            힙한 무드로 바로 시작할까요?
          </ThemedText>
        </View>
        <Link href={{ pathname: '/capture', params: { context: 'cafe' } }} asChild>
          <SnaplyButton title="3초 남기기" icon="●" />
        </Link>
      </Animated.View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText type="heading">오늘의 순간</ThemedText>
          <ThemedText type="smallBold" themeColor="primary">
            2 / 4
          </ThemedText>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
          <View style={[styles.progressValue, { backgroundColor: theme.primary }]} />
        </View>
        <View style={styles.momentRow}>
          <MomentCard emoji="☕" label="카페 감성" time="14:34" color="#D7915D" />
          <MomentCard emoji="🌇" label="퇴근길" time="18:15" color="#765A8E" />
          <View style={[styles.emptyMoment, { borderColor: theme.border }]}>
            <ThemedText selectable={false} style={styles.emptyIcon} themeColor="textSecondary">
              ＋
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              다음 순간
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={[styles.vlogCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <View style={styles.vlogInfo}>
          <View style={[styles.aiBadge, { backgroundColor: theme.aiSoft }]}>
            <ThemedText type="eyebrow" themeColor="ai">
              AI DAILY VLOG
            </ThemedText>
          </View>
          <ThemedText type="heading">오늘의 브이로그</ThemedText>
          <ThemedText themeColor="textSecondary">
            순간을 두 개 더 모으면 자동으로 이어드려요.
          </ThemedText>
        </View>
        <View style={styles.vlogPreview}>
          {['☕', '🌇', '·', '·'].map((item, index) => (
            <View
              key={`${item}-${index}`}
              style={[
                styles.vlogFrame,
                {
                  backgroundColor: index < 2 ? ['#D7915D', '#765A8E'][index] : theme.background,
                  borderColor: theme.border,
                },
              ]}>
              <ThemedText selectable={false} style={styles.vlogEmoji}>
                {item}
              </ThemedText>
            </View>
          ))}
        </View>
        <Link href="/archive" asChild>
          <SnaplyButton title="보관함 둘러보기" variant="secondary" />
        </Link>
      </View>
    </ScrollView>
  );
}

type MomentCardProps = {
  color: string;
  emoji: string;
  label: string;
  time: string;
};

function MomentCard({ color, emoji, label, time }: MomentCardProps) {
  return (
    <View style={[styles.momentCard, { backgroundColor: color }]}>
      <ThemedText selectable={false} style={styles.momentEmoji}>
        {emoji}
      </ThemedText>
      <View>
        <ThemedText type="smallBold" style={styles.whiteText}>
          {label}
        </ThemedText>
        <ThemedText style={styles.momentTime}>{time}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.six,
    gap: Spacing.six,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  headerCopy: { flex: 1, gap: Spacing.one },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: { fontSize: 21 },
  contextCard: {
    minHeight: 310,
    borderRadius: Radius.xlarge,
    borderCurve: 'continuous',
    padding: Spacing.five,
    gap: Spacing.five,
    overflow: 'hidden',
    boxShadow: '0 18px 42px rgba(18,23,46,0.18)',
  },
  glow: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    right: -80,
    top: -100,
    opacity: 0.24,
  },
  contextTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  contextBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.pill,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  contextBadgeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  spark: { color: '#FFB397', fontSize: 28 },
  contextCopy: { flex: 1, justifyContent: 'center', gap: Spacing.two },
  whiteText: { color: '#FFFFFF' },
  mutedWhite: { color: 'rgba(255,255,255,0.68)' },
  section: { gap: Spacing.four },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTrack: { height: 6, borderRadius: Radius.pill, overflow: 'hidden' },
  progressValue: { width: '50%', height: '100%', borderRadius: Radius.pill },
  momentRow: { flexDirection: 'row', gap: Spacing.three },
  momentCard: {
    flex: 1,
    minHeight: 142,
    borderRadius: Radius.large,
    borderCurve: 'continuous',
    padding: Spacing.four,
    justifyContent: 'space-between',
  },
  momentEmoji: { fontSize: 34 },
  momentTime: { color: 'rgba(255,255,255,0.68)', fontSize: 12 },
  emptyMoment: {
    flex: 0.72,
    minHeight: 142,
    borderRadius: Radius.large,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  emptyIcon: { fontSize: 27 },
  vlogCard: {
    borderRadius: Radius.xlarge,
    borderCurve: 'continuous',
    borderWidth: 1,
    padding: Spacing.five,
    gap: Spacing.five,
  },
  vlogInfo: { gap: Spacing.two },
  aiBadge: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.small,
  },
  vlogPreview: { flexDirection: 'row', gap: Spacing.two },
  vlogFrame: {
    flex: 1,
    aspectRatio: 0.76,
    maxHeight: 112,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vlogEmoji: { fontSize: 24 },
  pressed: { opacity: 0.68 },
});
