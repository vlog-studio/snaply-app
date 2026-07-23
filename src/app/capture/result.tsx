import { useLocalSearchParams } from 'expo-router';

import { CaptureResultPage } from '@/pages/capture-result';

export default function CaptureResultRoute() {
  const { rollId } = useLocalSearchParams<{ rollId?: string }>();

  return <CaptureResultPage rollId={typeof rollId === 'string' ? rollId : undefined} />;
}
