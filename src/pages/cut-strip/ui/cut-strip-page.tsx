import * as Haptics from 'expo-haptics';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Clip } from '@/entities/clip';
import { manualRollTitle, rollTint } from '@/entities/roll';
import { useCollectClips, useCollectTargets, type CollectOutcome } from '@/features/collect-clips';
import { useDeleteClips } from '@/features/delete-clip';
import { formatRecordingDate } from '@/features/manage-recordings';
import { localRecordingExists } from '@/shared/lib/recording-files';
import { FadeInView } from '@/shared/ui/fade-in-view';
import { SnaplyButton } from '@/shared/ui/snaply-button';
import { MaxContentWidth, Radius, Spacing, useTheme, useTopContentInset } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';
import { VideoPreview } from '@/shared/ui/video-preview';
import { useRollDeleteImpact, useRollsForClip } from '@/widgets/clip-membership';

import {
  useCutRollFilters,
  useCutStrip,
  type CutFilter,
  type StripCut,
} from '../model/use-cut-strip';
import { CutAddToRollSheet } from './cut-add-to-roll-sheet';
import { CutDeleteDialog } from './cut-delete-dialog';
import { CutFilmStrip } from './cut-film-strip';
import { CutFilterBar } from './cut-filter-bar';
import { CutNewRollSheet } from './cut-new-roll-sheet';
import { CutNotice, type StripNotice } from './cut-notice';
import { CutRollPickerSheet } from './cut-roll-picker-sheet';
import { CutSelectionBar, CutSelectionBarContentHeight } from './cut-selection-bar';
import { CutSheet } from './cut-sheet';

const AllCuts: CutFilter = { kind: 'all' };
const NoCuts: Clip[] = [];

/** The cut the sheet is open on, with whether its original is still on disk. */
type OpenCut = { cut: StripCut; hasFile: boolean };

/**
 * A roll being made by hand, from the moment the sheet opens until it takes.
 *
 * The page holds it rather than the sheet, because the draft belongs to the
 * selection it names: a second bundle must not inherit the first one's name.
 * `defaultTitle` is settled here too — it depends on the clock, which a render
 * may not read, and the day the sheet opened is the honest answer anyway.
 */
type BundleDraft = {
  cuts: Clip[];
  title: string;
  defaultTitle: string;
  errorMessage?: string;
};

