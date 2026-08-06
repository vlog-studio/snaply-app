import { useIsFocused, useRouter, useScrollToTop } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { Snap } from '@/entities/snap';
import { TrayCapacity, useAddSnapsToTray, useTraySnapIds } from '@/entities/tray';
import { useDeleteSnaps } from '@/features/delete-snap';
import { formatSeconds } from '@/shared/lib/datetime';
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
import { SnapDayGrid, SnapSelectionBar, useSnapDays, useSnapPicking } from '@/widgets/snap-grid';

import { useMovieDeleteImpact } from '../model/use-movie-delete-impact';
import { SnapDeleteDialog } from './snap-delete-dialog';

export type SnapsPageProps = {
  /** `?select=1` — the studio sends the user here to pick for the tray. */
  startSelecting?: boolean;
};

/**
 * The snap library — every 3–5 second original the user has shot, grouped by day.
 *
 * A tap plays a snap; there is no blur and nothing to unlock, because the app no
 * longer withholds what was just recorded. Selection mode is what turns the
 * library into a picking surface: chosen snaps go to the studio's tray, not
 * straight into a movie, so material can be gathered across several days
 * (concept §5).
 *
 * Picking *into a movie* is a different screen — `/movie/[id]/add-snaps`, on the
 * root stack — even though it draws the same grid. It used to be this one under
 * `?for=<movieId>`, which meant a movie screen had to push a tab route: that
 * mounts a second copy of the tab navigator over the movie, and the tab
 * navigator then answers the confirming `back` by switching tabs instead of
 * returning to the movie the user came from.
 */
export function SnapsPage({ startSelecting = false }: SnapsPageProps) {
  const theme = useTheme();
  const router = useRouter();
  const topInset = useTopContentInset();
  const tabBarHeight = useTabBarHeight();
  const { days, totalCount, isHydrated } = useSnapDays();
  const traySnapIds = useTraySnapIds();
  const addSnapsToTray = useAddSnapsToTray();
  const { deleteSnaps, deletingIds, errorMessage, clearError } = useDeleteSnaps();
  const setTabBarHidden = useSetTabBarHidden();
  const isFocused = useIsFocused();

  // Re-tapping the 스냅 tab returns to today; switching tabs keeps the day the
  // user had scrolled to. Selection mode takes the tab bar away entirely, so
  // there is no tab to re-tap while picks are in progress.
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const [selecting, setSelecting] = useState(startSelecting);
  const [playing, setPlaying] = useState<Snap>();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const heldIds = useMemo(() => new Set(traySnapIds), [traySnapIds]);
  const { picked, notice, toggle, drop, clear, reset, announce } = useSnapPicking({
    heldIds,
    heldCount: traySnapIds.length,
    capacity: TrayCapacity,
    describeRefusal: (room) =>
      room === 0
        ? '트레이가 가득 찼어요. 스튜디오에서 먼저 비워주세요.'
        : `한 편에는 스냅 ${TrayCapacity}개까지 들어가요. 지금은 ${room}개만 더 담을 수 있어요.`,
  });

  const impact = useMovieDeleteImpact(deleteOpen ? picked : EmptySelection);
  // The delete sheet reports the tray specifically: deleting a snap empties it
  // out of the tray as well as out of every movie.
  const pickedInTray = picked.filter((snapId) => traySnapIds.includes(snapId)).length;

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
    reset();
  }, [reset]);

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

  const handlePress = (snap: Snap) => {
    if (selecting) toggle(snap.id);
    else setPlaying(snap);
  };

  const handleLongPress = (snap: Snap) => {
    if (selecting) return;
    setSelecting(true);
    toggle(snap.id);
  };

  const confirmPicks = () => {
    const outcome = addSnapsToTray(picked);
    exitSelection();
    // The studio is where the tray lives, so land there — the user should see
    // what they just collected.
    router.navigate('/');
    if (outcome.rejected > 0) {
      announce(`${outcome.added}개를 담았어요. ${outcome.rejected}개는 자리가 없어 빠졌어요.`);
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
      drop(deletedIds);
    }
  };

  const closeDelete = () => {
    setDeleteOpen(false);
    clearError();
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        ref={scrollRef}
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

        <SnapDayGrid
          days={days}
          selecting={selecting}
          picked={picked}
          heldIds={heldIds}
          onPress={handlePress}
          onLongPress={handleLongPress}
        />

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
          heldCount={traySnapIds.length}
          capacity={TrayCapacity}
          targetLabel="트레이"
          confirmLabel="트레이에 담기"
          onClear={clear}
          onConfirm={confirmPicks}
          onDelete={() => setDeleteOpen(true)}
        />
      ) : null}

      <VideoPlayerModal
        uri={playing?.uri}
        closeLabel="스냅 닫기"
        edgeLabel={playing ? formatSeconds(playing.durationSec) : undefined}
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
