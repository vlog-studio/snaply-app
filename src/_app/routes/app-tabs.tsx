import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, type ColorValue } from 'react-native';

import { Radius, TabBarContentHeight, useResolvedColorScheme, useTheme } from '@/shared/ui/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabIconName = keyof typeof Ionicons.glyphMap;

export function AppTabs() {
  const theme = useTheme();
  const scheme = useResolvedColorScheme();
  // A fixed `height` overrides the automatic bottom safe-area inset, so add it
  // back explicitly — otherwise the bar overlaps the Android navigation bar.
  const inset = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        sceneStyle: { backgroundColor: theme.background },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        // The bar floats over the scene so its blur has content to sample;
        // screens offset their scroll content with `useTabBarHeight`.
        tabBarBackground: () => (
          <BlurView
            tint={scheme === 'dark' ? 'dark' : 'light'}
            intensity={60}
            // Real background blur on Android SDK 31+, graceful semi-transparent
            // fallback on older versions.
            blurMethod="dimezisBlurViewSdk31Plus"
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopColor: theme.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: inset.bottom + TabBarContentHeight,
          paddingBottom: inset.bottom,
        },
        tabBarItemStyle: { borderRadius: Radius.pill },
        tabBarButton: ({ ref, ...props }) => <Pressable {...props} android_ripple={null} />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarAccessibilityLabel: '홈',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon color={color} name={focused ? 'home' : 'home-outline'} />
          ),
        }}
      />
      <Tabs.Screen
        name="archive"
        options={{
          title: '보관함',
          tabBarAccessibilityLabel: '보관함',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon color={color} name={focused ? 'albums' : 'albums-outline'} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '설정',
          tabBarAccessibilityLabel: '설정',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon color={color} name={focused ? 'settings' : 'settings-outline'} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabBarIcon({ color, name }: { color: ColorValue; name: TabIconName }) {
  return <Ionicons color={color} name={name} size={24} />;
}
