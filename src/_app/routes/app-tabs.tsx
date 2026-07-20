import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useTheme } from '@/shared/ui/theme';

export function AppTabs() {
  const theme = useTheme();

  return (
    <NativeTabs
      backgroundColor={theme.backgroundElement}
      blurEffect="systemMaterial"
      disableTransparentOnScrollEdge
      iconColor={{ default: theme.textSecondary, selected: theme.primary }}
      indicatorColor={theme.backgroundSelected}
      labelStyle={{
        default: { color: theme.textSecondary },
        selected: { color: theme.primary, fontWeight: '700' },
      }}
      labelVisibilityMode="labeled"
      minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>홈</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'house', selected: 'house.fill' }}
          md="home"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="archive">
        <NativeTabs.Trigger.Label>보관함</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'rectangle.stack', selected: 'rectangle.stack.fill' }}
          md="video_library"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
