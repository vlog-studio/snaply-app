import { useLocalSearchParams } from 'expo-router';

import { MovieEditorPage } from '@/pages/movie-editor';

export default function MovieEditorRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  return <MovieEditorPage movieId={typeof id === 'string' ? id : undefined} />;
}
