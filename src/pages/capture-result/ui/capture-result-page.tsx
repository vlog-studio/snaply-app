import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { FadeInView } from '@/shared/ui/fade-in-view';
import { SnaplyButton } from '@/shared/ui/snaply-button';
import { MaxContentWidth, Radius, Spacing, useTheme, useTopContentInset } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import { useReel } from '../model/use-reel';
import { ReelPlayer } from './reel-player';

type CaptureResultPageProps = {
  rollId?: string;
};

export function CaptureResultPage({ rollId }: CaptureResultPageProps) {
  const router = useRouter();
  const theme = useTheme();
  const topInset = useTopContentInset();
  const { roll, reel, uris } = useReel(rollId);

  const hasReel = uris.length > 0;
  const transitionLabel = reel?.transition === 'cut' ? '컷 전환' : '페이드';

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingTop: Spacing.six + topInset }]}
    >
      <View style={styles.headerCopy}>
        <ThemedText type="edge" themeColor="lumen">
          {roll?.dayKey ? `ROLL · ${roll.dayKey}` : 'ROLL'} · 현상 완료
        </ThemedText>
        <ThemedText type="title">릴이 공개됐어요</ThemedText>
        <ThemedText themeColor="textSecondary">
          {hasReel
            ? `${roll?.title ?? '오늘의 롤'}의 ${uris.length}컷을 하나의 릴로 이어서 재생해요.`
            : '아직 현상된 릴이 없어요.'}
        </ThemedText>
      </View>

      {hasReel ? (
        <FadeInView delay={100} duration={420} fromScale={0.92}>
          <ReelPlayer uris={uris} />
        </FadeInView>
      ) : (
        <View style={[styles.emptyReel, { borderColor: theme.border }]}>
          <ThemedText selectable={false} style={[styles.emptyGlyph, { color: theme.border }]}>
            ◍
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centerText}>
            롤을 먼저 현상하면 여기에서 릴을 재생할 수 있어요.
          </ThemedText>
        </View>
      )}

      {hasReel ? (
        <View style={styles.editSummary}>
          <ThemedText type="edge" themeColor="textSecondary">
            이 릴에 들어간 것
          </ThemedText>
          <View style={styles.tagRow}>
            {[`♬ BGM`, `⇄ ${transitionLabel}`, `▣ ${uris.length}컷`].map((item) => (
              <View
                key={item}
                style={[styles.editTag, { backgroundColor: theme.aiSoft, borderColor: theme.border }]}
              >
                <ThemedText selectable={false} type="smallBold" themeColor="lumen">
                  {item}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        <SnaplyButton title="보관함에서 보기" onPress={() => router.replace('/archive')} />
        <SnaplyButton
          title="다른 순간 담기"
          variant="secondary"
          onPress={() => router.replace('/capture')}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.eight,
    gap: Spacing.five,
  },
  headerCopy: { gap: Spacing.two },
  centerText: { textAlign: 'center' },
  emptyReel: {
    width: '82%',
    maxWidth: 340,
    aspectRatio: 0.62,
    maxHeight: 460,
    alignSelf: 'center',
    borderRadius: Radius.large,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
  },
  emptyGlyph: { fontSize: 40 },
  editSummary: { gap: Spacing.three },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  editTag: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  actions: { gap: Spacing.three },
});
