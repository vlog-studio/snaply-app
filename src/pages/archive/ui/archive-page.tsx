import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, BackHandler, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  formatRecordingDate,
  formatRecordingDay,
  recordingDayKey,
  useLocalRecordings,
} from '@/features/manage-recordings';
import { formatFileSize } from '@/shared/lib/format-file-size';
import type { LocalRecording } from '@/shared/lib/recording-files';
import { FadeInView } from '@/shared/ui/fade-in-view';
import { SnaplyButton } from '@/shared/ui/snaply-button';
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
import { VideoPreview } from '@/shared/ui/video-preview';
import { formatReelLength, useDevelopedRolls } from '@/widgets/developed-rolls-shelf';

import { CutCell } from './cut-cell';
import { CutSelectionBar, CutSelectionBarContentHeight } from './cut-selection-bar';

// "롤" = developed rolls (the shelf), "컷" = the raw clip archive (local
// recordings). Both are now live.
type ArchiveView = 'clips' | 'rolls';
// "최신순" = one flat newest-first grid, "일자별" = the same grid split into
// per-day sections.
type ClipSort = 'recent' | 'day';

type ClipDayGroup = { key: string; label: string; items: LocalRecording[] };

// Cover tints cycled by shelf position — rolls carry no color of their own yet.
const COVER_TINTS = ['#7A3F2A', '#1F5F5B', '#5A4718', '#3E2C5A', '#245A3E'];

