import { useLocalSearchParams } from 'expo-router';

import { CaptureRecordPage } from '@/pages/capture-record';

export default function CaptureRecordRoute() {
  const { duration, mood } = useLocalSearchParams<{ duration?: string; mood?: string }>();

  return (
    <CaptureRecordPage
      durationValue={typeof duration === 'string' ? duration : undefined}
      moodValue={typeof mood === 'string' ? mood : undefined}
    />
  );
}
