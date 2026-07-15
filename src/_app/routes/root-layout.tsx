import * as SplashScreen from 'expo-splash-screen';

import { AppProviders } from '@/_app/providers';
import '@/_app/styles/global.css';

import { AnimatedSplashOverlay } from './animated-splash-overlay';
import { AppTabs } from './app-tabs';

void SplashScreen.preventAutoHideAsync();

export function RootLayout() {
  return (
    <AppProviders>
      <AnimatedSplashOverlay />
      <AppTabs />
    </AppProviders>
  );
}
