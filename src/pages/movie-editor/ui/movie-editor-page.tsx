import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MovieSnapLimit } from '@/entities/movie';
import { SnaplyButton } from '@/shared/ui/snaply-button';
import { MaxContentWidth, Radius, Spacing, useTheme, useTopContentInset } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import { useMovieEditor } from '../model/use-movie-editor';
import { CutRow } from './cut-row';
import { WizardSteps } from './wizard-steps';

export type MovieEditorPageProps = {
  movieId?: string;
};

const RefusalMessages = {
  empty: '컷이 최소 1개는 있어야 해요.',
  full: `한 편에는 스냅 ${MovieSnapLimit}개까지 들어가요.`,
  frozen: '생성이 시작된 무비는 컷을 고칠 수 없어요.',
} as const;

/**
 * The movie editor — step ① of the three-step wizard: the cut list.
 *
 * The order and trim decided here are kept exactly as they are; generation only
 * handles transitions, grading, and music (concept §6). That is the rule the
 * whole editor exists for, so the screen says it out loud.
 *
 * Steps ② (style) and ③ (generation) are not built yet. The header shows all
 * three so the flow is legible, and 다음 explains that rather than dead-ending.
 */
export function MovieEditorPage({ movieId }: MovieEditorPageProps) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = useTopContentInset();
  const { movie, cuts, totalSec, isDirty, canEdit, refusal, moveCut, removeCut, save, discard } =
    useMovieEditor(movieId);

  if (!movie) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: theme.background }]}>
        <ThemedText type="heading">무비를 찾을 수 없어요</ThemedText>
        <ThemedText themeColor="textSecondary">이미 사라졌거나 잘못된 주소예요.</ThemedText>
      </View>
    );
  }

  const room = Math.max(MovieSnapLimit - cuts.length, 0);

  const addSnaps = () => {
    router.push({ pathname: '/snaps', params: { select: '1', for: movie.id } });
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Spacing.four + topInset, paddingBottom: Spacing.seven },
        ]}
      >
        <View style={styles.header}>
          <ThemedText type="title" numberOfLines={1}>
            {movie.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {isDirty ? '저장하지 않은 변경이 있어요' : '초안으로 저장돼 있어요'}
          </ThemedText>
        </View>

        <WizardSteps current={0} />

        <View style={styles.sectionHead}>
          <ThemedText type="smallBold">컷 순서</ThemedText>
          <ThemedText type="edge" themeColor="textSecondary">
            {cuts.length} / {MovieSnapLimit} · {totalSec}초
          </ThemedText>
        </View>

        <View style={styles.cuts}>
          {cuts.map((cut, index) => (
            <CutRow
              key={cut.ref.snapId}
              cut={cut}
              index={index}
              isFirst={index === 0}
              isLast={index === cuts.length - 1}
              canEdit={canEdit}
              canRemove={cuts.length > 1}
              onMove={moveCut}
              onRemove={removeCut}
            />
          ))}
        </View>

        {refusal ? (
          <View
            style={[
              styles.notice,
              { borderColor: theme.border, backgroundColor: theme.warmSurface },
            ]}
          >
            <ThemedText type="small">{RefusalMessages[refusal]}</ThemedText>
          </View>
        ) : null}

        {canEdit ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="스냅 더 넣기"
            accessibilityState={{ disabled: room === 0 }}
            disabled={room === 0}
            onPress={addSnaps}
            style={[styles.addCut, { borderColor: theme.border, opacity: room === 0 ? 0.45 : 1 }]}
          >
            <ThemedText selectable={false} type="smallBold" themeColor="primary">
              + 스냅 더 넣기{room > 0 ? ` (${room}개 더)` : ''}
            </ThemedText>
          </Pressable>
        ) : null}

        <ThemedText type="small" themeColor="textSecondary">
          여기서 정한 순서는 그대로 유지돼요. AI는 전환·색보정·음악만 맡습니다.
        </ThemedText>

        <View style={[styles.comingUp, { borderColor: theme.border }]}>
          <ThemedText type="edge" themeColor="lumen">
            다음 단계
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            스타일·배경음악을 고르고 AI 생성을 돌리는 단계는 아직 준비 중이에요. 지금은 컷 구성까지
            저장할 수 있어요.
          </ThemedText>
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
        {isDirty ? (
          <View style={styles.footerRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="변경 취소"
              onPress={discard}
              style={[styles.secondaryAction, { borderColor: theme.border }]}
            >
              <ThemedText selectable={false} type="button" themeColor="textSecondary">
                되돌리기
              </ThemedText>
            </Pressable>
            <SnaplyButton title="컷 구성 저장" onPress={save} style={styles.primaryAction} />
          </View>
        ) : (
          <SnaplyButton
            title="스튜디오로 돌아가기"
            variant="secondary"
            onPress={() => router.back()}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.six,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.four,
  },
  header: { gap: Spacing.half },
  sectionHead: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  cuts: { gap: Spacing.two },
  notice: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    padding: Spacing.three,
  },
  addCut: {
    minHeight: 48,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingUp: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    padding: Spacing.three,
    gap: Spacing.one,
  },
  footer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.four,
  },
  footerRow: { flexDirection: 'row', gap: Spacing.two },
  primaryAction: { flex: 1 },
  secondaryAction: {
    minHeight: 56,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
