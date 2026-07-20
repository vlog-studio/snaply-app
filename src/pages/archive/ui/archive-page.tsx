import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  formatRecordingDate,
  formatRecordingFileSize,
  RecordingPreview,
  useLocalRecordings,
} from '@/features/manage-recordings';
import type { LocalRecording } from '@/shared/lib/recording-files';
import { FadeInView } from '@/shared/ui/fade-in-view';
import { SnaplyButton } from '@/shared/ui/snaply-button';
import {
  MaxContentWidth,
  Radius,
  Spacing,
  useTheme,
  useTopContentInset,
} from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

type ArchiveView = 'recordings' | 'vlogs';

const sampleClips = [
  { id: 'cafe', emoji: '☕', color: '#C4875B' },
  { id: 'sunset', emoji: '🌇', color: '#735A8D' },
  { id: 'lunch', emoji: '🍜', color: '#C9573F' },
  { id: 'shopping', emoji: '🛍️', color: '#316D75' },
];

export function ArchivePage() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = useTopContentInset();
  const [archiveView, setArchiveView] = useState<ArchiveView>('recordings');
  const [selectedRecording, setSelectedRecording] = useState<LocalRecording>();
  const {
    recordings,
    isLoading,
    deletingId,
    errorMessage,
    reloadRecordings,
    removeRecording,
  } = useLocalRecordings();

  useFocusEffect(
    useCallback(() => {
      void reloadRecordings();
    }, [reloadRecordings]),
  );

  const confirmDelete = (recording: LocalRecording) => {
    Alert.alert('영상을 삭제할까요?', '삭제한 영상은 복구할 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => void removeRecording(recording),
      },
    ]);
  };

  const visibleCount = archiveView === 'recordings' ? recordings.length : 1;

  return (
    <>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Spacing.six + topInset,
            paddingBottom: Spacing.six,
          },
        ]}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <ThemedText type="eyebrow" themeColor="ai">YOUR MOMENTS</ThemedText>
            <ThemedText type="title">내 일상이 쌓이는 곳</ThemedText>
            <ThemedText themeColor="textSecondary">
              촬영한 원본과 완성된 영상을 한곳에서 확인하세요.
            </ThemedText>
          </View>
          <View style={[styles.countBadge, { backgroundColor: theme.aiSoft }]}>
            <ThemedText type="heading" themeColor="ai" style={styles.tabularNumber}>
              {visibleCount}
            </ThemedText>
          </View>
        </View>

        <View style={[styles.segmented, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          {([
            ['recordings', '촬영 원본'],
            ['vlogs', '브이로그'],
          ] as const).map(([value, label]) => {
            const isSelected = archiveView === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                onPress={() => setArchiveView(value)}
                style={[styles.segment, isSelected && { backgroundColor: theme.text }]}>
                <ThemedText
                  selectable={false}
                  type="smallBold"
                  style={{ color: isSelected ? theme.background : theme.textSecondary }}>
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {archiveView === 'recordings' ? (
          <FadeInView duration={260} style={styles.recordingList}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionCopy}>
                <ThemedText type="heading">앱에 저장된 촬영 원본</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  영상을 누르면 바로 재생할 수 있어요.
                </ThemedText>
              </View>
              <View style={[styles.storageBadge, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="smallBold" themeColor="primary">
                  {recordings.length}개
                </ThemedText>
              </View>
            </View>

            {errorMessage ? (
              <View style={[styles.messageCard, { borderColor: theme.danger }]}>
                <ThemedText type="smallBold" themeColor="danger">{errorMessage}</ThemedText>
              </View>
            ) : null}

            {isLoading && recordings.length === 0 ? (
              <View style={[styles.messageCard, { borderColor: theme.border }]}>
                <ThemedText themeColor="textSecondary">저장된 영상을 불러오는 중이에요…</ThemedText>
              </View>
            ) : null}

            {!isLoading && recordings.length === 0 ? (
              <View style={[styles.emptyCard, { borderColor: theme.border }]}>
                <View style={[styles.emptyIcon, { backgroundColor: theme.aiSoft }]}>
                  <ThemedText selectable={false} style={styles.emptyIconText}>▶</ThemedText>
                </View>
                <View style={styles.emptyCopy}>
                  <ThemedText type="heading">아직 촬영한 영상이 없어요</ThemedText>
                  <ThemedText themeColor="textSecondary">
                    촬영이 끝나면 이 보관함에 자동으로 표시돼요.
                  </ThemedText>
                </View>
                <Link href="/capture" asChild>
                  <SnaplyButton title="첫 영상 촬영하기" icon="●" />
                </Link>
              </View>
            ) : null}

            {recordings.map((recording) => {
              const isDeleting = deletingId === recording.id;

              return (
                <View
                  key={recording.id}
                  style={[
                    styles.recordingCard,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  ]}>
                  <Pressable
                    accessibilityHint="저장된 영상을 재생해요"
                    accessibilityLabel={`${formatRecordingDate(recording.createdAt)} 촬영 영상`}
                    accessibilityRole="button"
                    disabled={isDeleting}
                    onPress={() => setSelectedRecording(recording)}
                    style={styles.recordingMain}>
                    <View style={[styles.recordingPlay, { backgroundColor: theme.media }]}>
                      <ThemedText selectable={false} style={styles.recordingPlayIcon}>▶</ThemedText>
                    </View>
                    <View style={styles.recordingCopy}>
                      <ThemedText type="smallBold">
                        {formatRecordingDate(recording.createdAt)}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        원본 영상 · {formatRecordingFileSize(recording.size)}
                      </ThemedText>
                    </View>
                    <ThemedText selectable={false} style={styles.chevron}>›</ThemedText>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`${formatRecordingDate(recording.createdAt)} 영상 삭제`}
                    accessibilityRole="button"
                    disabled={isDeleting}
                    onPress={() => confirmDelete(recording)}
                    style={styles.deleteButton}>
                    <ThemedText type="smallBold" themeColor="danger">
                      {isDeleting ? '삭제 중' : '삭제'}
                    </ThemedText>
                  </Pressable>
                </View>
              );
            })}

            {recordings.length > 0 ? (
              <ThemedText type="small" style={styles.storageNote} themeColor="textSecondary">
                원본은 이 기기의 Snaply 앱 안에 저장되며 앱을 삭제하면 함께 삭제돼요.
              </ThemedText>
            ) : null}
          </FadeInView>
        ) : (
          <FadeInView duration={260} style={styles.vlogList}>
            <View style={[styles.vlogCard, { backgroundColor: theme.media }]}>
              <View style={styles.vlogPreview}>
                {sampleClips.map((clip) => (
                  <View key={clip.id} style={[styles.previewFrame, { backgroundColor: clip.color }]}>
                    <ThemedText selectable={false} style={styles.previewEmoji}>{clip.emoji}</ThemedText>
                  </View>
                ))}
              </View>
              <View style={styles.vlogCopy}>
                <ThemedText type="eyebrow" style={styles.orangeText}>TODAY · 16 SEC</ThemedText>
                <ThemedText type="heading" style={styles.whiteText}>7월 15일, 작은 순간들</ThemedText>
                <ThemedText style={styles.mutedWhite}>4개의 클립 · AI 자동 편집 완료</ThemedText>
              </View>
              <Link href={{ pathname: '/capture/result', params: { mood: 'hip', duration: '3' } }} asChild>
                <SnaplyButton title="브이로그 미리보기" variant="ai" icon="▶" />
              </Link>
            </View>

            <View style={[styles.emptyVlogCard, { borderColor: theme.border }]}>
              <ThemedText selectable={false} style={styles.emptyEmoji}>📅</ThemedText>
              <View style={styles.emptyCopy}>
                <ThemedText type="heading">어제의 브이로그</ThemedText>
                <ThemedText themeColor="textSecondary">아직 완성된 영상이 없어요.</ThemedText>
              </View>
            </View>
          </FadeInView>
        )}
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setSelectedRecording(undefined)}
        presentationStyle="fullScreen"
        visible={Boolean(selectedRecording)}>
        <View style={styles.previewScreen}>
          {selectedRecording ? (
            <RecordingPreview
              key={selectedRecording.id}
              contentFit="contain"
              muted={false}
              nativeControls
              uri={selectedRecording.uri}
            />
          ) : null}
          <Pressable
            accessibilityLabel="영상 재생 닫기"
            accessibilityRole="button"
            onPress={() => setSelectedRecording(undefined)}
            style={[styles.previewClose, { top: insets.top + Spacing.three }]}>
            <ThemedText selectable={false} style={styles.previewCloseText}>×</ThemedText>
          </Pressable>
          {selectedRecording ? (
            <View style={[styles.previewMeta, { bottom: insets.bottom + Spacing.four }]}>
              <ThemedText type="smallBold" style={styles.whiteText}>
                {formatRecordingDate(selectedRecording.createdAt)}
              </ThemedText>
              <ThemedText type="small" style={styles.mutedWhite}>
                {formatRecordingFileSize(selectedRecording.size)} · 앱에 저장된 원본
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
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  headerCopy: { flex: 1, gap: Spacing.two },
  countBadge: {
    minWidth: 52,
    height: 52,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  tabularNumber: { fontVariant: ['tabular-nums'] },
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    padding: Spacing.one,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    gap: Spacing.one,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingList: { gap: Spacing.three },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  sectionCopy: { flex: 1, gap: Spacing.one },
  storageBadge: { borderRadius: Radius.pill, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
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
  emptyIcon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  emptyIconText: { fontSize: 24 },
  emptyCopy: { flex: 1, gap: Spacing.one, alignItems: 'center' },
  recordingCard: {
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  recordingMain: {
    flex: 1,
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  recordingPlay: { width: 58, height: 58, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' },
  recordingPlayIcon: { color: '#FFFFFF', fontSize: 20 },
  recordingCopy: { flex: 1, gap: Spacing.one },
  chevron: { fontSize: 28, lineHeight: 30 },
  deleteButton: { minWidth: 64, minHeight: 64, alignItems: 'center', justifyContent: 'center' },
  storageNote: { textAlign: 'center', paddingTop: Spacing.two },
  vlogList: { gap: Spacing.four },
  vlogCard: {
    borderRadius: Radius.xlarge,
    borderCurve: 'continuous',
    padding: Spacing.five,
    gap: Spacing.five,
  },
  vlogPreview: { flexDirection: 'row', gap: Spacing.one },
  previewFrame: {
    flex: 1,
    aspectRatio: 0.7,
    maxHeight: 132,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewEmoji: { fontSize: 24 },
  vlogCopy: { gap: Spacing.one },
  orangeText: { color: '#FF8E67' },
  whiteText: { color: '#FFFFFF' },
  mutedWhite: { color: 'rgba(255,255,255,0.62)' },
  emptyVlogCard: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.large,
    padding: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  emptyEmoji: { fontSize: 34 },
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
});
