import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import type { Snap } from '@/entities/snap';
import { TrayCapacity, useAddSnapsToTray, useTraySnapIds } from '@/entities/tray';
import { useDeleteSnaps } from '@/features/delete-snap';
import { formatDuration } from '@/shared/lib/datetime';
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
  /** `?select=1` — the studio sends the user here to pick material. */
  startSelecting?: boolean;
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
  const { width: windowWidth } = useWindowDimensions();

  const [selecting, setSelecting] = useState(startSelecting);
  // Ordered, not a Set: the pick order is what becomes the tray order, and the
  // cells show it as a number.
  const [picked, setPicked] = useState<string[]>([]);
  const [playing, setPlaying] = useState<Snap>();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [notice, setNotice] = useState<string>();

  const trayIds = new Set(traySnapIds);
  const impact = useMovieDeleteImpact(deleteOpen ? picked : EmptySelection);
  const pickedInTray = picked.filter((snapId) => trayIds.has(snapId)).length;

  // The grid's cell width, derived instead of measured (the content column is
  // centered, capped at MaxContentWidth, and padded) so the cells lay out on
  // their very first frame.
  const gridWidth = Math.min(windowWidth, MaxContentWidth) - Spacing.five * 2;
  const cellWidth = Math.floor((gridWidth - Spacing.two * (Columns - 1)) / Columns);

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

  const room = Math.max(TrayCapacity - traySnapIds.length, 0);

  const togglePick = (snap: Snap) => {
    if (picked.includes(snap.id)) {
      setNotice(undefined);
      setPicked(picked.filter((snapId) => snapId !== snap.id));
      return;
    }
    // Snaps already in the tray take no new room, so they never hit the cap.
    const wouldTake = picked.filter((snapId) => !trayIds.has(snapId)).length;
    if (!trayIds.has(snap.id) && wouldTake >= room) {
      setNotice(
        room === 0
          ? '트레이가 가득 찼어요. 스튜디오에서 먼저 비워주세요.'
          : `한 편에는 스냅 ${TrayCapacity}개까지 들어가요. 지금은 ${room}개만 더 담을 수 있어요.`,
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

  const addToTray = () => {
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
                    inTray={trayIds.has(snap.id)}
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
          trayCount={traySnapIds.length}
          onClear={() => setPicked([])}
          onAddToTray={addToTray}
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
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
