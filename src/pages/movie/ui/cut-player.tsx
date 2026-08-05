import { Ionicons } from '@expo/vector-icons';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import type { PlaybackCut } from '../model/playback-cuts';

/** What the timeline may ask of the stage. */
export type CutPlayerHandle = {
  /** Shows a cut's first frame, paused — the answer to a strip tap. */
  jumpTo: (index: number) => void;
  /** Plays or pauses; after the last cut, replays from the first. */
  togglePlayback: () => void;
};

export type CutPlayerProps = {
  /** The cuts to run, in order. Must be non-empty; the page guards the empty case. */
  cuts: PlaybackCut[];
  muted?: boolean;
  /**
   * Where to land when the playlist changes under the player — the selected
   * cut's playlist position. An edit is about the cut the user is on, so the
   * stage pauses there rather than wherever playback happened to be.
   */
  editIndex?: number;
  /** Reports which cut the stage is showing, so the timeline can follow. */
  onCutChange?: (index: number) => void;
  /** Reports whether the stage is playing, so the transport's button can say. */
  onPlayingChange?: (playing: boolean) => void;
  ref?: Ref<CutPlayerHandle>;
  style?: StyleProp<ViewStyle>;
};

/**
 * How often the active player reports its position. A cut ends on a trim boundary
 * rather than at the end of its file, so the boundary has to be watched; a quarter
 * second is close enough not to be seen and far cheaper than every frame.
 */
const TimeUpdateSec = 0.25;

/** What one playlist entry plays, for telling two playlists apart. */
function playlistSignature(cuts: PlaybackCut[]): string {
  return cuts.map((cut) => `${cut.snapId}:${cut.startSec}:${cut.endSec}`).join('|');
}

/**
 * Plays a movie's cuts back to back — the stage of the timeline layout.
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
 * **Linked to the timeline, both ways.** The `jumpTo` handle moves the stage to
 * the cut the strip picked; `onCutChange` reports every cut the stage moves onto, so the
 * strip's highlight follows playback. When the playlist itself changes under the
 * player — a reorder, a trim, a removal — the stage holds its place (clamped) and
 * pauses on the edited list's frame rather than remounting, because a remounted
 * video cannot paint its first frame without a blink
 * (`docs/frameworks/animations-and-gestures.md`).
 *
 * This is what a finished movie *is* for now: a playlist, not a rendered file. When
 * a compositing backend exists, a movie with `render.uri` plays as one video and this
 * stays for the ones generated before it.
 *
 * Slot bookkeeping lives in refs so the native callbacks always read the latest
 * state. Only mounted with a non-empty `cuts`, so slot 0 always has a valid source.
 */
export function CutPlayer({
  cuts,
  muted = false,
  editIndex,
  onCutChange,
  onPlayingChange,
  ref,
  style,
}: CutPlayerProps) {
  const theme = useTheme();
  // Which cut each slot currently holds; slot 1 preloads the second cut.
  const slotCutRef = useRef<[number, number]>([0, cuts.length > 1 ? 1 : -1]);
  const activeSlotRef = useRef<0 | 1>(0);
  const currentIndexRef = useRef(0);
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

  const setIndex = (index: number) => {
    currentIndexRef.current = index;
    setCurrentIndex(index);
    onCutChange?.(index);
  };

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

  /**
   * Points the stage at `index` — the jump behind a strip tap and behind the
   * playlist changing underneath. The active slot is reloaded in place (its
   * current cut is usually wrong now) and the idle slot preloads the cut after.
   */
  const loadCut = (index: number, play: boolean) => {
    const slot = activeSlotRef.current;
    const other: 0 | 1 = slot === 0 ? 1 : 0;
    players[other].pause();
    players[slot].pause();
    players[slot].replace(cuts[index].uri);
    players[slot].seekBy(cuts[index].startSec);
    slotCutRef.current[slot] = index;
    setIndex(index);
    setIsEnded(false);
    setIsPlaying(play);
    if (play) players[slot].play();
    if (index + 1 < cuts.length) {
      preload(other, index + 1);
    } else {
      slotCutRef.current[other] = -1;
    }
  };

  // The playlist changed under the player — a reorder, a trim, a removal. Land
  // on the cut the edit was about (the page's selection) and pause on its
  // frame, so the edit is seen exactly where the user is looking. Without a
  // selection to follow, hold the place, clamped into the new list. The effect
  // keys on the signature alone, but its closure is rebuilt every render, so
  // `editIndex` is current whenever it fires.
  const signature = playlistSignature(cuts);
  const signatureRef = useRef(signature);
  useEffect(() => {
    if (signatureRef.current === signature) return;
    signatureRef.current = signature;
    const held = Math.min(currentIndexRef.current, cuts.length - 1);
    const target = editIndex !== undefined && editIndex >= 0 && editIndex < cuts.length;
    loadCut(target ? editIndex : held, false);
    // `loadCut`, `cuts`, and `editIndex` are rebuilt or re-read every render;
    // the signature is the one real input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

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
    setIndex(nextIndex);
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

  // Playing/paused changes in many places (taps, jumps, edits, the end of the
  // movie); reporting the state rather than the events keeps the transport's
  // button from ever disagreeing with the stage.
  useEffect(() => {
    onPlayingChange?.(isPlaying);
  }, [isPlaying, onPlayingChange]);

  useEventListener(playerA, 'playToEnd', () => advance(0));
  useEventListener(playerB, 'playToEnd', () => advance(1));
  useEventListener(playerA, 'timeUpdate', ({ currentTime }) => watchBoundary(0, currentTime));
  useEventListener(playerB, 'timeUpdate', ({ currentTime }) => watchBoundary(1, currentTime));

  const replay = () => {
    slotCutRef.current = [0, cuts.length > 1 ? 1 : -1];
    activeSlotRef.current = 0;
    setActiveSlot(0);
    setIndex(0);
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

  // The timeline picked a cut: show its frame, paused — selecting is choosing
  // what to work on, not asking to watch; playing is the transport's job. A
  // handle rather than a prop-driven effect — the jump is an event, and routing
  // an event through state and an effect is a render-cascade the compiler lint
  // rightly rejects.
  useImperativeHandle(ref, () => ({
    jumpTo: (index: number) => {
      if (index < 0 || index >= cuts.length) return;
      loadCut(index, false);
    },
    togglePlayback,
  }));

  const overlayIcon = isEnded ? 'refresh' : isPlaying ? 'pause' : 'play';
  const overlayLabel = isEnded ? '무비 다시 재생' : isPlaying ? '일시정지' : '재생';

  return (
    <View style={[styles.stage, { backgroundColor: theme.media }, style]}>
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
            <Ionicons name={overlayIcon} size={24} color="#F1E6DA" />
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
