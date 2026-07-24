import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getCaptureMoodLabel } from '@/entities/capture-session';
import type { Clip } from '@/entities/clip';
import { formatRecordingDate } from '@/features/manage-recordings';
import { Spacing } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';
import { VideoPreview } from '@/shared/ui/video-preview';

export type PlayingCut = {
  clip: Clip;
  /** Zero-based position of the cut inside the roll, for the "NN번째 컷" meta. */
  index: number;
};

type ClipPlayerModalProps = {
  playing: PlayingCut | undefined;
  onClose: () => void;
};

/**
 * Full-screen single-cut playback, opened by tapping a cut on the contact
 * sheet. Same shape as the archive's clip preview modal: a looping native
 * player over black with a close button and a meta overlay.
 */
export function ClipPlayerModal({ playing, onClose }: ClipPlayerModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      visible={playing !== undefined}
    >
      <View style={styles.screen}>
        {playing ? (
          <VideoPreview
            key={playing.clip.id}
            contentFit="contain"
            muted={false}
            nativeControls
            uri={playing.clip.uri}
          />
        ) : null}
        <Pressable
          accessibilityLabel="컷 재생 닫기"
          accessibilityRole="button"
          onPress={onClose}
          style={[styles.close, { top: insets.top + Spacing.three }]}
        >
          <ThemedText selectable={false} style={styles.closeText}>
            ×
          </ThemedText>
        </Pressable>
        {playing ? (
          <View style={[styles.meta, { bottom: insets.bottom + Spacing.four }]}>
            <ThemedText type="edge" style={styles.metaEdge}>
              {playing.index + 1}번째 컷 · {playing.clip.durationSec}초
              {playing.clip.mood ? ` · ${getCaptureMoodLabel(playing.clip.mood)}` : ''}
            </ThemedText>
            <ThemedText type="small" style={styles.metaMuted}>
              {formatRecordingDate(playing.clip.capturedAt)}에 담은 원본 컷
            </ThemedText>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  close: {
    position: 'absolute',
    left: Spacing.four,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(0,0,0,0.56)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#FFFFFF', fontSize: 30, lineHeight: 32 },
  meta: {
    position: 'absolute',
    left: Spacing.five,
    right: Spacing.five,
    alignItems: 'center',
    gap: Spacing.one,
    pointerEvents: 'none',
  },
  metaEdge: { color: '#F1E6DA' },
  metaMuted: { color: 'rgba(255,255,255,0.62)' },
});
