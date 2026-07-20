import { useLocalSearchParams } from 'expo-router';

import { CaptureSetupPage } from '@/pages/capture-setup';

export default function CaptureRoute() {
  const { context } = useLocalSearchParams<{ context?: string }>();
  return <CaptureSetupPage context={typeof context === 'string' ? context : undefined} />;
}
