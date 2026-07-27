import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, BackHandler, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Clip } from '@/entities/clip';
import { useDeleteClips } from '@/features/delete-clip';
import { formatRecordingDate } from '@/features/manage-recordings';
import { localRecordingExists } from '@/shared/lib/recording-files';
import { FadeInView } from '@/shared/ui/fade-in-view';
import { SnaplyButton } from '@/shared/ui/snaply-button';
import { MaxContentWidth, Radius, Spacing, useTheme, useTopContentInset } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';
import { VideoPreview } from '@/shared/ui/video-preview';
import { selectRollsForClips, useClipMembership } from '@/widgets/clip-membership';

import {
  useCutRollFilters,
  useCutStrip,
  type CutFilter,
  type StripCut,
} from '../model/use-cut-strip';
import { CutFilmStrip } from './cut-film-strip';
import { CutFilterBar } from './cut-filter-bar';
import { CutRollPickerSheet } from './cut-roll-picker-sheet';
import { CutSelectionBar, CutSelectionBarContentHeight } from './cut-selection-bar';
import { CutSheet } from './cut-sheet';

const AllCuts: CutFilter = { kind: 'all' };

/** The cut the sheet is open on, with whether its original is still on disk. */
type OpenCut = { cut: StripCut; hasFile: boolean };

/**
 * Every original cut, reached from the cabinet's drawer.
 *
 * A day is a horizontal strip of film, not a row of a grid: frames sit between
 * sprocket holes in the order they were captured, and each day scrolls on its
 * own axis. What a grid could never say, the strip does — the colored dots under
 * a frame are the rolls holding that cut, so N:M is visible without opening
 * anything, and a frame with a dashed amber edge is one no roll holds at all.
 *
 * The screen reads from `entities/clip` rather than the recording files on disk.
 * The clip store is what rolls reference and what carries duration, mood, and
 * orientation; the file list could only ever answer "what is on disk".
 *
 * This screen reads. Collecting actions — 새 롤로 묶기, 롤에 담기, 롤에서 빼기 —
 * arrive with the write step, along with the delete dialog that names the rolls
 * a deletion changes.
 */
