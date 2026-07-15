import { useLocalSearchParams } from 'expo-router';

import { CaptureResultPage } from '@/pages/capture-result';

export default function CaptureResultRoute() {
  const { duration, mood } = useLocalSearchParams<{ duration?: string; mood?: string }>();

  return (
    <CaptureResultPage
      durationValue={typeof duration === 'string' ? duration : undefined}
      moodValue={typeof mood === 'string' ? mood : undefined}
    />
  );
}
