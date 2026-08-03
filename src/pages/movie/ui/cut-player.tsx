import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import type { PlaybackCut } from '../model/use-movie-playback';

export type CutPlayerProps = {
  /** The cuts to run, in order. Must be non-empty; the page guards the empty case. */
  cuts: PlaybackCut[];
  muted?: boolean;
};

/**
 * How often the active player reports its position. A cut ends on a trim boundary
 * rather than at the end of its file, so the boundary has to be watched; a quarter
 * second is close enough not to be seen and far cheaper than every frame.
 */
const TimeUpdateSec = 0.25;

/**
 * Plays a movie's cuts back to back.
 *
 * **Double buffered.** Two players alternate: while one plays, the other holds the
 * next cut preloaded and paused on its first frame, so the swap is instant with no
 * black flash between cuts. After each swap the freed player preloads the cut after
 * that.
 *
 * **Trim aware.** A cut starts at its trim window's start and is advanced when the
 * position reaches its end, rather than waiting for the file to run out — `playToEnd`
 * still catches the untrimmed case and any cut whose window reaches the file's end.
 *
 * This is what a finished movie *is* for now: a playlist, not a rendered file. When
 * a compositing backend exists, a movie with `render.uri` plays as one video and this
 * stays for the ones generated before it.
 *
 * Slot bookkeeping lives in refs so the native callbacks always read the latest
 * state. Only mounted with a non-empty `cuts`, so slot 0 always has a valid source.
 */
export function CutPlayer({ cuts, muted = false }: CutPlayerProps) {
  const theme = useTheme();
  // Which cut each slot currently holds; slot 1 preloads the second cut.
  const slotCutRef = useRef<[number, number]>([0, cuts.length > 1 ? 1 : -1]);
  const activeSlotRef = useRef<0 | 1>(0);
  const [activeSlot, setActiveSlot] = useState<0 | 1>(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEnded, setIsEnded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  const playerA = useVideoPlayer(cuts[0].uri, (instance) => {
    instance.muted = muted;
    instance.timeUpdateEventInterval = TimeUpdateSec;
    instance.currentTime = cuts[0].startSec;
    instance.play();
  });
  // Second slot preloads the next cut (paused) so its first frame is ready.
  const playerB = useVideoPlayer(cuts[1]?.uri ?? cuts[0].uri, (instance) => {
    instance.muted = muted;
    instance.timeUpdateEventInterval = TimeUpdateSec;
    instance.currentTime = cuts[1]?.startSec ?? cuts[0].startSec;
  });
  const players = [playerA, playerB] as const;

  /**
   * Loads a cut into a slot and parks it on the cut's first frame, paused.
   *
   * The seek is `seekBy` from a freshly replaced source, which always sits at
   * zero — the equivalent `currentTime` assignment is a property write on a value
   * a hook returned, which the React Compiler lint rejects. Seeking at preload
   * time rather than at the swap is what keeps a trimmed cut from showing its
   * own frame zero for an instant when it comes on.
   */
  const preload = (slot: 0 | 1, index: number) => {
    slotCutRef.current[slot] = index;
    void players[slot].replaceAsync(cuts[index].uri).then(() => {
      players[slot].seekBy(cuts[index].startSec);
    });
  };

  const advance = (endedSlot: 0 | 1) => {
    if (endedSlot !== activeSlotRef.current) return; // ignore the idle slot
    const nextIndex = slotCutRef.current[endedSlot] + 1;
    if (nextIndex >= cuts.length) {
      players[endedSlot].pause();
      setIsEnded(true);
      setIsPlaying(false);
      return;
    }

    // A cut ends at its trim boundary with file left over, so the outgoing player
    // has to be stopped rather than left to run on — unseen but still audible.
    players[endedSlot].pause();

    const nextSlot: 0 | 1 = endedSlot === 0 ? 1 : 0;
    if (slotCutRef.current[nextSlot] !== nextIndex) {
      // Not preloaded (a single-cut movie, or a rapid change) — load now.
      players[nextSlot].replace(cuts[nextIndex].uri);
      players[nextSlot].seekBy(cuts[nextIndex].startSec);
      slotCutRef.current[nextSlot] = nextIndex;
    }
    activeSlotRef.current = nextSlot;
    setActiveSlot(nextSlot);
    setCurrentIndex(nextIndex);
    players[nextSlot].play();

    // Preload the cut after that into the slot that just finished.
    if (nextIndex + 1 < cuts.length) preload(endedSlot, nextIndex + 1);
  };

  /** Keeps the active player inside the current cut's window. */
  const watchBoundary = (slot: 0 | 1, currentTime: number) => {
    if (slot !== activeSlotRef.current) return;
    const cut = cuts[slotCutRef.current[slot]];
    if (!cut) return;
    if (currentTime >= cut.endSec) {
      // The trim boundary arrives with file left over, so `playToEnd` never fires.
      advance(slot);
      return;
    }
    // A player that began before its window catches up here — a seek issued while
    // its source was still loading may not have landed, and the alternative is
    // playing footage the user deliberately cut off the front.
    if (currentTime < cut.startSec - TimeUpdateSec) {
      players[slot].seekBy(cut.startSec - currentTime);
    }
  };

  useEventListener(playerA, 'playToEnd', () => advance(0));
  useEventListener(playerB, 'playToEnd', () => advance(1));
  useEventListener(playerA, 'timeUpdate', ({ currentTime }) => watchBoundary(0, currentTime));
  useEventListener(playerB, 'timeUpdate', ({ currentTime }) => watchBoundary(1, currentTime));

  const replay = () => {
    slotCutRef.current = [0, cuts.length > 1 ? 1 : -1];
    activeSlotRef.current = 0;
    setActiveSlot(0);
    setCurrentIndex(0);
    setIsEnded(false);
    setIsPlaying(true);
    playerB.pause();
    playerA.replace(cuts[0].uri);
    playerA.seekBy(cuts[0].startSec);
    playerA.play();
    if (cuts.length > 1) preload(1, 1);
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
  const overlayLabel = isEnded ? '무비 다시 재생' : isPlaying ? '일시정지' : '재생';

  return (
    <View style={[styles.stage, { backgroundColor: theme.media }]}>
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

      <View style={styles.top} pointerEvents="none">
        <ThemedText selectable={false} style={styles.counter}>
          컷 {currentIndex + 1} / {cuts.length}
        </ThemedText>
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

      {/* One segment per cut, so the movie's shape is visible while it plays. */}
      <View style={styles.segments} pointerEvents="none">
        {cuts.map((cut, index) => (
          <View
            key={`${cut.snapId}-${index}`}
            style={[
              styles.segment,
              { backgroundColor: index <= currentIndex ? theme.ai : 'rgba(255,255,255,0.25)' },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: Radius.large,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: Spacing.four,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // Drawn over arbitrary video, so plain white rather than a palette color.
  counter: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#FFFFFF',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
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
