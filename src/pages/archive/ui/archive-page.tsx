import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SnaplyButton } from '@/shared/ui/snaply-button';
import { BottomTabInset, MaxContentWidth, Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

type ArchiveView = 'clips' | 'vlogs';

const clips = [
  { id: 'cafe', emoji: '☕', title: '카페 감성', time: '오후 2:34', mood: '힙하게', color: '#C4875B' },
  { id: 'sunset', emoji: '🌇', title: '퇴근길 노을', time: '오후 6:15', mood: '러블리', color: '#735A8D' },
  { id: 'lunch', emoji: '🍜', title: '점심 한입', time: '오후 12:22', mood: '신나게', color: '#C9573F' },
  { id: 'shopping', emoji: '🛍️', title: '쇼핑 하이라이트', time: '오후 3:50', mood: '힙하게', color: '#316D75' },
];

export function ArchivePage() {
  const theme = useTheme();
  const [archiveView, setArchiveView] = useState<ArchiveView>('clips');

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
          <ThemedText type="eyebrow" themeColor="ai">YOUR MOMENTS</ThemedText>
          <ThemedText type="title">내 일상이 쌓이는 곳</ThemedText>
          <ThemedText themeColor="textSecondary">짧은 순간부터 완성된 하루까지 모아보세요.</ThemedText>
        </View>
        <View style={[styles.countBadge, { backgroundColor: theme.aiSoft }]}>
          <ThemedText type="heading" themeColor="ai" style={styles.tabularNumber}>4</ThemedText>
        </View>
      </View>

      <View style={[styles.segmented, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        {([
          ['clips', '클립'],
          ['vlogs', '브이로그'],
        ] as const).map(([value, label]) => {
          const isSelected = archiveView === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              onPress={() => setArchiveView(value)}
              style={[styles.segment, isSelected && { backgroundColor: theme.text }]}>
              <ThemedText
                selectable={false}
                type="smallBold"
                style={{ color: isSelected ? theme.background : theme.textSecondary }}>
                {label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {archiveView === 'clips' ? (
        <Animated.View entering={FadeInDown.duration(260)} style={styles.clipGrid}>
          {clips.map((clip) => (
            <View key={clip.id} style={[styles.clipCard, { backgroundColor: clip.color }]}>
              <View style={styles.clipTopRow}>
                <View style={styles.playBadge}>
                  <ThemedText selectable={false} style={styles.playIcon}>▶</ThemedText>
                </View>
                <View style={styles.aiTag}>
                  <ThemedText selectable={false} style={styles.aiTagText}>✦ AI</ThemedText>
                </View>
              </View>
              <ThemedText selectable={false} style={styles.clipEmoji}>{clip.emoji}</ThemedText>
              <View style={styles.clipInfo}>
                <ThemedText type="smallBold" style={styles.whiteText}>{clip.title}</ThemedText>
                <ThemedText style={styles.clipMeta}>{clip.time} · {clip.mood}</ThemedText>
              </View>
            </View>
          ))}
        </Animated.View>
      ) : (
        <Animated.View entering={FadeInDown.duration(260)} style={styles.vlogList}>
          <View style={[styles.vlogCard, { backgroundColor: theme.media }]}>
            <View style={styles.vlogPreview}>
              {clips.map((clip) => (
                <View key={clip.id} style={[styles.previewFrame, { backgroundColor: clip.color }]}>
                  <ThemedText selectable={false} style={styles.previewEmoji}>{clip.emoji}</ThemedText>
                </View>
              ))}
            </View>
            <View style={styles.vlogCopy}>
              <ThemedText type="eyebrow" style={styles.orangeText}>TODAY · 16 SEC</ThemedText>
              <ThemedText type="heading" style={styles.whiteText}>7월 15일, 작은 순간들</ThemedText>
              <ThemedText style={styles.mutedWhite}>4개의 클립 · AI 자동 편집 완료</ThemedText>
            </View>
            <Link href={{ pathname: '/capture/result', params: { mood: 'hip', duration: '3' } }} asChild>
              <SnaplyButton title="브이로그 미리보기" variant="ai" icon="▶" />
            </Link>
          </View>

          <View style={[styles.emptyVlogCard, { borderColor: theme.border }]}>
            <ThemedText selectable={false} style={styles.emptyEmoji}>📅</ThemedText>
            <View style={styles.emptyCopy}>
              <ThemedText type="heading">어제의 브이로그</ThemedText>
              <ThemedText themeColor="textSecondary">아직 완성된 영상이 없어요.</ThemedText>
            </View>
          </View>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.six,
    gap: Spacing.five,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  headerCopy: { flex: 1, gap: Spacing.two },
  countBadge: {
    width: 52,
    height: 52,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabularNumber: { fontVariant: ['tabular-nums'] },
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    padding: Spacing.one,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    gap: Spacing.one,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  clipCard: {
    width: '48%',
    minHeight: 226,
    flexGrow: 1,
    borderRadius: Radius.large,
    borderCurve: 'continuous',
    padding: Spacing.four,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  clipTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  playBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { color: '#FFFFFF', fontSize: 12 },
  aiTag: {
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(18,23,46,0.52)',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  aiTagText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  clipEmoji: { fontSize: 50, textAlign: 'center' },
  clipInfo: { gap: 1 },
  whiteText: { color: '#FFFFFF' },
  clipMeta: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  vlogList: { gap: Spacing.four },
  vlogCard: {
    borderRadius: Radius.xlarge,
    borderCurve: 'continuous',
    padding: Spacing.five,
    gap: Spacing.five,
  },
  vlogPreview: { flexDirection: 'row', gap: Spacing.one },
  previewFrame: {
    flex: 1,
    aspectRatio: 0.7,
    maxHeight: 132,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewEmoji: { fontSize: 24 },
  vlogCopy: { gap: Spacing.one },
  orangeText: { color: '#FF8E67' },
  mutedWhite: { color: 'rgba(255,255,255,0.62)' },
  emptyVlogCard: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.large,
    padding: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  emptyEmoji: { fontSize: 34 },
  emptyCopy: { flex: 1, gap: Spacing.one },
});
