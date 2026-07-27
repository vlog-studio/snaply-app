import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, BackHandler, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDeleteClips } from '@/features/delete-clip';
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
import { MaxContentWidth, Radius, Spacing, useTheme, useTopContentInset } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';
import { VideoPreview } from '@/shared/ui/video-preview';
import { selectRollsForClips, useClipMembership } from '@/widgets/clip-membership';

import { CutCell } from './cut-cell';
import { CutSelectionBar, CutSelectionBarContentHeight } from './cut-selection-bar';

// "최신순" = one flat newest-first grid, "일자별" = the same grid split into
// per-day sections.
type ClipSort = 'recent' | 'day';

type ClipDayGroup = { key: string; label: string; items: LocalRecording[] };

/**
 * Every original cut, reached from the cabinet's drawer.
 *
 * This lives on its own pushed route rather than as a segment of the archive:
 * the cabinet is about rolls, and cuts are the raw material behind them. Being
 * a pushed screen also means it has no tab bar, so its selection bar simply
 * owns the bottom edge instead of having to hide the app's chrome.
 *
 * Still a grid; the contact-strip rendering and roll-membership dots land in
 * the next step.
 */
export function CutStripPage() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = useTopContentInset();
  const [clipSort, setClipSort] = useState<ClipSort>('recent');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [selectedRecording, setSelectedRecording] = useState<LocalRecording>();
  const { recordings, isLoading, errorMessage, reloadRecordings } = useLocalRecordings();
  // Deleting an original is a cross-entity action (file + thumbnail + clip
  // metadata + every roll's references), so it lives in its own feature rather
  // than in the recording-file hook that only knows about files.
  const { deleteClips, deletingIds, errorMessage: deleteErrorMessage } = useDeleteClips();
  const clipMembership = useClipMembership();

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

  const exitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const enterSelection = useCallback((recording: LocalRecording) => {
    setSelectionMode(true);
    setSelectedIds(new Set([recording.id]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reloadRecordings();
      // Returning to a screen still in selection mode would show a bar over a
      // list the user has lost track of — always leave it clean.
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
            void deleteClips(targets).then((deletedIds) => {
              // The file list is read from disk, so refresh it once the files
              // are actually gone rather than guessing which deletes succeeded.
              if (deletedIds.length > 0) void reloadRecordings();
            });
            exitSelection();
          },
        },
      ],
    );
  };

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
            NEGATIVE · 컷 {recordings.length}
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            담은 원본 컷이에요. 롤은 이 원본을 참조만 해요.
          </ThemedText>
        </View>

        <FadeInView duration={260} style={styles.clipList}>
          {(errorMessage ?? deleteErrorMessage) ? (
            <View style={[styles.messageCard, { borderColor: theme.danger }]}>
              <ThemedText type="smallBold" themeColor="danger">
                {errorMessage ?? deleteErrorMessage}
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
      </ScrollView>

      {/* Owns the bottom edge outright — this screen has no tab bar under it. */}
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
