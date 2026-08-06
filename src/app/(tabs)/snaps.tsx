import { useLocalSearchParams } from 'expo-router';

import { SnapsPage } from '@/pages/snaps';

export default function SnapsRoute() {
  // `?select=1` — the studio's tray sends the user here to pick.
  const { select } = useLocalSearchParams<{ select?: string }>();

  return <SnapsPage startSelecting={select === '1'} />;
}
