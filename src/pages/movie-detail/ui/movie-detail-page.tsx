import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { movieBgmLabel, movieStyleLabel } from '@/entities/movie';
import { RenameMovieSheet } from '@/features/rename-movie';
import { formatDateTime, formatSeconds } from '@/shared/lib/datetime';
import { SnaplyButton } from '@/shared/ui/snaply-button';
import { MaxContentWidth, Radius, Spacing, useTheme, useTopContentInset } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import { useMoviePlayback } from '../model/use-movie-playback';
import { useShareMovie } from '../model/use-share-movie';
import { CutPlayer } from './cut-player';

export type MovieDetailPageProps = {
  movieId?: string;
};

/**
 * A finished movie: watch it, and see what it was made of.
 *
 * This is where a `ready` movie opens from the studio and the movie tab, rather
 * than the editor — the thing to do with a finished movie is watch it, and its cuts
 * and settings are fixed until regeneration exists. Renaming is not: a movie
 * usually earns its name here, once it has been seen.
 */
export function MovieDetailPage({ movieId }: MovieDetailPageProps) {
  const theme = useTheme();
  const router = useRouter();
  const topInset = useTopContentInset();
  const { movie, cuts, totalSec } = useMoviePlayback(movieId);
  const sharing = useShareMovie(movie);
  const [renaming, setRenaming] = useState(false);

  if (!movie) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: theme.background }]}>
        <ThemedText type="heading">무비를 찾을 수 없어요</ThemedText>
        <ThemedText themeColor="textSecondary">이미 사라졌거나 잘못된 주소예요.</ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Spacing.four + topInset, paddingBottom: Spacing.seven },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <ThemedText type="title" numberOfLines={1}>
              {movie.title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              컷 {movie.snapRefs.length}개 · {formatSeconds(totalSec)}
            </ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="무비 이름 바꾸기"
            hitSlop={8}
            onPress={() => setRenaming(true)}
          >
            <ThemedText selectable={false} type="smallBold" themeColor="primary">
              이름
            </ThemedText>
          </Pressable>
        </View>

        {cuts.length > 0 ? (
          <CutPlayer cuts={cuts} />
        ) : (
          <View style={[styles.empty, { borderColor: theme.border }]}>
            <ThemedText type="heading">재생할 컷이 없어요</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.centerText}>
              이 무비가 쓰던 스냅 원본이 모두 지워졌어요.
            </ThemedText>
          </View>
        )}

        <View style={[styles.recipe, { backgroundColor: theme.backgroundElement }]}>
          <RecipeRow label="스타일" value={movieStyleLabel(movie.style)} />
          <Divider />
          <RecipeRow label="배경 음악" value={movieBgmLabel(movie.bgm)} />
          <Divider />
          <RecipeRow label="자동 자막" value={movie.captions ? '켬' : '끔'} />
          <Divider />
          <RecipeRow label="비율" value={movie.ratio} />
          {movie.render ? (
            <>
              <Divider />
              <RecipeRow label="완성" value={formatDateTime(movie.render.renderedAt)} />
            </>
          ) : null}
        </View>

        <SnaplyButton
          title="무비 공유"
          variant="ai"
          disabled={sharing.blocked !== undefined}
          onPress={sharing.share}
        />

        <View style={[styles.notice, { borderColor: theme.border }]}>
          <ThemedText type="edge" themeColor="lumen">
            아직 프로토타입
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            합성된 영상 파일은 아직 없어요. 여기 보이는 건 정한 순서와 길이대로 컷을 이어 붙인
            재생이고, 스타일·음악은 설정으로만 저장돼 있어요.
            {sharing.blocked === 'no-render'
              ? ' 내보낼 파일이 없어서 공유도 아직 눌러지지 않아요 — 합성이 붙는 순간 열립니다.'
              : ''}
          </ThemedText>
        </View>

        <SnaplyButton title="무비 목록으로" variant="secondary" onPress={() => router.back()} />
      </ScrollView>

      <RenameMovieSheet
        key={`${movie.id}:${movie.title}`}
        visible={renaming}
        movieId={movie.id}
        title={movie.title}
        onClose={() => setRenaming(false)}
      />
    </View>
  );
}

function RecipeRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.recipeRow}>
      <ThemedText type="small">{label}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {value}
      </ThemedText>
    </View>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.border }]} />;
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
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  headerCopy: { flex: 1, gap: Spacing.half },
  recipe: {
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  recipeRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  divider: { height: StyleSheet.hairlineWidth },
  notice: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    padding: Spacing.three,
    gap: Spacing.one,
  },
  empty: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.large,
    borderCurve: 'continuous',
    padding: Spacing.five,
    gap: Spacing.two,
    alignItems: 'center',
  },
  centerText: { textAlign: 'center' },
});
