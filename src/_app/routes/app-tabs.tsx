import { Ionicons } from '@expo/vector-icons';
import { BlurTargetView, BlurView } from 'expo-blur';
import { Tabs, useIsFocused, useRouter } from 'expo-router';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
} from 'react';
import { Pressable, StyleSheet, View, type ColorValue } from 'react-native';

import { Radius, TabBarContentHeight, useResolvedColorScheme, useTheme } from '@/shared/ui/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabIconName = keyof typeof Ionicons.glyphMap;

// On Android the BlurView cannot sample the hierarchy behind it by itself: it
// must be pointed at a BlurTargetView, and that target must not contain the
// BlurView (Dimezis BlurView v3 constraint) — so wrapping the whole navigator
// is not an option. Instead every tab scene is wrapped in a BlurTargetView
// (a plain View on iOS/web) and the focused scene registers itself as the tab
// bar's blur source.
const SceneBlurTargetContext = createContext<Dispatch<SetStateAction<View | null>>>(() => {});

function SceneBlurTarget({ children }: PropsWithChildren) {
  const theme = useTheme();
  const setBlurTarget = useContext(SceneBlurTargetContext);
  const sceneRef = useRef<View | null>(null);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused) return;
    const view = sceneRef.current;
    setBlurTarget(view);
    // Deregister on blur/unmount: a stale unmounted view left registered makes
    // the BlurView's findNodeHandle throw ("Unable to find node on an unmounted
    // component"). Clear only if another scene hasn't registered itself since.
    return () => {
      setBlurTarget((current) => (current === view ? null : current));
    };
  }, [isFocused, setBlurTarget]);

  return (
    // The blur samples only this subtree, so it must paint its own opaque
    // background even though the scene container behind it already has one.
    <BlurTargetView ref={sceneRef} style={[styles.scene, { backgroundColor: theme.background }]}>
      {children}
    </BlurTargetView>
  );
}

export function AppTabs() {
  const theme = useTheme();
  const scheme = useResolvedColorScheme();
  // A fixed `height` overrides the automatic bottom safe-area inset, so add it
  // back explicitly — otherwise the bar overlaps the Android navigation bar.
  const inset = useSafeAreaInsets();
  const [blurTargetView, setBlurTargetView] = useState<View | null>(null);

  return (
    <SceneBlurTargetContext value={setBlurTargetView}>
      <Tabs
        // Four tabs with the capture button centered over them as an overlay
        // (CaptureButton below), not as a tab, because /capture is a modal in
        // the root stack rather than a tab route. The tab items sit two to
        // either side, so the button lands in the gap rather than on top of one.
        screenLayout={({ children }) => <SceneBlurTarget>{children}</SceneBlurTarget>}
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
              blurTarget={{ current: blurTargetView }}
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
            title: '스튜디오',
            tabBarAccessibilityLabel: '스튜디오',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon color={color} name={focused ? 'albums' : 'albums-outline'} />
            ),
          }}
        />
        <Tabs.Screen
          name="snaps"
          options={{
            title: '스냅',
            tabBarAccessibilityLabel: '스냅',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon color={color} name={focused ? 'grid' : 'grid-outline'} />
            ),
          }}
        />
        <Tabs.Screen
          name="movies"
          options={{
            title: '무비',
            tabBarAccessibilityLabel: '무비',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon color={color} name={focused ? 'film' : 'film-outline'} />
            ),
          }}
        />
        <Tabs.Screen
          name="me"
          options={{
            title: '나',
            tabBarAccessibilityLabel: '나',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon color={color} name={focused ? 'person' : 'person-outline'} />
            ),
          }}
        />
      </Tabs>
      {/* Capture is always one tap, centered over the bar on every tab. It opens
          the /capture modal in the root stack. */}
      <CaptureButton bottom={inset.bottom} />
    </SceneBlurTargetContext>
  );
}

// Floating capture button straddling the top edge of the tab bar. Lives outside
// <Tabs> because /capture is a root-stack modal, not a tab route; the container
// is pointer-transparent so only the button itself is tappable.
function CaptureButton({ bottom }: { bottom: number }) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Pressable
        accessibilityLabel="촬영"
        accessibilityRole="button"
        onPress={() => router.push('/capture')}
        style={[
          styles.capture,
          {
            bottom: bottom + TabBarContentHeight - CaptureSize / 2,
            backgroundColor: theme.primary,
            borderColor: theme.background,
          },
        ]}
      >
        <Ionicons color={theme.onPrimary} name="ellipse" size={20} />
      </Pressable>
    </View>
  );
}

function TabBarIcon({ color, name }: { color: ColorValue; name: TabIconName }) {
  return <Ionicons color={color} name={name} size={24} />;
}

const CaptureSize = 62;

const styles = StyleSheet.create({
  scene: { flex: 1 },
  capture: {
    position: 'absolute',
    alignSelf: 'center',
    width: CaptureSize,
    height: CaptureSize,
    borderRadius: CaptureSize / 2,
    // A ring in the ground color separates the button from the blurred bar.
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 20px rgba(234,94,56,0.45)',
  },
});