export function ArchivePage() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = useTopContentInset();
  const tabBarHeight = useTabBarHeight();
  const [archiveView, setArchiveView] = useState<ArchiveView>('clips');
  const [clipSort, setClipSort] = useState<ClipSort>('recent');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [selectedRecording, setSelectedRecording] = useState<LocalRecording>();
  const { recordings, isLoading, deletingIds, errorMessage, reloadRecordings, removeRecordings } =
    useLocalRecordings();
  const developedRolls = useDevelopedRolls();
  const setTabBarHidden = useSetTabBarHidden();

  // Global newest-first clip number (컷 01 is the oldest), independent of the
  // day grouping so a clip keeps the same number across both views.
  const clipNumbers = useMemo(() => {
    const map = new Map<string, string>();
    recordings.forEach((recording, index) => {
      map.set(recording.id, String(recordings.length - index).padStart(2, '0'));
    });
    return map;
  }, [recordings]);

  const dayGroups = useMemo<ClipDayGroup[]>(() => {
    const groups: ClipDayGroup[] = [];
    const byKey = new Map<string, ClipDayGroup>();
    for (const recording of recordings) {
      const key = recordingDayKey(recording.createdAt);
      let group = byKey.get(key);
      if (!group) {
        group = { key, label: formatRecordingDay(recording.createdAt), items: [] };
        byKey.set(key, group);
        groups.push(group);
      }
      group.items.push(recording);
    }
    return groups;
  }, [recordings]);

  // Selection mode swaps the bottom chrome: tab bar + safelight out, the
  // CutSelectionBar in. Enter/exit must always flip both together.
  const exitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setTabBarHidden(false);
  }, [setTabBarHidden]);

  const enterSelection = useCallback(
    (recording: LocalRecording) => {
      setSelectionMode(true);
      setSelectedIds(new Set([recording.id]));
      setTabBarHidden(true);
    },
    [setTabBarHidden],
  );

  useFocusEffect(
    useCallback(() => {
      void reloadRecordings();
      // Leaving the screen with selection active would strand the app with no
      // bottom chrome at all — always restore the tab bar on blur.
      return () => exitSelection();
    }, [reloadRecordings, exitSelection]),
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

  const toggleSelected = useCallback((recording: LocalRecording) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(recording.id)) next.delete(recording.id);
      else next.add(recording.id);
      return next;
    });
  }, []);

  const allSelected = recordings.length > 0 && selectedIds.size === recordings.length;

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((current) =>
      current.size === recordings.length ? new Set() : new Set(recordings.map((item) => item.id)),
    );
  }, [recordings]);

  const handleCellPress = useCallback(
    (recording: LocalRecording) => {
      if (selectionMode) toggleSelected(recording);
      else setSelectedRecording(recording);
    },
    [selectionMode, toggleSelected],
  );

  const confirmBatchDelete = () => {
    const targets = recordings.filter((recording) => selectedIds.has(recording.id));
    if (targets.length === 0) return;

    Alert.alert(`${targets.length}개 컷을 삭제할까요?`, '삭제한 원본은 복구할 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          void removeRecordings(targets);
          exitSelection();
        },
      },
    ]);
  };

  return (
    <>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Spacing.six + topInset,
            // The selection bar is taller than the tab bar it replaces — keep
            // the last grid row scrollable above whichever chrome is active.
            paddingBottom:
              Spacing.six +
              (selectionMode ? insets.bottom + CutSelectionBarContentHeight : tabBarHeight),
          },
        ]}
      >
        <View style={styles.header}>
          <ThemedText type="edge" themeColor="amber">
            ARCHIVE · 롤 {developedRolls.length} · 컷 {recordings.length}
          </ThemedText>
          {/* Settings tucked into the archive corner — no longer a tab (concept §6). */}
          <View style={styles.titleRow}>
            <ThemedText type="title">보관함</ThemedText>
            <Link href="/settings" asChild>
              <Pressable
                accessibilityLabel="설정"
                accessibilityRole="button"
                hitSlop={12}
                style={styles.settingsButton}
              >
                <Ionicons color={theme.textSecondary} name="settings-outline" size={22} />
              </Pressable>
            </Link>
          </View>
          <ThemedText themeColor="textSecondary">
            현상한 롤은 선반에, 담은 원본 컷은 그대로 쌓여요.
          </ThemedText>
        </View>

        <View style={[styles.segmented, { borderColor: theme.border }]}>
          {(
            [
              ['clips', '컷'],
              ['rolls', '롤'],
            ] as const
          ).map(([value, label]) => {
            const isSelected = archiveView === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  exitSelection();
                  setArchiveView(value);
                }}
                style={[styles.segment, isSelected && { backgroundColor: theme.primary }]}
              >
                <ThemedText
                  selectable={false}
                  type="edge"
                  style={{ color: isSelected ? theme.onPrimary : theme.textSecondary }}
                >
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {archiveView === 'clips' ? (
          <FadeInView duration={260} style={styles.clipList}>
            {errorMessage ? (
              <View style={[styles.messageCard, { borderColor: theme.danger }]}>
                <ThemedText type="smallBold" themeColor="danger">
                  {errorMessage}
                </ThemedText>
              </View>
            ) : null}

            {isLoading && recordings.length === 0 ? (
              <View style={[styles.messageCard, { borderColor: theme.border }]}>
                <ThemedText themeColor="textSecondary">담긴 컷을 불러오는 중이에요…</ThemedText>
              </View>
            ) : null}

            {!isLoading && recordings.length === 0 ? (
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

            {recordings.length > 0 ? (
              <View style={styles.clipToolbar}>
                <View style={[styles.sortToggle, { borderColor: theme.border }]}>
                  {(
                    [
                      ['recent', '최신순'],
                      ['day', '일자별'],
                    ] as const
                  ).map(([value, label]) => {
                    const isActive = clipSort === value;
                    return (
                      <Pressable
                        key={value}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isActive }}
                        onPress={() => setClipSort(value)}
                        style={[
                          styles.sortChip,
                          isActive && { backgroundColor: theme.backgroundElement },
                        ]}
                      >
                        <ThemedText
                          selectable={false}
                          type="edge"
                          style={{ color: isActive ? theme.text : theme.textSecondary }}
                        >
                          {label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
                <ThemedText type="edge" themeColor="textSecondary">
                  {selectionMode ? '탭해서 선택' : '길게 눌러 선택'}
                </ThemedText>
              </View>
            ) : null}

            {recordings.length > 0 && clipSort === 'recent' ? (
              <View style={styles.clipGrid}>
                {recordings.map((recording) => (
                  <CutCell
                    key={recording.id}
                    recording={recording}
                    clipNo={clipNumbers.get(recording.id) ?? ''}
                    selectionMode={selectionMode}
                    selected={selectedIds.has(recording.id)}
                    isDeleting={deletingIds.has(recording.id)}
                    onPress={() => handleCellPress(recording)}
                    onLongPress={() => enterSelection(recording)}
                  />
                ))}
              </View>
            ) : null}

            {recordings.length > 0 && clipSort === 'day'
              ? dayGroups.map((group) => (
                  <View key={group.key} style={styles.clipDayGroup}>
                    <ThemedText type="edge" themeColor="textSecondary">
                      {group.label} · {group.items.length}컷
                    </ThemedText>
                    <View style={styles.clipGrid}>
                      {group.items.map((recording) => (
                        <CutCell
                          key={recording.id}
                          recording={recording}
                          clipNo={clipNumbers.get(recording.id) ?? ''}
                          selectionMode={selectionMode}
                          selected={selectedIds.has(recording.id)}
                          isDeleting={deletingIds.has(recording.id)}
                          onPress={() => handleCellPress(recording)}
                          onLongPress={() => enterSelection(recording)}
                        />
                      ))}
                    </View>
                  </View>
                ))
              : null}

            {recordings.length > 0 ? (
              <ThemedText type="small" style={styles.storageNote} themeColor="textSecondary">
                원본 컷은 이 기기의 Snaply 앱 안에 저장되며 앱을 삭제하면 함께 사라져요.
              </ThemedText>
            ) : null}
          </FadeInView>
        ) : (
          <FadeInView duration={260} style={styles.rollList}>
            {developedRolls.length === 0 ? (
              <View style={[styles.emptyCard, { borderColor: theme.border }]}>
                <View style={[styles.emptyIcon, { backgroundColor: theme.film }]}>
                  <ThemedText
                    selectable={false}
                    style={[styles.emptyIconText, { color: theme.lumen }]}
                  >
                    ◐
                  </ThemedText>
                </View>
                <View style={styles.emptyCopy}>
                  <ThemedText type="heading">아직 현상한 롤이 없어요</ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.centerText}>
                    오늘의 롤을 현상하면 이 선반에 릴로 꽂혀요.
                  </ThemedText>
                </View>
              </View>
            ) : (
              <View style={styles.shelfGrid}>
                {developedRolls.map((roll, index) => (
                  <Link
                    key={roll.id}
                    href={{ pathname: '/capture/result', params: { rollId: roll.id } }}
                    asChild
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${roll.title} 릴 재생`}
                      style={StyleSheet.flatten([
                        styles.cover,
                        { backgroundColor: COVER_TINTS[index % COVER_TINTS.length] },
                      ])}
                    >
                      <View style={styles.coverTop}>
                        <ThemedText selectable={false} style={styles.coverEdge}>
                          {roll.dayKey ?? '롤'} · {roll.clipCount}컷 ·{' '}
                          {formatReelLength(roll.totalSec)}
                        </ThemedText>
                        <View style={styles.developedBadge}>
                          <ThemedText
                            selectable={false}
                            style={[styles.developedBadgeText, { color: theme.lumen }]}
                          >
                            현상 완료
                          </ThemedText>
                        </View>
                      </View>
                      <ThemedText selectable={false} style={styles.coverTitle}>
                        {roll.title}
                      </ThemedText>
                    </Pressable>
                  </Link>
                ))}
                {/* Decorative empty slot — invites the next developed roll. */}
                <View style={[styles.coverEmpty, { borderColor: theme.border }]}>
                  <ThemedText type="edge" themeColor="textSecondary">
                    빈 롤
                  </ThemedText>
                </View>
              </View>
            )}
          </FadeInView>
        )}
      </ScrollView>

      {/* Slides up over the tab bar's spot — the navigator hides the tab bar
          and safelight while selection mode is active (tab-bar-chrome). */}
      {selectionMode ? (
        <CutSelectionBar
          selectedCount={selectedIds.size}
          allSelected={allSelected}
          onCancel={exitSelection}
          onToggleSelectAll={toggleSelectAll}
          onDelete={confirmBatchDelete}
        />
      ) : null}

      <Modal
        animationType="fade"
        onRequestClose={() => setSelectedRecording(undefined)}
        presentationStyle="fullScreen"
        visible={Boolean(selectedRecording)}
      >
        <View style={styles.previewScreen}>
          {selectedRecording ? (
            <VideoPreview
              key={selectedRecording.id}
              contentFit="contain"
              muted={false}
              nativeControls
              uri={selectedRecording.uri}
            />
          ) : null}
          <Pressable
            accessibilityLabel="컷 재생 닫기"
            accessibilityRole="button"
            onPress={() => setSelectedRecording(undefined)}
            style={[styles.previewClose, { top: insets.top + Spacing.three }]}
          >
            <ThemedText selectable={false} style={styles.previewCloseText}>
              ×
            </ThemedText>
          </Pressable>
          {selectedRecording ? (
            <View style={[styles.previewMeta, { bottom: insets.bottom + Spacing.four }]}>
              <ThemedText type="edge" style={styles.previewMetaEdge}>
                {formatRecordingDate(selectedRecording.createdAt)}
              </ThemedText>
              <ThemedText type="small" style={styles.mutedWhite}>
                {formatFileSize(selectedRecording.size)} · 앱에 저장된 원본 컷
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
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingsButton: { minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    padding: Spacing.one,
    borderRadius: Radius.pill,
    borderCurve: 'continuous',
    gap: Spacing.one,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clipList: { gap: Spacing.three },
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
  clipToolbar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  sortToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    padding: Spacing.one,
    borderRadius: Radius.pill,
    borderCurve: 'continuous',
    gap: Spacing.one,
  },
  sortChip: {
    minHeight: 32,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  clipDayGroup: { gap: Spacing.two },
  storageNote: { textAlign: 'center', paddingTop: Spacing.two },
  rollList: { gap: Spacing.four },
  shelfGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  cover: {
    width: '48%',
    height: 132,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    padding: Spacing.four,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  coverTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  coverEdge: {
    flex: 1,
    fontSize: 9,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '700',
  },
  developedBadge: {
    backgroundColor: 'rgba(14,11,8,0.55)',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  developedBadgeText: { fontSize: 9, letterSpacing: 1, fontWeight: '700' },
  coverTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  coverEmpty: {
    width: '48%',
    height: 132,
    borderRadius: Radius.medium,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
