import {
  type TabListProps,
  TabList,
  TabSlot,
  TabTrigger,
  type TabTriggerSlotProps,
  Tabs,
} from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

export function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton icon="⌂" label="홈" />
          </TabTrigger>
          <TabTrigger name="capture" href="/capture" asChild>
            <TabButton emphasis icon="＋" label="촬영" />
          </TabTrigger>
          <TabTrigger name="archive" href="/archive" asChild>
            <TabButton icon="▣" label="보관함" />
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabBarWrap}>
      <View style={styles.tabBar}>{props.children}</View>
    </View>
  );
}

type TabButtonProps = TabTriggerSlotProps & {
  emphasis?: boolean;
  icon: string;
  label: string;
};

function TabButton({ emphasis, icon, isFocused, label, ...props }: TabButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      {...props}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <View
        style={[
          styles.iconWrap,
          emphasis && styles.emphasisIcon,
          emphasis && { backgroundColor: theme.primary },
          isFocused && !emphasis && { backgroundColor: theme.backgroundSelected },
        ]}>
        <ThemedText
          selectable={false}
          style={[
            styles.icon,
            { color: emphasis ? theme.onPrimary : isFocused ? theme.primary : theme.textSecondary },
          ]}>
          {icon}
        </ThemedText>
      </View>
      <ThemedText
        selectable={false}
        type="smallBold"
        style={{ color: isFocused ? theme.primary : theme.textSecondary }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: { height: '100%' },
  tabBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Spacing.three,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    pointerEvents: 'box-none',
  },
  tabBar: {
    width: '100%',
    maxWidth: 430,
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: Radius.xlarge,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255,255,255,0.96)',
    boxShadow: '0 12px 35px rgba(18,23,46,0.16)',
    paddingHorizontal: Spacing.four,
  },
  tabButton: {
    minWidth: 88,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconWrap: {
    width: 38,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emphasisIcon: { width: 48, height: 40 },
  icon: { fontSize: 23, lineHeight: 26, fontWeight: '800' },
  pressed: { opacity: 0.68 },
});
