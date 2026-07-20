import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Pressable, type ColorValue } from 'react-native';

import { Radius, useTheme } from '@/shared/ui/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabIconName = keyof typeof Ionicons.glyphMap;

export function AppTabs() {
  const theme = useTheme();
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
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: inset.bottom + 40,
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
    </Tabs>
  );
}

function TabBarIcon({ color, name }: { color: ColorValue; name: TabIconName }) {
  return <Ionicons color={color} name={name} size={24} />;
}
