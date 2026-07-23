import { useLocalSearchParams } from 'expo-router';

import { RollDetailPage } from '@/pages/roll-detail';

export default function RollDetailRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  return <RollDetailPage rollId={typeof id === 'string' ? id : undefined} />;
}
