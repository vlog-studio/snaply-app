import { useLocalSearchParams } from 'expo-router';

import { CaptureEditingPage } from '@/pages/capture-editing';

export default function CaptureEditingRoute() {
  const { rollId } = useLocalSearchParams<{ rollId?: string }>();

  return <CaptureEditingPage rollId={typeof rollId === 'string' ? rollId : undefined} />;
}
