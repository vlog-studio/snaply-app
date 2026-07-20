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
          <TabTrigger name="archive" href="/archive" asChild>
            <TabButton icon="▣" label="보관함" />
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

function CustomTabList(props: TabListProps) {
  const theme = useTheme();

  return (
    <View {...props} style={styles.tabBarWrap}>
      <View style={[styles.tabBar, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        {props.children}
      </View>
    </View>
  );
}

type TabButtonProps = TabTriggerSlotProps & {
  icon: string;
  label: string;
};

function TabButton({ icon, isFocused, label, ...props }: TabButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      {...props}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <View
        style={[
          styles.iconWrap,
          isFocused && { backgroundColor: theme.backgroundSelected },
        ]}>
        <ThemedText
          selectable={false}
          style={[
            styles.icon,
            { color: isFocused ? theme.primary : theme.textSecondary },
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
    borderWidth: 1,
    boxShadow: '0 12px 35px rgba(9,12,27,0.24)',
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
  icon: { fontSize: 23, lineHeight: 26, fontWeight: '800' },
  pressed: { opacity: 0.68 },
});