/** What the selection bar prints next to the count, so a batch names its scope. */
function filterLabel(filter: CutFilter, activeRollTitle: string | undefined): string {
  switch (filter.kind) {
    case 'all':
      return '전체';
    case 'undeveloped':
      return '미현상';
    case 'loose':
      return '롤 없음';
    case 'roll':
      return activeRollTitle ?? '롤별';
  }
}

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
 * The screen writes as well as reads: cuts can be bundled into a roll of their
 * own, put into an existing roll, and taken back out — from both the selection
 * bar and the cut sheet — and deleting an original goes through a dialog that
 * names every roll the deletion rewrites.
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
  /** Cuts the add sheet is collecting for; its presence opens the sheet. */
  const [collecting, setCollecting] = useState<Clip[]>();
  /** The new-roll sheet's draft; its presence opens the sheet. */
  const [bundle, setBundle] = useState<BundleDraft>();
  /** Cuts waiting on the delete confirmation; its presence opens the dialog. */
  const [pendingDelete, setPendingDelete] = useState<Clip[]>();
  /** What the last collect action did, or why it could not. */
  const [notice, setNotice] = useState<StripNotice>();

  const strip = useCutStrip(filter);
  const rollFilters = useCutRollFilters();
  // Deleting an original is a cross-entity action (file + thumbnail + clip
  // metadata + every roll's references), so it lives in its own feature rather
  // than in the recording-file hook that only knows about files.
  const { deleteClips, deletingIds, errorMessage } = useDeleteClips();
  const { bundleIntoNewRoll, addClipsToRoll, removeClipsFromRoll } = useCollectClips();

  const collectingIds = useMemo(() => (collecting ?? NoCuts).map((clip) => clip.id), [collecting]);
  const pendingDeleteIds = useMemo(
    () => (pendingDelete ?? NoCuts).map((clip) => clip.id),
    [pendingDelete],
  );
  const collectTargets = useCollectTargets(collectingIds);
  const deleteImpacts = useRollDeleteImpact(pendingDeleteIds);
  // Read live: 빼기 inside the sheet changes the cut's rolls while it is open.
  const openCutRolls = useRollsForClip(openCut?.cut.clip.id);

  const visibleCuts = useMemo(
    () => strip.days.flatMap((day) => day.cuts.map((cut) => cut.clip)),
    [strip.days],
  );
  const selectedCuts = useMemo(
    () => visibleCuts.filter((clip) => selectedIds.has(clip.id)),
    [visibleCuts, selectedIds],
  );
  const activeRoll =
    filter.kind === 'roll' ? rollFilters.find((roll) => roll.rollId === filter.rollId) : undefined;

  const exitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  /**
   * Says out loud when a collect action could not do what it was asked to. A
   * roll can finish developing between the render that offered the action and
   * the press, and a refusal that looks like a success is worse than either.
   */
  const reportOutcome = useCallback((outcome: CollectOutcome, frozenMessage: string) => {
    setNotice(outcome.frozen ? { tone: 'warn', message: frozenMessage } : undefined);
  }, []);

  // Narrowing the strip takes frames off screen, and a selection the user can
  // no longer see is one they cannot check before deleting. Leave selection
  // mode on, drop what it held.
  const applyFilter = useCallback((next: CutFilter) => {
    setFilter(next);
    setSelectedIds(new Set());
    setNotice(undefined);
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
      current.size === visibleCuts.length ? new Set() : new Set(visibleCuts.map((clip) => clip.id)),
    );
  }, [visibleCuts]);

  // Deleting an original takes it out of every roll that references it, so the
  // dialog names those rolls and their cut counts before asking. Taking a cut
  // out of one roll while keeping the original is 빼기, a different action.
  const requestDelete = useCallback((targets: Clip[]) => {
    if (targets.length === 0) return;
    setNotice(undefined);
    setPendingDelete(targets);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!pendingDelete) return;
    void deleteClips(pendingDelete);
    setPendingDelete(undefined);
    setOpenCut(undefined);
    exitSelection();
  }, [pendingDelete, deleteClips, exitSelection]);

  const collectInto = useCallback(
    (rollId: string) => {
      if (!collecting) return;
      reportOutcome(
        addClipsToRoll(
          rollId,
          collecting.map((clip) => clip.id),
        ),
        '현상을 마친 롤이라 담을 수 없어요.',
      );
      setCollecting(undefined);
      exitSelection();
    },
    [collecting, addClipsToRoll, reportOutcome, exitSelection],
  );

  /**
   * Makes the roll and, if it took, says so in the roll's own color with the
   * release snap: on this screen there is no cover to fly the frames into, so
   * the confirmation is what carries "묶였다" (concept §7).
   *
   * A failure keeps the sheet open with the typed name intact — the selection
   * is still there, so pressing again is the whole retry.
   */
  const createRoll = useCallback(() => {
    if (!bundle) return;
    try {
      const outcome = bundleIntoNewRoll(
        bundle.title,
        bundle.cuts.map((clip) => clip.id),
      );
      if (!outcome) return;
      if (process.env.EXPO_OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      setNotice({
        tone: 'done',
        message: `${outcome.title} · ${outcome.changed}컷으로 묶었어요`,
        tint: rollTint(outcome.rollId),
      });
      setBundle(undefined);
      exitSelection();
    } catch {
      setBundle((current) =>
        current ? { ...current, errorMessage: '롤을 만들지 못했어요. 다시 시도해 주세요.' } : current,
      );
    }
  }, [bundle, bundleIntoNewRoll, exitSelection]);

  const startBundling = useCallback((cuts: Clip[]) => {
    if (cuts.length === 0) return;
    setNotice(undefined);
    setBundle({ cuts, title: '', defaultTitle: manualRollTitle(undefined, Date.now()) });
  }, []);

  const pullFromRoll = useCallback(
    (rollId: string, targets: Clip[]) => {
      if (targets.length === 0) return;
      reportOutcome(
        removeClipsFromRoll(
          rollId,
          targets.map((clip) => clip.id),
        ),
        '현상을 마친 롤이라 뺄 수 없어요.',
      );
    },
    [removeClipsFromRoll, reportOutcome],
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

          <CutNotice notice={notice} />

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
          contextLabel={
            activeRoll && !activeRoll.canEditMembership
              ? `${activeRoll.title} · 멤버십 고정`
              : `${filterLabel(filter, activeRoll?.title)} 필터`
          }
          // 빼기 needs a roll to be taken out of, so it exists only here — and
          // not for a developed roll, whose membership no longer moves. A button
          // that could only refuse is not a button.
          pullRollTitle={activeRoll?.canEditMembership ? activeRoll.title : undefined}
          onCancel={exitSelection}
          onToggleSelectAll={toggleSelectAll}
          onBundleIntoNewRoll={() => startBundling(selectedCuts)}
          onAddToRoll={() => setCollecting(selectedCuts)}
          onPullFromRoll={() => {
            if (filter.kind !== 'roll') return;
            pullFromRoll(filter.rollId, selectedCuts);
            exitSelection();
          }}
          onDelete={() => requestDelete(selectedCuts)}
        />
      ) : null}

      <CutSheet
        cut={openCut?.cut}
        rolls={openCutRolls}
        hasFile={openCut?.hasFile ?? false}
        isDeleting={openCut ? deletingIds.has(openCut.cut.clip.id) : false}
        // The player opens over the sheet rather than replacing it: dismissing
        // one modal in the same commit that presents another is the fragile
        // case on iOS, and coming back to the cut you were reading is the
        // behavior you want anyway.
        onPlay={() => setPlayingClip(openCut?.cut.clip)}
        onAddToRoll={() => openCut && setCollecting([openCut.cut.clip])}
        onPullFromRoll={(rollId) => openCut && pullFromRoll(rollId, [openCut.cut.clip])}
        onDelete={() => openCut && requestDelete([openCut.cut.clip])}
        onClose={() => setOpenCut(undefined)}
      />

      {/* Stacked over the cut sheet for the same reason the player is: the sheet
          is where the cut's rolls are, and it is where you come back to. */}
      <CutAddToRollSheet
        visible={collecting !== undefined}
        cutCount={collecting?.length ?? 0}
        targets={collectTargets}
        onSelect={collectInto}
        // Hands the same cuts to the new-roll sheet. One sheet at a time: the
        // add sheet closes in the commit that opens the other.
        onBundleIntoNewRoll={() => {
          const targets = collecting ?? NoCuts;
          setCollecting(undefined);
          startBundling(targets);
        }}
        onClose={() => setCollecting(undefined)}
      />

      <CutNewRollSheet
        visible={bundle !== undefined}
        cutCount={bundle?.cuts.length ?? 0}
        title={bundle?.title ?? ''}
        defaultTitle={bundle?.defaultTitle ?? ''}
        errorMessage={bundle?.errorMessage}
        onChangeTitle={(title) =>
          setBundle((current) => (current ? { ...current, title } : current))
        }
        onCreate={createRoll}
        onClose={() => setBundle(undefined)}
      />

      <CutDeleteDialog
        visible={pendingDelete !== undefined}
        cutCount={pendingDelete?.length ?? 0}
        impacts={deleteImpacts}
        isDeleting={deletingIds.size > 0}
        onCancel={() => setPendingDelete(undefined)}
        onConfirm={confirmDelete}
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
