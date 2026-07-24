import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Clip } from '@/entities/clip';
import { useAddClipToRoll, useRemoveClipFromRoll, useReorderRollClips } from '@/entities/roll';
import { SnaplyButton } from '@/shared/ui/snaply-button';
import { MaxContentWidth, Radius, Spacing, useTheme, useTopContentInset } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import { useAddableClips } from '../model/use-addable-clips';
import { useRollDetail } from '../model/use-roll-detail';
import { AddClipsSheet } from './add-clips-sheet';
import { ClipPlayerModal, type PlayingCut } from './clip-player-modal';
import { RollCutCell, type RollGridMode } from './roll-cut-cell';

type RollDetailPageProps = {
  rollId?: string;
};

// The daily roll's nominal capacity — the "총" in the counter and the number of
// empty slots that invite more captures (concept §4 "빈칸을 보여준다").
const ROLL_SIZE = 12;

export function RollDetailPage({ rollId }: RollDetailPageProps) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = useTopContentInset();
  const { roll, clips, canDevelop } = useRollDetail(rollId);
  const addableClips = useAddableClips(roll);
  const addClipToRoll = useAddClipToRoll();
  const removeClipFromRoll = useRemoveClipFromRoll();
  const reorderRollClips = useReorderRollClips();

  const [mode, setMode] = useState<RollGridMode>('view');
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  // Reorder taps in order — the array order becomes the cuts' new roll order.
  const [sequence, setSequence] = useState<string[]>([]);
  const [playing, setPlaying] = useState<PlayingCut>();
  const [addSheetVisible, setAddSheetVisible] = useState(false);

  const exitEditing = useCallback(() => {
    setMode('view');
    setSelectedIds(new Set());
    setSequence([]);
  }, []);

  // Android hardware back leaves the edit mode instead of popping the screen.
  useEffect(() => {
    if (mode === 'view') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      exitEditing();
      return true;
    });
    return () => subscription.remove();
  }, [mode, exitEditing]);

  if (!roll) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: theme.background }]}>
        <ThemedText type="heading">롤을 찾을 수 없어요</ThemedText>
        <ThemedText themeColor="textSecondary">이미 사라졌거나 잘못된 주소예요.</ThemedText>
      </View>
    );
  }

  const emptySlots = Math.max(ROLL_SIZE - clips.length, 0);
  const isDeveloped = roll.status === 'developed' && roll.reel !== undefined;
  // A developed roll is a finished artifact (its reel is composed and fixed);
  // membership and order can only change before develop. Want a new reel? Load
  // a new roll.
  const canEdit = roll.status === 'undeveloped';

  const develop = () => {
    // Enter the develop ceremony; it composes and persists the reel on
    // completion (see pages/capture-editing) and reveals the reel player.
    router.push({ pathname: '/capture/editing', params: { rollId: roll.id } });
  };

  const openReel = () => {
    router.push({ pathname: '/capture/result', params: { rollId: roll.id } });
  };

  const handleCutPress = (clip: Clip, index: number) => {
    if (mode === 'view') {
      setPlaying({ clip, index });
      return;
    }
    if (mode === 'select') {
      setSelectedIds((current) => {
        const next = new Set(current);
        if (next.has(clip.id)) next.delete(clip.id);
        else next.add(clip.id);
        return next;
      });
      return;
    }
    setSequence((current) =>
      current.includes(clip.id) ? current.filter((id) => id !== clip.id) : [...current, clip.id],
    );
  };

  const enterSelection = (clip: Clip) => {
    setMode('select');
    setSelectedIds(new Set([clip.id]));
  };

  const removeSelected = () => {
    // Removing only drops the roll's reference — the original cut stays in the
    // archive, so no confirmation gate is needed.
    for (const clipId of selectedIds) removeClipFromRoll(roll.id, clipId);
    exitEditing();
  };

  const applyReorder = () => {
    // Cuts left unnumbered keep their relative order after the numbered ones
    // (the store guarantees this), so a partial renumbering is safe to apply.
    reorderRollClips(roll.id, sequence);
    exitEditing();
  };

  const addPicked = (clipIds: string[]) => {
    for (const clipId of clipIds) addClipToRoll(roll.id, clipId);
    setAddSheetVisible(false);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          { paddingTop: Spacing.five + topInset, paddingBottom: Spacing.seven },
        ]}
      >
        <View style={styles.header}>
          <ThemedText type="edge" themeColor="amber">
            ROLL · {roll.dayKey ?? '—'} · {roll.status === 'developed' ? '현상됨' : '미현상'}
          </ThemedText>
          <View style={styles.titleRow}>
            <ThemedText type="title">{roll.title}</ThemedText>
            <ThemedText type="edge" themeColor="primary">
              {String(clips.length).padStart(2, '0')}/{ROLL_SIZE}
            </ThemedText>
          </View>
          <ThemedText themeColor="textSecondary">
            컷을 누르면 담은 원본을 볼 수 있어요. 완성본 릴은 현상해야 만들어져요.
          </ThemedText>
        </View>

        {clips.length > 0 && canEdit ? (
          <View style={styles.toolbar}>
            <ThemedText type="edge" themeColor="textSecondary">
              {mode === 'view'
                ? '길게 눌러 선택'
                : mode === 'select'
                  ? '탭해서 선택'
                  : '탭한 순서대로 번호를 매겨요'}
            </ThemedText>
            {mode === 'view' && clips.length >= 2 ? (
              <Pressable
                accessibilityLabel="컷 순서 바꾸기"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setMode('reorder')}
                style={[styles.reorderChip, { borderColor: theme.border }]}
              >
                <ThemedText selectable={false} type="edge" themeColor="textSecondary">
                  순서 바꾸기
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* Grid contact sheet — frosted negatives (the film look stays even
            though tapping now plays the original) plus the empty slots that
            invite more captures, or — on an undeveloped roll — adding cuts. */}
        <View style={styles.grid}>
          {clips.map((clip, index) => (
            <RollCutCell
              key={clip.id}
              clip={clip}
              index={index}
              mode={mode}
              selected={selectedIds.has(clip.id)}
              sequenceNo={mode === 'reorder' ? indexOrUndefined(sequence, clip.id) : undefined}
              canEdit={canEdit}
              onPress={() => handleCutPress(clip, index)}
              onLongPress={() => enterSelection(clip)}
            />
          ))}
          {Array.from({ length: emptySlots }).map((_, index) => {
            const addable = canEdit && mode === 'view';
            return (
              <Pressable
                key={`empty-${index}`}
                accessibilityLabel={addable ? '컷 추가' : '빈 슬롯'}
                accessibilityRole={addable ? 'button' : undefined}
                disabled={!addable}
                onPress={addable ? () => setAddSheetVisible(true) : undefined}
                style={[styles.frameCell, styles.frameEmpty, { borderColor: theme.border }]}
              >
                {/* Same in-flow anchor as a filled cell so the empty slot keeps its
                  aspectRatio height even in an all-empty row (with no filled sibling
                  to stretch it); it also centers the ghost glyph. */}
                <View style={styles.frameFill}>
                  <ThemedText
                    selectable={false}
                    style={[styles.frameGhost, { color: addable ? theme.amber : theme.border }]}
                  >
                    {addable ? '＋' : '?'}
                  </ThemedText>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom + Spacing.four,
          },
        ]}
      >
        {mode === 'select' ? (
          <>
            <View style={styles.editBar}>
              <Pressable
                accessibilityLabel="선택 취소"
                accessibilityRole="button"
                hitSlop={8}
                onPress={exitEditing}
                style={styles.editAction}
              >
                <ThemedText type="smallBold" themeColor="textSecondary">
                  취소
                </ThemedText>
              </Pressable>
              <ThemedText type="smallBold" style={styles.editCount}>
                {selectedIds.size}개 선택
              </ThemedText>
              <Pressable
                accessibilityLabel={`${selectedIds.size}개 컷 롤에서 빼기`}
                accessibilityRole="button"
                accessibilityState={{ disabled: selectedIds.size === 0 }}
                disabled={selectedIds.size === 0}
                hitSlop={8}
                onPress={removeSelected}
                style={styles.editAction}
              >
                <ThemedText
                  type="smallBold"
                  style={{ color: selectedIds.size > 0 ? theme.danger : theme.textSecondary }}
                >
                  롤에서 빼기
                </ThemedText>
              </Pressable>
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.footerHint}>
              뺀 컷은 보관함에 그대로 남아요.
            </ThemedText>
          </>
        ) : mode === 'reorder' ? (
          <>
            <View style={styles.editBar}>
              <Pressable
                accessibilityLabel="순서 바꾸기 취소"
                accessibilityRole="button"
                hitSlop={8}
                onPress={exitEditing}
                style={styles.editAction}
              >
                <ThemedText type="smallBold" themeColor="textSecondary">
                  취소
                </ThemedText>
              </Pressable>
              <ThemedText type="smallBold" style={styles.editCount}>
                {sequence.length}/{clips.length} 지정
              </ThemedText>
              <Pressable
                accessibilityLabel="새 순서 적용"
                accessibilityRole="button"
                accessibilityState={{ disabled: sequence.length === 0 }}
                disabled={sequence.length === 0}
                hitSlop={8}
                onPress={applyReorder}
                style={styles.editAction}
              >
                <ThemedText
                  type="smallBold"
                  style={{ color: sequence.length > 0 ? theme.primary : theme.textSecondary }}
                >
                  적용
                </ThemedText>
              </Pressable>
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.footerHint}>
              번호를 매기지 않은 컷은 매긴 컷 뒤로 순서를 지켜 따라와요.
            </ThemedText>
          </>
        ) : (
          <>
            {isDeveloped ? (
              <SnaplyButton title="릴 보기" icon="▶" onPress={openReel} />
            ) : (
              <SnaplyButton title="현상하기" icon="✦" disabled={!canDevelop} onPress={develop} />
            )}
            <ThemedText type="small" themeColor="textSecondary" style={styles.footerHint}>
              {isDeveloped
                ? '현상된 릴은 완성본이에요. 새 구성이 필요하면 새 롤에 담아보세요.'
                : canDevelop
                  ? '모아둔 컷을 하나의 릴로 엮어요.'
                  : '아직 담은 컷이 없어요. 순간을 먼저 담아보세요.'}
            </ThemedText>
          </>
        )}
      </View>

      <ClipPlayerModal playing={playing} onClose={() => setPlaying(undefined)} />

      <AddClipsSheet
        visible={addSheetVisible}
        clips={addableClips}
        maxSelectable={emptySlots}
        onClose={() => setAddSheetVisible(false)}
        onAdd={addPicked}
      />
    </View>
  );
}

function indexOrUndefined(sequence: string[], clipId: string): number | undefined {
  const index = sequence.indexOf(clipId);
  return index === -1 ? undefined : index;
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
    gap: Spacing.six,
  },
  header: { gap: Spacing.two },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  toolbar: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginBottom: -Spacing.four,
  },
  reorderChip: {
    minHeight: 32,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.pill,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  // In-flow anchor shared with `RollCutCell`: a `flex: 1` child is what makes
  // the percentage-width + aspectRatio cell actually take its aspectRatio
  // height in the wrapping grid (empty cells put their ghost glyph inside it).
  frameFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Same geometry as RollCutCell so filled and empty frames read as one
  // regular contact sheet.
  frameCell: {
    width: '30%',
    aspectRatio: 0.72,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    borderWidth: 1,
    overflow: 'hidden',
  },
  frameEmpty: {
    borderStyle: 'dashed',
  },
  frameGhost: { fontSize: 18, fontWeight: '700' },
  footer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.four,
    gap: Spacing.two,
  },
  footerHint: { textAlign: 'center' },
  editBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  editAction: { minHeight: 44, justifyContent: 'center' },
  editCount: { flex: 1, textAlign: 'center' },
});
