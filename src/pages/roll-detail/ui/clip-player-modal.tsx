import { getCaptureMoodLabel } from '@/entities/capture-session';
import type { Clip } from '@/entities/clip';
import { formatDateTime } from '@/shared/lib/datetime';
import { VideoPlayerModal } from '@/shared/ui/video-player-modal';

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
 * sheet. The chrome comes from the shared `video-player-modal`; what this owns
 * is the wording. Inside a roll a cut is its place in the sequence, so the edge
 * print leads with "3번째 컷" and the date is demoted to the caption — the
 * contact strip, which has no sequence to speak of, inverts that.
 */
export function ClipPlayerModal({ playing, onClose }: ClipPlayerModalProps) {
  const mood = playing?.clip.mood;

  return (
    <VideoPlayerModal
      uri={playing?.clip.uri}
      onClose={onClose}
      closeLabel="컷 재생 닫기"
      edgeLabel={
        playing
          ? `${playing.index + 1}번째 컷 · ${playing.clip.durationSec}초` +
            (mood ? ` · ${getCaptureMoodLabel(mood)}` : '')
          : undefined
      }
      caption={playing ? `${formatDateTime(playing.clip.capturedAt)}에 담은 원본 컷` : undefined}
    />
  );
}
