import { useLocalSearchParams } from 'expo-router';

import { SnapsPage } from '@/pages/snaps';

export default function SnapsRoute() {
  // `?select=1` — the studio's tray or a movie screen sends the user here to pick.
  // `?for=<movieId>` — picks go into that movie instead of the tray.
  const { select, for: forMovieId } = useLocalSearchParams<{ select?: string; for?: string }>();

  return (
    <SnapsPage
      startSelecting={select === '1'}
      forMovieId={typeof forMovieId === 'string' ? forMovieId : undefined}
    />
  );
}
