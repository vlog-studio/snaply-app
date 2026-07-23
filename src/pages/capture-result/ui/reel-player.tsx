import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

type ReelPlayerProps = {
  /** Ordered clip source URIs. Must be non-empty (the page guards the empty case). */
  uris: string[];
  muted?: boolean;
};

/**
 * Plays a reel's clips back-to-back with **double buffering** to remove the seam
 * between clips: two players (slots) alternate — while one plays, the other has
 * the next clip preloaded and paused on its first frame, so the swap on
 * `playToEnd` is instant with no black flash. After each swap the freed slot
 * preloads the following clip.
 *
 * This is the MVP reel — a sequential playlist, not a single rendered file
 * (mvp-implementation-plan.md §5); the final combined video is produced
 * separately. Only mounted with a non-empty `uris`, so slot 0 always has a
 * valid source. Slot/index bookkeeping lives in refs so the native `playToEnd`
 * callbacks always read the latest state.
 */
export function ReelPlayer({ uris, muted = false }: ReelPlayerProps) {
  const theme = useTheme();
  // Which uri index each slot currently holds; slot 1 preloads the second clip.
  const slotIndexRef = useRef<[number, number]>([0, uris.length > 1 ? 1 : -1]);
  const activeSlotRef = useRef<0 | 1>(0);
  const [activeSlot, setActiveSlot] = useState<0 | 1>(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEnded, setIsEnded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  const playerA = useVideoPlayer(uris[0], (instance) => {
    instance.muted = muted;
    instance.play();
  });
  // Second slot preloads the next clip (paused) so its first frame is ready.
  const playerB = useVideoPlayer(uris[1] ?? uris[0], (instance) => {
    instance.muted = muted;
  });
  const players = [playerA, playerB] as const;

  const advance = (endedSlot: 0 | 1) => {
    if (endedSlot !== activeSlotRef.current) return; // ignore the idle slot
    const nextIndex = slotIndexRef.current[endedSlot] + 1;
    if (nextIndex >= uris.length) {
      setIsEnded(true);
      setIsPlaying(false);
      return;
    }

    const nextSlot: 0 | 1 = endedSlot === 0 ? 1 : 0;
    if (slotIndexRef.current[nextSlot] !== nextIndex) {
      // Not preloaded (e.g. rapid change) — load synchronously as a fallback.
      players[nextSlot].replace(uris[nextIndex]);
      slotIndexRef.current[nextSlot] = nextIndex;
    }
    activeSlotRef.current = nextSlot;
    setActiveSlot(nextSlot);
    setCurrentIndex(nextIndex);
    players[nextSlot].play();

    // Preload the following clip into the slot that just finished.
    const preloadIndex = nextIndex + 1;
    if (preloadIndex < uris.length) {
      void players[endedSlot].replaceAsync(uris[preloadIndex]);
      slotIndexRef.current[endedSlot] = preloadIndex;
    }
  };

  useEventListener(playerA, 'playToEnd', () => advance(0));
  useEventListener(playerB, 'playToEnd', () => advance(1));

  const replay = () => {
    slotIndexRef.current = [0, uris.length > 1 ? 1 : -1];
    activeSlotRef.current = 0;
    setActiveSlot(0);
    setCurrentIndex(0);
    setIsEnded(false);
    setIsPlaying(true);
    playerB.pause();
    playerA.replace(uris[0]);
    playerA.play();
    if (uris.length > 1) void playerB.replaceAsync(uris[1]);
  };

  const togglePlayback = () => {
    if (isEnded) {
      replay();
      return;
    }
    const active = players[activeSlotRef.current];
    if (isPlaying) {
      active.pause();
      setIsPlaying(false);
    } else {
      active.play();
      setIsPlaying(true);
    }
  };

  const overlayIcon = isEnded ? '↻' : isPlaying ? '❚❚' : '▶';
  const overlayLabel = isEnded ? '릴 다시 재생' : isPlaying ? '일시정지' : '재생';

  return (
    <View style={styles.reel}>
      <VideoView
        allowsPictureInPicture={false}
        contentFit="cover"
        nativeControls={false}
        player={playerA}
        style={[StyleSheet.absoluteFill, { opacity: activeSlot === 0 ? 1 : 0 }]}
      />
      <VideoView
        allowsPictureInPicture={false}
        contentFit="cover"
        nativeControls={false}
        player={playerB}
        style={[StyleSheet.absoluteFill, { opacity: activeSlot === 1 ? 1 : 0 }]}
      />
      <View style={styles.reelShade} pointerEvents="none" />

      <View style={styles.reelTop} pointerEvents="none">
        <ThemedText selectable={false} style={styles.reelEdge}>
          REEL · {String(currentIndex + 1).padStart(2, '0')}/{String(uris.length).padStart(2, '0')}
        </ThemedText>
        <View style={styles.developedBadge}>
          <ThemedText selectable={false} style={[styles.developedText, { color: theme.lumen }]}>
            현상 완료
          </ThemedText>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={overlayLabel}
        onPress={togglePlayback}
        style={styles.tapLayer}
      >
        {!isPlaying || isEnded ? (
          <View style={styles.playButton}>
            <ThemedText selectable={false} style={styles.playIcon}>
              {overlayIcon}
            </ThemedText>
          </View>
        ) : null}
      </Pressable>

      {/* Per-clip progress segments across the bottom. */}
      <View style={styles.segments} pointerEvents="none">
        {uris.map((uri, index) => (
          <View
            key={uri}
            style={[
              styles.segment,
              { backgroundColor: index <= currentIndex ? theme.lumen : 'rgba(255,255,255,0.25)' },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  reel: {
    width: '82%',
    maxWidth: 340,
    aspectRatio: 0.62,
    maxHeight: 460,
    alignSelf: 'center',
    borderRadius: Radius.large,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: '#0E0B08',
    boxShadow: '0 24px 52px rgba(0,0,0,0.5)',
  },
  reelShade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    boxShadow:
      'inset 0 -90px 90px -20px rgba(10,7,5,0.92), inset 0 70px 60px -30px rgba(10,7,5,0.7)',
  },
  reelTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: Spacing.four,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reelEdge: {
    fontSize: 10,
    letterSpacing: 1.4,
    color: '#FFFFFF',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  developedBadge: {
    backgroundColor: 'rgba(14,11,8,0.6)',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
  },
  developedText: { fontSize: 10, letterSpacing: 1, fontWeight: '700' },
  tapLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(20,15,11,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { color: '#F1E6DA', fontSize: 18 },
  segments: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    bottom: Spacing.four,
    flexDirection: 'row',
    gap: Spacing.one,
  },
  segment: { flex: 1, height: 3, borderRadius: 2 },
});
