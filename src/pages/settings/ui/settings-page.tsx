import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import {
  MaxContentWidth,
  Radius,
  Spacing,
  useSetThemeMode,
  useTheme,
  useThemeMode,
  type ThemeMode,
} from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

const notificationWindows = [
  { id: 'morning', emoji: '🌅', label: '아침', time: '08:00 – 10:00' },
  { id: 'lunch', emoji: '☀️', label: '점심', time: '12:00 – 14:00' },
  { id: 'evening', emoji: '🌙', label: '저녁', time: '18:00 – 21:00' },
] as const;

type NotificationWindowId = (typeof notificationWindows)[number]['id'];

const themeModeOptions: { id: ThemeMode; label: string }[] = [
  { id: 'system', label: '시스템' },
  { id: 'light', label: '라이트' },
  { id: 'dark', label: '다크' },
];

export function SettingsPage() {
  const theme = useTheme();
  const themeMode = useThemeMode();
  const setThemeMode = useSetThemeMode();
  const [enabledWindows, setEnabledWindows] = useState<Record<NotificationWindowId, boolean>>({
    morning: true,
    lunch: true,
    evening: true,
  });
  const [frequency, setFrequency] = useState(2);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <View style={styles.intro}>
        <ThemedText type="eyebrow" themeColor="primary">SMART REMINDER</ThemedText>
        <ThemedText type="heading">필요한 순간에만 알려드려요.</ThemedText>
        <ThemedText themeColor="textSecondary">
          선택한 시간대와 상황을 바탕으로 촬영하기 좋은 순간을 제안합니다.
        </ThemedText>
      </View>

      <SettingsSection title="알림 시간대">
        {notificationWindows.map((window, index) => (
          <View
            key={window.id}
            style={[
              styles.settingRow,
              index > 0 && { borderTopWidth: 1, borderTopColor: theme.border },
            ]}>
            <ThemedText selectable={false} style={styles.rowEmoji}>{window.emoji}</ThemedText>
            <View style={styles.rowCopy}>
              <ThemedText type="smallBold">{window.label}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{window.time}</ThemedText>
            </View>
            <Switch
              accessibilityLabel={`${window.label} 알림`}
              value={enabledWindows[window.id]}
              onValueChange={(value) =>
                setEnabledWindows((current) => ({ ...current, [window.id]: value }))
              }
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={theme.border}
            />
          </View>
        ))}
      </SettingsSection>

      <SettingsSection title="하루 알림 빈도">
        <View style={styles.frequencyRow}>
          {[1, 2, 3].map((value) => {
            const isSelected = frequency === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                onPress={() => setFrequency(value)}
                style={[
                  styles.frequencyButton,
                  {
                    backgroundColor: isSelected ? theme.text : theme.background,
                    borderColor: isSelected ? theme.text : theme.border,
                  },
                ]}>
                <ThemedText
                  selectable={false}
                  type="smallBold"
                  style={{ color: isSelected ? theme.background : theme.text }}>
                  {value}회
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </SettingsSection>

      <SettingsSection title="화면 테마">
        <View style={styles.frequencyRow}>
          {themeModeOptions.map((option) => {
            const isSelected = themeMode === option.id;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                onPress={() => setThemeMode(option.id)}
                style={[
                  styles.frequencyButton,
                  {
                    backgroundColor: isSelected ? theme.text : theme.background,
                    borderColor: isSelected ? theme.text : theme.border,
                  },
                ]}>
                <ThemedText
                  selectable={false}
                  type="smallBold"
                  style={{ color: isSelected ? theme.background : theme.text }}>
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </SettingsSection>

      <SettingsSection title="소셜 연결">
        <SocialRow emoji="♪" label="TikTok" status="연결됨" connected />
        <View style={{ height: 1, backgroundColor: theme.border }} />
        <SocialRow emoji="◎" label="Instagram" status="연결 안 됨" />
      </SettingsSection>

      <SettingsSection title="계정">
        <Pressable style={styles.accountAction}>
          <ThemedText type="smallBold">로그아웃</ThemedText>
        </Pressable>
        <View style={{ height: 1, backgroundColor: theme.border }} />
        <Pressable style={styles.accountAction}>
          <ThemedText type="smallBold" themeColor="danger">계정 삭제</ThemedText>
        </Pressable>
      </SettingsSection>

      <ThemedText type="small" themeColor="textSecondary" style={styles.version}>
        Snaply 1.0 · 찍으면 알아서 됩니다.
      </ThemedText>
    </ScrollView>
  );
}

function SettingsSection({ children, title }: React.PropsWithChildren<{ title: string }>) {
  const theme = useTheme();

  return (
    <View style={styles.sectionWrap}>
      <ThemedText type="smallBold" themeColor="textSecondary">{title}</ThemedText>
      <View style={[styles.sectionCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        {children}
      </View>
    </View>
  );
}

type SocialRowProps = {
  connected?: boolean;
  emoji: string;
  label: string;
  status: string;
};

function SocialRow({ connected, emoji, label, status }: SocialRowProps) {
  const theme = useTheme();

  return (
    <View style={styles.settingRow}>
      <View style={[styles.socialIcon, { backgroundColor: theme.background }]}>
        <ThemedText selectable={false} style={styles.socialEmoji}>{emoji}</ThemedText>
      </View>
      <View style={styles.rowCopy}>
        <ThemedText type="smallBold">{label}</ThemedText>
        <ThemedText type="small" themeColor={connected ? 'success' : 'textSecondary'}>{status}</ThemedText>
      </View>
      <Pressable
        style={[styles.connectButton, { borderColor: theme.border, backgroundColor: theme.background }]}>
        <ThemedText selectable={false} type="smallBold">{connected ? '해제' : '연결'}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.eight,
    gap: Spacing.five,
  },
  intro: { gap: Spacing.two },
  sectionWrap: { gap: Spacing.two },
  sectionCard: {
    borderWidth: 1,
    borderRadius: Radius.large,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  settingRow: {
    minHeight: 74,
    paddingHorizontal: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  rowEmoji: { fontSize: 24 },
  rowCopy: { flex: 1, gap: 1 },
  frequencyRow: { flexDirection: 'row', padding: Spacing.four, gap: Spacing.two },
  frequencyButton: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIcon: {
    width: 42,
    height: 42,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialEmoji: { fontSize: 20 },
  connectButton: {
    minWidth: 58,
    minHeight: 36,
    borderRadius: Radius.small,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAction: { minHeight: 54, justifyContent: 'center', paddingHorizontal: Spacing.four },
  version: { textAlign: 'center', paddingTop: Spacing.three },
});
