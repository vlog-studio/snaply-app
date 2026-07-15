import { useLocalSearchParams } from 'expo-router';

import { CaptureEditingPage } from '@/pages/capture-editing';

export default function CaptureEditingRoute() {
  const { duration, mood } = useLocalSearchParams<{ duration?: string; mood?: string }>();

  return (
    <CaptureEditingPage
      durationValue={typeof duration === 'string' ? duration : undefined}
      moodValue={typeof mood === 'string' ? mood : undefined}
    />
  );
}
