import type { Movie } from '@/entities/movie';
import { canShareFiles, shareFile } from '@/shared/lib/sharing';

/**
 * Why a movie cannot be handed to the share sheet.
 *
 * `no-render` — there is no rendered file. This is every movie today: generation
 * is simulated and produces no video, so `Movie.render.uri` is never set. The
 * export below is complete and waiting for a real renderer to fill it in.
 */
export type ShareBlock = 'no-render';

export type MovieSharing = {
  /** Set when sharing is unavailable; `undefined` when the sheet can open. */
  blocked: ShareBlock | undefined;
  /** Opens the system share sheet on the rendered movie. */
  share: () => void;
};

/**
 * Exporting a finished movie through the OS share sheet.
 *
 * A feature rather than page code because two screens offer the same act: the
 * movie screen's 공유 button and the movie tab's long-press actions sheet.
 *
 * What is shared is the rendered file and nothing else. The cuts are the user's
 * own originals and the app will not quietly send one of those in a movie's
 * place — a share that hands over different material than the one the user asked
 * for is worse than a share that does not happen.
 *
 * Whether the platform has a share sheet is asked at press time rather than kept
 * in state: it is a constant for the session, and reading it on mount would put
 * an async answer behind a control whose real gate is the missing file.
 */
export function useShareMovie(movie: Movie | undefined): MovieSharing {
  const uri = movie?.render?.uri;

  const share = () => {
    if (!uri || !movie) return;
    void (async () => {
      try {
        if (!(await canShareFiles())) return;
        await shareFile(uri, {
          mimeType: 'video/mp4',
          uti: 'public.movie',
          dialogTitle: movie.title,
        });
      } catch (error) {
        if (__DEV__) console.warn('[movie] share failed:', String(error));
      }
    })();
  };

  return { blocked: uri ? undefined : 'no-render', share };
}
