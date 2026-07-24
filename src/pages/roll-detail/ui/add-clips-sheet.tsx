import { Image } from 'expo-image';
import { memo, useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Clip } from '@/entities/clip';
import { getVideoThumbnail } from '@/shared/lib/video-thumbnails';
import { SnaplyButton } from '@/shared/ui/snaply-button';
import { MaxContentWidth, Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

type AddClipsSheetProps = {
  visible: boolean;
  /** Archive clips not yet in the roll, newest first (`useAddableClips`). */
  clips: Clip[];
  /** How many cuts the roll can still take (its remaining empty slots). */
  maxSelectable: number;
  onClose: () => void;
  /** Called with the picked clip ids in the order they were selected. */
  onAdd: (clipIds: string[]) => void;
};

type ClipPickCellProps = {
  clip: Clip;
  /** Zero-based pick order when selected. */
  pickNo: number | undefined;
  disabled: boolean;
  onPress: () => void;
};

/**
 * A candidate clip in the picker. Unlike the roll grid's frosted negatives,
 * the thumbnail is shown legibly — the user needs to recognize the moment to
 * decide whether to add it (cut playback is open anyway).
 */
function ClipPickCellComponent({ clip, pickNo, disabled, onPress }: ClipPickCellProps) {
  const theme = useTheme();
  const [thumbnailUri, setThumbnailUri] = useState<string>();
  const selected = pickNo !== undefined;

  useEffect(() => {
    let cancelled = false;
    void getVideoThumbnail(clip.uri).then((resolved) => {
      if (!cancelled) setThumbnailUri(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [clip.uri]);

  return (
    <Pressable
      accessibilityHint="이 컷을 롤에 담을 목록에 넣거나 빼요"
      accessibilityLabel={`${clip.durationSec}초 컷`}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.pickCell,
        { backgroundColor: theme.film, borderColor: selected ? theme.primary : theme.border },
        selected && styles.pickCellSelected,
        disabled && styles.pickCellDisabled,
      ]}
    >
      <View style={styles.pickFill} />
      {thumbnailUri ? (
        <Image
          accessible={false}
          contentFit="cover"
          source={{ uri: thumbnailUri }}
          style={StyleSheet.absoluteFill}
          transition={160}
        />
      ) : null}
      <ThemedText type="edge" themeColor="textSecondary" style={styles.pickMeta}>
        {clip.durationSec}s
      </ThemedText>
      <View
        style={[
          styles.pickCheck,
          selected
            ? { backgroundColor: theme.primary, borderColor: theme.primary }
            : { backgroundColor: 'rgba(14,11,8,0.5)', borderColor: 'rgba(255,255,255,0.85)' },
        ]}
      >
        {selected ? (
          <ThemedText selectable={false} type="smallBold" style={{ color: theme.onPrimary }}>
            {pickNo + 1}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const ClipPickCell = memo(ClipPickCellComponent);

/**
 * Bottom sheet for adding archive clips to an undeveloped roll. Multi-select
 * with the pick order shown on each cell (that order becomes the cuts' order
 * in the roll), capped at the roll's remaining empty slots.
 */
export function AddClipsSheet({ visible, clips, maxSelectable, onClose, onAdd }: AddClipsSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // Pick order matters (it becomes the roll order), so this is an array.
  const [pickedIds, setPickedIds] = useState<string[]>([]);

  // Every way out of the sheet clears the picks, so the next open starts fresh
  // without needing an effect on `visible`.
  const close = () => {
    setPickedIds([]);
    onClose();
  };

  const add = () => {
    setPickedIds([]);
    onAdd(pickedIds);
  };

  const togglePick = (clipId: string) => {
    setPickedIds((current) => {
      if (current.includes(clipId)) return current.filter((id) => id !== clipId);
      if (current.length >= maxSelectable) return current;
      return [...current, clipId];
    });
  };

  const atCapacity = pickedIds.length >= maxSelectable;

  return (
    <Modal
      animationType="slide"
      onRequestClose={close}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <View style={[styles.sheet, { backgroundColor: theme.background }]}>
        <ScrollView
          style={styles.sheet}
          contentContainerStyle={[
            styles.content,
            // pageSheet is iOS-only; Android falls back to a full-screen modal
            // that runs under the status bar, so it needs the top inset.
            { paddingTop: Spacing.five + (Platform.OS === 'ios' ? 0 : insets.top) },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <ThemedText type="heading">컷 추가</ThemedText>
              <Pressable
                accessibilityLabel="컷 추가 닫기"
                accessibilityRole="button"
                hitSlop={12}
                onPress={close}
              >
                <ThemedText type="heading" themeColor="textSecondary">
                  ×
                </ThemedText>
              </Pressable>
            </View>
            <ThemedText themeColor="textSecondary">
              보관함의 원본 컷을 이 롤에 담아요. 누른 순서대로 롤 끝에 이어 붙어요.
            </ThemedText>
            <ThemedText type="edge" themeColor="amber">
              {pickedIds.length}/{maxSelectable} 선택
              {atCapacity ? ' · 남은 슬롯을 모두 채웠어요' : ''}
            </ThemedText>
          </View>

          {clips.length === 0 ? (
            <View style={[styles.emptyCard, { borderColor: theme.border }]}>
              <ThemedText type="heading">추가할 컷이 없어요</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.centerText}>
                보관함의 모든 컷이 이미 이 롤에 담겨 있어요. 새 순간을 먼저 담아보세요.
              </ThemedText>
            </View>
          ) : (
            <View style={styles.grid}>
              {clips.map((clip) => {
                const pickIndex = pickedIds.indexOf(clip.id);
                const pickNo = pickIndex === -1 ? undefined : pickIndex;
                return (
                  <ClipPickCell
                    key={clip.id}
                    clip={clip}
                    pickNo={pickNo}
                    disabled={pickNo === undefined && atCapacity}
                    onPress={() => togglePick(clip.id)}
                  />
                );
              })}
            </View>
          )}
        </ScrollView>

        <View
          style={[
            styles.footer,
            { borderTopColor: theme.border, paddingBottom: insets.bottom + Spacing.four },
          ]}
        >
          <SnaplyButton
            title={`${pickedIds.length}개 담기`}
            icon="＋"
            disabled={pickedIds.length === 0}
            onPress={add}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.six,
    gap: Spacing.five,
  },
  header: { gap: Spacing.two },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  // Same anchor trick as the roll grid: the in-flow flex child keeps a
  // percentage-width + aspectRatio cell from collapsing in a wrapping row.
  pickFill: { flex: 1 },
  pickCell: {
    width: '31%',
    aspectRatio: 3 / 4,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    borderWidth: 1,
    overflow: 'hidden',
  },
  pickCellSelected: { borderWidth: 2 },
  pickCellDisabled: { opacity: 0.45 },
  pickMeta: { position: 'absolute', bottom: Spacing.two, right: Spacing.two },
  pickCheck: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.large,
    borderCurve: 'continuous',
    padding: Spacing.five,
    gap: Spacing.two,
    alignItems: 'center',
  },
  centerText: { textAlign: 'center' },
  footer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.four,
  },
});
