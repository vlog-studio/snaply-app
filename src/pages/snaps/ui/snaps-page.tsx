import { useIsFocused, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { MovieSnapLimit, useMovieById } from '@/entities/movie';
import type { Snap } from '@/entities/snap';
import { TrayCapacity, useAddSnapsToTray, useTraySnapIds } from '@/entities/tray';
import { useComposeMovie } from '@/features/compose-movie';
import { useDeleteSnaps } from '@/features/delete-snap';
import { formatDuration } from '@/shared/lib/datetime';
import { useSetTabBarHidden } from '@/shared/ui/tab-bar-chrome';
import {
  MaxContentWidth,
  Radius,
  Spacing,
  useTabBarHeight,
  useTheme,
  useTopContentInset,
} from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';
import { VideoPlayerModal } from '@/shared/ui/video-player-modal';

import { useMovieDeleteImpact } from '../model/use-movie-delete-impact';
import { useSnapDays } from '../model/use-snap-days';
import { SnapCell } from './snap-cell';
import { SnapDeleteDialog } from './snap-delete-dialog';
import { SnapSelectionBar } from './snap-selection-bar';

export type SnapsPageProps = {
  /** `?select=1` — the studio or a movie screen sends the user here to pick. */
  startSelecting?: boolean;
  /**
   * `?for=<movieId>` — a movie screen's "스냅 더 넣기". Picks go straight into that
   * movie's cut list instead of the tray, and the cap shown is the movie's
   * remaining room. Without it, picks go to the tray as usual.
   */
  forMovieId?: string;
};

/** Three columns, as in the mockup: wide enough to read, dense enough to scan. */
const Columns = 3;

/**
 * The snap library — every 3–5 second original the user has shot, grouped by day.
 *
 * A tap plays a snap; there is no blur and nothing to unlock, because the app no
 * longer withholds what was just recorded. Selection mode is what turns the
 * library into a picking surface: chosen snaps go to the studio's tray, not
 * straight into a movie, so material can be gathered across several days
 * (concept §5).
 *
 * The one exception is a movie's "스냅 더 넣기", which arrives with a movie id
 * and appends to that movie directly. Routing those picks through the tray would
 * make the user leave the movie, empty the tray, and come back.
 */
export function SnapsPage({ startSelecting = false, forMovieId }: SnapsPageProps) {
  const theme = useTheme();
  const router = useRouter();
  const topInset = useTopContentInset();
  const tabBarHeight = useTabBarHeight();
  const { days, totalCount, isHydrated } = useSnapDays();
  const traySnapIds = useTraySnapIds();
  const addSnapsToTray = useAddSnapsToTray();
  const targetMovie = useMovieById(forMovieId);
  const { appendSnaps } = useComposeMovie();
  const { deleteSnaps, deletingIds, errorMessage, clearError } = useDeleteSnaps();
  const { width: windowWidth } = useWindowDimensions();
  const setTabBarHidden = useSetTabBarHidden();
  const isFocused = useIsFocused();

  const [selecting, setSelecting] = useState(startSelecting);
  // Ordered, not a Set: the pick order is what becomes the tray order, and the
  // cells show it as a number.
  const [picked, setPicked] = useState<string[]>([]);
  const [playing, setPlaying] = useState<Snap>();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [notice, setNotice] = useState<string>();

  const impact = useMovieDeleteImpact(deleteOpen ? picked : EmptySelection);
  // The delete sheet reports the tray specifically, whatever the picks are for:
  // deleting a snap empties it out of the tray as well as out of every movie.
  const pickedInTray = picked.filter((snapId) => traySnapIds.includes(snapId)).length;

  // The grid's cell width, derived instead of measured (the content column is
  // centered, capped at MaxContentWidth, and padded) so the cells lay out on
  // their very first frame.
  const gridWidth = Math.min(windowWidth, MaxContentWidth) - Spacing.five * 2;
  const cellWidth = Math.floor((gridWidth - Spacing.one * (Columns - 1)) / Columns);

  // Arriving with `?select=1` (the studio's tray sending the user to pick)
  // opens selection mode. The tab stays mounted across visits, so the initial
  // state is not enough — the prop change has to be noticed. Adjusted during
  // render rather than in an effect: React re-runs this render before painting,
  // so the screen never flashes out of selection mode first.
  const [lastStartSelecting, setLastStartSelecting] = useState(startSelecting);
  if (startSelecting !== lastStartSelecting) {
    setLastStartSelecting(startSelecting);
    if (startSelecting) setSelecting(true);
  }

  const exitSelection = useCallback(() => {
    setSelecting(false);
    setPicked([]);
    setNotice(undefined);
  }, []);

  // Android hardware back leaves selection mode instead of leaving the tab.
  useEffect(() => {
    if (!selecting) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      exitSelection();
      return true;
    });
    return () => subscription.remove();
  }, [selecting, exitSelection]);

  // Selection swaps the bottom chrome: the tab bar and the capture button out,
  // the SnapSelectionBar in. The navigator paints its bar above every scene, so
  // without this the tab items and the capture button cover the selection bar's
  // actions and take the taps aimed at them.
  //
  // Derived from `selecting` rather than flipped at each enter and exit, since
  // selection can also begin during render (the `?select=1` arrival below): one
  // effect covers every path in and out, and its cleanup always puts the bar
  // back. Focus belongs in the condition, not just the cleanup — this tab stays
  // mounted if something navigates away mid-selection, and a hidden bar on a
  // screen whose selection bar is not on display would leave the app with no
  // bottom chrome at all. Returning re-hides it, so the picks survive the trip.
  useEffect(() => {
    if (!selecting || !isFocused) return;
    setTabBarHidden(true);
    return () => setTabBarHidden(false);
  }, [selecting, isFocused, setTabBarHidden]);

  // Which container the picks are headed for decides both the room left and
  // what "already in it" means.
  const heldIds = targetMovie
    ? new Set(targetMovie.snapRefs.map((ref) => ref.snapId))
    : new Set(traySnapIds);
  const heldCount = targetMovie ? targetMovie.snapRefs.length : traySnapIds.length;
  const capacity = targetMovie ? MovieSnapLimit : TrayCapacity;
  const room = Math.max(capacity - heldCount, 0);

  const togglePick = (snap: Snap) => {
    if (picked.includes(snap.id)) {
      setNotice(undefined);
      setPicked(picked.filter((snapId) => snapId !== snap.id));
      return;
    }
    // Snaps the target already holds take no new room, so they never hit the cap.
    const wouldTake = picked.filter((snapId) => !heldIds.has(snapId)).length;
    if (!heldIds.has(snap.id) && wouldTake >= room) {
      setNotice(
        room === 0
          ? targetMovie
            ? `이 무비는 이미 스냅 ${MovieSnapLimit}개를 갖고 있어요.`
            : '트레이가 가득 찼어요. 스튜디오에서 먼저 비워주세요.'
          : `한 편에는 스냅 ${MovieSnapLimit}개까지 들어가요. 지금은 ${room}개만 더 담을 수 있어요.`,
      );
      return;
    }
    setNotice(undefined);
    setPicked([...picked, snap.id]);
  };

  const handlePress = (snap: Snap) => {
    if (selecting) togglePick(snap);
    else setPlaying(snap);
  };

  const handleLongPress = (snap: Snap) => {
    if (selecting) return;
    setSelecting(true);
    setPicked([snap.id]);
  };

  const confirmPicks = () => {
    if (targetMovie) {
      const outcome = appendSnaps(targetMovie.id, picked);
      if (outcome.refused) {
        setNotice(
          outcome.refused === 'full'
            ? `이 무비에는 ${room}개만 더 넣을 수 있어요.`
            : '이 무비는 더 이상 컷을 고칠 수 없어요.',
        );
        return;
      }
      exitSelection();
      // Back to the movie the user came from, where the new cuts are waiting.
      router.back();
      return;
    }

    const outcome = addSnapsToTray(picked);
    exitSelection();
    // The studio is where the tray lives, so land there — the user should see
    // what they just collected.
    router.navigate('/');
    if (outcome.rejected > 0) {
      setNotice(`${outcome.added}개를 담았어요. ${outcome.rejected}개는 자리가 없어 빠졌어요.`);
    }
  };

  const confirmDelete = async () => {
    const targets = days
      .flatMap((day) => day.snaps)
      .filter((snap) => picked.includes(snap.id))
      .map((snap) => ({ id: snap.id, uri: snap.uri }));

    const deletedIds = await deleteSnaps(targets);
    if (deletedIds.length === targets.length) {
      setDeleteOpen(false);
      exitSelection();
    } else {
      // Some files survived; keep the sheet open with its error and drop the
      // ones that did go, so a retry only targets what is left.
      setPicked((current) => current.filter((snapId) => !deletedIds.includes(snapId)));
    }
  };

  const closeDelete = () => {
    setDeleteOpen(false);
    clearError();
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Spacing.six + topInset,
            paddingBottom: Spacing.seven + (selecting ? SelectionBarRoom : tabBarHeight),
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.titleText}>
              <ThemedText type="title">스냅</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {totalCount}개 · 3–5초 원본
              </ThemedText>
            </View>
            {totalCount > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={selecting ? '선택 취소' : '스냅 선택'}
                hitSlop={12}
                onPress={() => (selecting ? exitSelection() : setSelecting(true))}
                style={styles.headerAction}
              >
                <ThemedText selectable={false} type="smallBold" themeColor="primary">
                  {selecting ? '취소' : '선택'}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        </View>

        {notice ? (
          <View
            style={[
              styles.notice,
              { borderColor: theme.border, backgroundColor: theme.warmSurface },
            ]}
          >
            <ThemedText type="small">{notice}</ThemedText>
          </View>
        ) : null}

        {days.map((day) => (
          <View key={day.key} style={styles.day}>
            <View style={styles.dayHead}>
              <ThemedText type="smallBold">{day.label}</ThemedText>
              <ThemedText type="edge" themeColor="textSecondary">
                {day.snaps.length}개 · {formatDuration(totalSecOf(day.snaps))}
              </ThemedText>
            </View>
            <View style={styles.grid}>
              {day.snaps.map((snap) => {
                const index = picked.indexOf(snap.id);
                return (
                  <SnapCell
                    key={snap.id}
                    snap={snap}
                    width={cellWidth}
                    pickNumber={index >= 0 ? index + 1 : undefined}
                    selecting={selecting}
                    isHeld={heldIds.has(snap.id)}
                    onPress={handlePress}
                    onLongPress={handleLongPress}
                  />
                );
              })}
            </View>
          </View>
        ))}

        {isHydrated && totalCount === 0 ? (
          <View style={[styles.empty, { borderColor: theme.border }]}>
            <ThemedText type="heading">아직 찍은 스냅이 없어요</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.centerText}>
              아래 가운데 버튼을 눌러 3–5초짜리 장면을 찍어보세요. 모아둔 스냅이 무비의 재료가 돼요.
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>

      {selecting ? (
        <SnapSelectionBar
          selectedCount={picked.length}
          heldCount={heldCount}
          capacity={capacity}
          targetLabel={targetMovie ? targetMovie.title : '트레이'}
          confirmLabel={targetMovie ? '이 무비에 넣기' : '트레이에 담기'}
          onClear={() => setPicked([])}
          onConfirm={confirmPicks}
          onDelete={() => setDeleteOpen(true)}
        />
      ) : null}

      <VideoPlayerModal
        uri={playing?.uri}
        closeLabel="스냅 닫기"
        edgeLabel={playing ? `${playing.durationSec}초` : undefined}
        onClose={() => setPlaying(undefined)}
      />

      <SnapDeleteDialog
        visible={deleteOpen}
        count={picked.length}
        impact={impact}
        trayCount={pickedInTray}
        isDeleting={deletingIds.size > 0}
        errorMessage={errorMessage}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
      />
    </View>
  );
}

/** Stable reference, so the impact hook does not recompute on every render. */
const EmptySelection: string[] = [];

// Room the selection bar takes at the bottom of the scroll: its two rows plus
// the safe-area padding it adds itself.
const SelectionBarRoom = 132;

function totalSecOf(snaps: readonly Snap[]): number {
  return snaps.reduce((sum, snap) => sum + snap.durationSec, 0);
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.five,
  },
  header: { gap: Spacing.two },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleText: { gap: Spacing.half },
  headerAction: { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
  notice: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    padding: Spacing.three,
  },
  day: { gap: Spacing.two },
  dayHead: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
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