export function CutStripPage() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = useTopContentInset();
  const [filter, setFilter] = useState<CutFilter>(AllCuts);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [rollPickerVisible, setRollPickerVisible] = useState(false);
  const [openCut, setOpenCut] = useState<OpenCut>();
  const [playingClip, setPlayingClip] = useState<Clip>();

  const strip = useCutStrip(filter);
  const rollFilters = useCutRollFilters();
  // Deleting an original is a cross-entity action (file + thumbnail + clip
  // metadata + every roll's references), so it lives in its own feature rather
  // than in the recording-file hook that only knows about files.
  const { deleteClips, deletingIds, errorMessage } = useDeleteClips();
  const clipMembership = useClipMembership();

  const visibleCuts = useMemo(
    () => strip.days.flatMap((day) => day.cuts.map((cut) => cut.clip)),
    [strip.days],
  );
  const activeRoll =
    filter.kind === 'roll' ? rollFilters.find((roll) => roll.rollId === filter.rollId) : undefined;

  const exitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  // Narrowing the strip takes frames off screen, and a selection the user can
  // no longer see is one they cannot check before deleting. Leave selection
  // mode on, drop what it held.
  const applyFilter = useCallback((next: CutFilter) => {
    setFilter(next);
    setSelectedIds(new Set());
  }, []);

  useFocusEffect(
    // Returning to a screen still in selection mode would show a bar over a
    // list the user has lost track of — always leave it clean.
    useCallback(() => () => exitSelection(), [exitSelection]),
  );

  // Android hardware back exits selection mode instead of leaving the screen.
  useEffect(() => {
    if (!selectionMode) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      exitSelection();
      return true;
    });
    return () => subscription.remove();
  }, [selectionMode, exitSelection]);

  const toggleSelected = useCallback((cut: StripCut) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(cut.clip.id)) next.delete(cut.clip.id);
      else next.add(cut.clip.id);
      return next;
    });
  }, []);

  const handlePressCut = useCallback(
    (cut: StripCut) => {
      if (selectionMode) {
        toggleSelected(cut);
        return;
      }
      // A clip's metadata can outlive its file, so resolve that once here rather
      // than letting the sheet offer a playback that cannot happen.
      setOpenCut({ cut, hasFile: localRecordingExists(cut.clip.uri) });
    },
    [selectionMode, toggleSelected],
  );

  const enterSelection = useCallback((cut: StripCut) => {
    setSelectionMode(true);
    setSelectedIds(new Set([cut.clip.id]));
  }, []);

  // Select-all covers what the filter is showing, not the whole archive — the
  // frames off screen are not what the user is looking at.
  const allSelected = visibleCuts.length > 0 && selectedIds.size === visibleCuts.length;

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((current) =>
      current.size === visibleCuts.length
        ? new Set()
        : new Set(visibleCuts.map((clip) => clip.id)),
    );
  }, [visibleCuts]);

  const confirmDelete = useCallback(
    (targets: Clip[]) => {
      if (targets.length === 0) return;

      // Deleting an original takes it out of every roll that references it, so
      // name how many rolls change before asking. Removing a cut from one roll
      // while keeping the original is a separate action (roll detail).
      const affectedRolls = selectRollsForClips(
        clipMembership,
        targets.map((target) => target.id),
      );
      const rollNotice =
        affectedRolls.length > 0
          ? ` 이 컷이 든 롤 ${affectedRolls.length}개에서도 함께 사라져요.`
          : '';

      Alert.alert(
        `${targets.length}개 컷을 삭제할까요?`,
        `삭제한 원본은 복구할 수 없어요.${rollNotice}`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: () => {
              void deleteClips(targets);
              setOpenCut(undefined);
              exitSelection();
            },
          },
        ],
      );
    },
    [clipMembership, deleteClips, exitSelection],
  );

  const isEmptyArchive = strip.isHydrated && strip.totalCount === 0;
  const isEmptyFilter = strip.isHydrated && strip.totalCount > 0 && strip.count === 0;

  return (
    <>
      {/* A pushed screen with a native header, so it offsets its own content
          the way roll detail does rather than relying on the automatic inset
          the headerless tab screens use. */}
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Spacing.five + topInset,
            // Nothing but the selection bar occupies the bottom edge here — the
            // screen is pushed over the tabs, so there is no tab bar to clear.
            paddingBottom:
              Spacing.six + (selectionMode ? insets.bottom + CutSelectionBarContentHeight : 0),
          },
        ]}
      >
        <View style={styles.header}>
          <ThemedText type="edge" themeColor="amber">
            NEGATIVE · {strip.totalCount} FRAMES
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            하루가 스트립 한 줄이에요. 프레임 아래 색 점이 이 컷이 든 롤이에요.
          </ThemedText>
        </View>

        <FadeInView duration={260} style={styles.list}>
          {errorMessage ? (
            <View style={[styles.messageCard, { borderColor: theme.danger }]}>
              <ThemedText type="smallBold" themeColor="danger">
                {errorMessage}
              </ThemedText>
            </View>
          ) : null}

          {!strip.isHydrated ? (
            <View style={[styles.messageCard, { borderColor: theme.border }]}>
              <ThemedText themeColor="textSecondary">담긴 컷을 불러오는 중이에요…</ThemedText>
            </View>
          ) : null}

          {isEmptyArchive ? (
            <View style={[styles.emptyCard, { borderColor: theme.border }]}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.film }]}>
                <ThemedText
                  selectable={false}
                  style={[styles.emptyIconText, { color: theme.amber }]}
                >
                  ●
                </ThemedText>
              </View>
              <View style={styles.emptyCopy}>
                <ThemedText type="heading">아직 담은 컷이 없어요</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.centerText}>
                  순간을 담으면 이 보관함에 원본 컷으로 쌓여요.
                </ThemedText>
              </View>
              <Link href="/capture" asChild>
                <SnaplyButton title="첫 순간 담기" icon="●" />
              </Link>
            </View>
          ) : null}

          {strip.totalCount > 0 ? (
            <>
              <CutFilterBar
                filter={filter}
                looseCount={strip.looseCount}
                activeRoll={activeRoll}
                canFilterByRoll={rollFilters.length > 0}
                onSelect={applyFilter}
                onOpenRollPicker={() => setRollPickerVisible(true)}
              />

              <View style={styles.toolbar}>
                <ThemedText type="edge" themeColor="textSecondary">
                  {selectionMode ? '탭해서 선택' : '길게 눌러 선택'}
                </ThemedText>
                {selectionMode ? null : (
                  <Pressable
                    accessibilityLabel="선택 모드"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => setSelectionMode(true)}
                    style={styles.toolbarAction}
                  >
                    <ThemedText selectable={false} type="edge" themeColor="primary">
                      선택
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            </>
          ) : null}

          {isEmptyFilter ? (
            <View style={[styles.emptyCard, { borderColor: theme.border }]}>
              <ThemedText type="smallBold">이 필터에 해당하는 컷이 없어요</ThemedText>
              <Pressable
                accessibilityLabel="필터 해제"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => applyFilter(AllCuts)}
              >
                <ThemedText type="linkPrimary">필터 해제</ThemedText>
              </Pressable>
            </View>
          ) : null}

          {strip.days.map((day) => (
            <CutFilmStrip
              key={day.dayKey}
              day={day}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              deletingIds={deletingIds}
              onPressCut={handlePressCut}
              onLongPressCut={enterSelection}
            />
          ))}

          {strip.totalCount > 0 ? (
            <ThemedText type="small" style={styles.storageNote} themeColor="textSecondary">
              원본 컷은 이 기기의 Snaply 앱 안에 저장되며 앱을 삭제하면 함께 사라져요.
            </ThemedText>
          ) : null}
        </FadeInView>
      </ScrollView>

      {/* Owns the bottom edge outright — this screen has no tab bar under it. */}
      {selectionMode ? (
        <CutSelectionBar
          selectedCount={selectedIds.size}
          allSelected={allSelected}
          onCancel={exitSelection}
          onToggleSelectAll={toggleSelectAll}
          onDelete={() => confirmDelete(visibleCuts.filter((clip) => selectedIds.has(clip.id)))}
        />
      ) : null}

      <CutSheet
        cut={openCut?.cut}
        hasFile={openCut?.hasFile ?? false}
        isDeleting={openCut ? deletingIds.has(openCut.cut.clip.id) : false}
        // The player opens over the sheet rather than replacing it: dismissing
        // one modal in the same commit that presents another is the fragile
        // case on iOS, and coming back to the cut you were reading is the
        // behavior you want anyway.
        onPlay={() => setPlayingClip(openCut?.cut.clip)}
        onDelete={() => openCut && confirmDelete([openCut.cut.clip])}
        onClose={() => setOpenCut(undefined)}
      />

      <CutRollPickerSheet
        visible={rollPickerVisible}
        rolls={rollFilters}
        selectedRollId={filter.kind === 'roll' ? filter.rollId : undefined}
        onSelect={(rollId) => {
          applyFilter({ kind: 'roll', rollId });
          setRollPickerVisible(false);
        }}
        onClose={() => setRollPickerVisible(false)}
      />

      <Modal
        animationType="fade"
        onRequestClose={() => setPlayingClip(undefined)}
        presentationStyle="fullScreen"
        visible={Boolean(playingClip)}
      >
        <View style={styles.previewScreen}>
          {playingClip ? (
            <VideoPreview
              key={playingClip.id}
              contentFit="contain"
              muted={false}
              nativeControls
              uri={playingClip.uri}
            />
          ) : null}
          <Pressable
            accessibilityLabel="컷 재생 닫기"
            accessibilityRole="button"
            onPress={() => setPlayingClip(undefined)}
            style={[styles.previewClose, { top: insets.top + Spacing.three }]}
          >
            <ThemedText selectable={false} style={styles.previewCloseText}>
              ×
            </ThemedText>
          </Pressable>
          {playingClip ? (
            <View style={[styles.previewMeta, { bottom: insets.bottom + Spacing.four }]}>
              <ThemedText type="edge" style={styles.previewMetaEdge}>
                {formatRecordingDate(playingClip.capturedAt)}
              </ThemedText>
              <ThemedText type="small" style={styles.mutedWhite}>
                {playingClip.durationSec}초 · 앱에 저장된 원본 컷
              </ThemedText>
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.five,
  },
  header: { gap: Spacing.two },
  list: { gap: Spacing.four },
  messageCard: { borderWidth: 1, borderRadius: Radius.medium, padding: Spacing.four },
  emptyCard: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.large,
    borderCurve: 'continuous',
    padding: Spacing.five,
    gap: Spacing.four,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconText: { fontSize: 22 },
  emptyCopy: { flex: 1, gap: Spacing.one, alignItems: 'center' },
  centerText: { textAlign: 'center' },
  toolbar: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  toolbarAction: { minHeight: 32, justifyContent: 'center' },
  storageNote: { textAlign: 'center', paddingTop: Spacing.two },
  previewScreen: { flex: 1, backgroundColor: '#000000' },
  previewClose: {
    position: 'absolute',
    left: Spacing.four,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(0,0,0,0.56)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCloseText: { color: '#FFFFFF', fontSize: 30, lineHeight: 32 },
  previewMeta: {
    position: 'absolute',
    left: Spacing.five,
    right: Spacing.five,
    alignItems: 'center',
    gap: Spacing.one,
    pointerEvents: 'none',
  },
  previewMetaEdge: { color: '#F1E6DA' },
  mutedWhite: { color: 'rgba(255,255,255,0.62)' },
});
