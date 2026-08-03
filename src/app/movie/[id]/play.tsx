import { useLocalSearchParams } from 'expo-router';

import { MovieDetailPage } from '@/pages/movie-detail';

export default function MoviePlaybackRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  return <MovieDetailPage movieId={typeof id === 'string' ? id : undefined} />;
}
