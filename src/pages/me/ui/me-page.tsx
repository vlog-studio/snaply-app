import { Ionicons } from '@expo/vector-icons';
import { useScrollToTop } from 'expo-router';
import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { useMovies } from '@/entities/movie';
import { useClearSession, useCurrentUser } from '@/entities/session';
import { useSnaps } from '@/entities/snap';
import { useTraySnapIds } from '@/entities/tray';
import {
  INTEREST_OPTIONS,
  useInterests,
  useLocationAlerts,
  useMovieReadyAlerts,
  useQuietEnd,
  useQuietStart,
  useReminderFrequency,
  useReminderWindows,
  useSetQuietEnd,
  useSetQuietStart,
  useSetReminderFrequency,
  useSetReminderWindow,
  useToggleInterest,
  type ReminderWindowId,
} from '@/features/notification-settings';
import {
  MaxContentWidth,
  Radius,
  Spacing,
  useSetThemeMode,
  useTabBarHeight,
  useTheme,
  useThemeMode,
  useTopContentInset,
  type ThemeMode,
} from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

type RowIconName = keyof typeof Ionicons.glyphMap;

const reminderWindowOptions: readonly {
  id: ReminderWindowId;
  icon: RowIconName;
  label: string;
  time: string;
}[] = [
  { id: 'morning', icon: 'partly-sunny-outline', label: '아침', time: '08:00 – 10:00' },
  { id: 'lunch', icon: 'sunny-outline', label: '점심', time: '12:00 – 14:00' },
  { id: 'evening', icon: 'moon-outline', label: '저녁', time: '18:00 – 21:00' },
];

const themeModeOptions: readonly { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: '시스템' },
  { mode: 'light', label: '라이트' },
  { mode: 'dark', label: '다크' },
];

/**
 * The 나 tab — who you are, what you have made, and every preference.
 *
 * It was a stack screen reached from a corner control; it is a tab now because
 * the four-tab structure has room for it and a settings screen the user cannot
 * find is a settings screen that does not exist (concept §5).
 */
export function MePage() {
  const theme = useTheme();
  const topInset = useTopContentInset();
  const tabBarHeight = useTabBarHeight();
  // The longest scroll in the app, so the way back up matters most here:
  // re-tapping the 나 tab returns to the top, switching tabs does not.
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const currentUser = useCurrentUser();
  const clearSession = useClearSession();
  const snaps = useSnaps();
  const movies = useMovies();
  const traySnapIds = useTraySnapIds();
  const reminderWindows = useReminderWindows();
  const setReminderWindow = useSetReminderWindow();
  const reminderFrequency = useReminderFrequency();
  const setReminderFrequency = useSetReminderFrequency();
  const movieReadyAlerts = useMovieReadyAlerts();
  const locationAlerts = useLocationAlerts();
  const quietStart = useQuietStart();
  const quietEnd = useQuietEnd();
  const setQuietStart = useSetQuietStart();
  const setQuietEnd = useSetQuietEnd();
  const interests = useInterests();
  const toggleInterest = useToggleInterest();

  return (
    <ScrollView
      ref={scrollRef}
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Spacing.six + topInset, paddingBottom: Spacing.eight + tabBarHeight },
      ]}
    >
      <View style={styles.profile}>
        <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText selectable={false} type="subtitle">
            {(currentUser?.displayName ?? '?').charAt(0)}
          </ThemedText>
        </View>
        <View style={styles.profileCopy}>
          <ThemedText type="heading" numberOfLines={1}>
            {currentUser?.displayName ?? '로그인하지 않음'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {currentUser ? '로그인됨' : '세션이 없어요'}
          </ThemedText>
        </View>
      </View>

      <View
        style={[
          styles.statsCard,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}
      >
        <StatCell label="스냅" value={snaps.length} />
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <StatCell label="무비" value={movies.length} />
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <StatCell label="트레이" value={traySnapIds.length} />
      </View>

      <SettingsSection title="화면 테마">
        <ThemeModeSelector />
      </SettingsSection>

      <SettingsSection title="촬영 리마인더">
        {reminderWindowOptions.map((window, index) => (
          <View
            key={window.id}
            style={[
              styles.settingRow,
              index > 0 && { borderTopWidth: 1, borderTopColor: theme.border },
            ]}
          >
            <RowIcon name={window.icon} />
            <View style={styles.rowCopy}>
              <ThemedText type="smallBold">{window.label}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {window.time}
              </ThemedText>
            </View>
            <Switch
              accessibilityLabel={`${window.label} 촬영 리마인더`}
              value={reminderWindows[window.id]}
              onValueChange={(value) => setReminderWindow(window.id, value)}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={theme.border}
            />
          </View>
        ))}
        <View style={{ height: 1, backgroundColor: theme.border }} />
        <View style={styles.settingRow}>
          <View style={styles.rowCopy}>
            <ThemedText type="smallBold">하루 빈도</ThemedText>
          </View>
          <View style={styles.frequencyOptions}>
            {[1, 2, 3].map((value) => {
              const isSelected = reminderFrequency === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityLabel={`하루 ${value}회`}
                  accessibilityState={{ checked: isSelected }}
                  onPress={() => setReminderFrequency(value)}
                  style={[
                    styles.frequencyOption,
                    {
                      backgroundColor: isSelected ? theme.text : theme.background,
                      borderColor: isSelected ? theme.text : theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    selectable={false}
                    type="smallBold"
                    style={{ color: isSelected ? theme.background : theme.text }}
                  >
                    {value}회
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </SettingsSection>

      <SettingsSection title="무비 알림">
        <View style={styles.settingRow}>
          <RowIcon name="sparkles-outline" />
          <View style={styles.rowCopy}>
            <ThemedText type="smallBold">무비 완성 알림</ThemedText>
            <ThemedText
              type="small"
              themeColor={movieReadyAlerts.blocked ? 'danger' : 'textSecondary'}
            >
              {movieReadyAlerts.blocked
                ? '기기 설정에서 Snaply 알림을 켜야 받을 수 있어요.'
                : '생성이 끝나거나 실패하면 알려드려요. 앱을 꺼두면 다음에 열 때 알려드려요.'}
            </ThemedText>
          </View>
          <Switch
            accessibilityLabel="무비 완성 알림"
            value={movieReadyAlerts.enabled}
            onValueChange={movieReadyAlerts.setEnabled}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={theme.border}
          />
        </View>
      </SettingsSection>

      <SettingsSection title="위치 알림">
        <View style={styles.settingRow}>
          <RowIcon name="location-outline" />
          <View style={styles.rowCopy}>
            <ThemedText type="smallBold">위치 알림 받기</ThemedText>
            <ThemedText
              type="small"
              themeColor={locationAlerts.blocked ? 'danger' : 'textSecondary'}
            >
              {locationAlerts.blocked
                ? '기기 설정에서 위치를 항상 허용해야 받을 수 있어요.'
                : '주변 촬영 스팟에 도착하면 알려드려요.'}
            </ThemedText>
          </View>
          <Switch
            accessibilityLabel="위치 알림 받기"
            value={locationAlerts.enabled}
            onValueChange={locationAlerts.setEnabled}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={theme.border}
          />
        </View>
      </SettingsSection>

      <SettingsSection title="관심사">
        <View style={styles.chipsRow}>
          {INTEREST_OPTIONS.map((interest) => {
            const isSelected = interests.includes(interest);
            return (
              <Pressable
                key={interest}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                onPress={() => toggleInterest(interest)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? theme.text : theme.background,
                    borderColor: isSelected ? theme.text : theme.border,
                  },
                ]}
              >
                <ThemedText
                  selectable={false}
                  type="smallBold"
                  style={{ color: isSelected ? theme.background : theme.text }}
                >
                  {interest}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </SettingsSection>

      <SettingsSection title="조용한 시간">
        <HourStepper label="시작" value={quietStart} onChange={setQuietStart} />
        <View style={{ height: 1, backgroundColor: theme.border }} />
        <HourStepper label="종료" value={quietEnd} onChange={setQuietEnd} />
        <View style={{ height: 1, backgroundColor: theme.border }} />
        <View style={styles.quietHint}>
          <ThemedText type="small" themeColor="textSecondary">
            {`${formatHour(quietStart)}부터 ${formatHour(quietEnd)}까지는 알림을 보내지 않아요.`}
          </ThemedText>
        </View>
      </SettingsSection>

      <SettingsSection title="소셜 연결">
        <SocialRow icon="logo-tiktok" label="TikTok" status="연결 안 됨" />
        <View style={{ height: 1, backgroundColor: theme.border }} />
        <SocialRow icon="logo-instagram" label="Instagram" status="연결 안 됨" />
      </SettingsSection>

      <SettingsSection title="계정">
        <Pressable accessibilityRole="button" style={styles.accountAction} onPress={clearSession}>
          <ThemedText type="smallBold">로그아웃</ThemedText>
        </Pressable>
        <View style={{ height: 1, backgroundColor: theme.border }} />
        <Pressable accessibilityRole="button" style={styles.accountAction}>
          <ThemedText type="smallBold" themeColor="danger">
            계정 삭제
          </ThemedText>
        </Pressable>
      </SettingsSection>

      <ThemedText type="small" themeColor="textSecondary" style={styles.version}>
        Snaply 1.0 · 찍으면 알아서 됩니다.
      </ThemedText>
    </ScrollView>
  );
}

function ThemeModeSelector() {
  const theme = useTheme();
  const themeMode = useThemeMode();
  const setThemeMode = useSetThemeMode();

  return (
    <View style={styles.frequencyRow}>
      {themeModeOptions.map(({ mode, label }) => {
        const isSelected = themeMode === mode;
        return (
          <Pressable
            key={mode}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            onPress={() => setThemeMode(mode)}
            style={[
              styles.frequencyButton,
              {
                backgroundColor: isSelected ? theme.text : theme.background,
                borderColor: isSelected ? theme.text : theme.border,
              },
            ]}
          >
            <ThemedText
              selectable={false}
              type="smallBold"
              style={{ color: isSelected ? theme.background : theme.text }}
            >
              {label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="heading">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

/**
 * Leading icon badge shared by every settings row, so the rows read as one
 * list instead of a mix of platform emoji weights and colors.
 */
function RowIcon({ name }: { name: RowIconName }) {
  const theme = useTheme();

  return (
    <View style={[styles.rowIcon, { backgroundColor: theme.backgroundSelected }]}>
      <Ionicons color={theme.textSecondary} name={name} size={18} />
    </View>
  );
}

function SettingsSection({ children, title }: React.PropsWithChildren<{ title: string }>) {
  const theme = useTheme();

  return (
    <View style={styles.sectionWrap}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {title}
      </ThemedText>
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

type SocialRowProps = {
  connected?: boolean;
  icon: RowIconName;
  label: string;
  status: string;
};

function SocialRow({ connected, icon, label, status }: SocialRowProps) {
  const theme = useTheme();

  return (
    <View style={styles.settingRow}>
      <RowIcon name={icon} />
      <View style={styles.rowCopy}>
        <ThemedText type="smallBold">{label}</ThemedText>
        <ThemedText type="small" themeColor={connected ? 'ai' : 'textSecondary'}>
          {status}
        </ThemedText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={connected ? `${label} 연결 해제` : `${label} 연결`}
        style={[
          styles.connectButton,
          { borderColor: theme.border, backgroundColor: theme.background },
        ]}
      >
        <ThemedText selectable={false} type="smallBold">
          {connected ? '해제' : '연결'}
        </ThemedText>
      </Pressable>
    </View>
  );
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

type HourStepperProps = {
  label: string;
  value: number;
  onChange: (hour: number) => void;
};

function HourStepper({ label, value, onChange }: HourStepperProps) {
  const theme = useTheme();

  return (
    <View style={styles.settingRow}>
      <View style={styles.rowCopy}>
        <ThemedText type="smallBold">{label}</ThemedText>
      </View>
      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} 시간 줄이기`}
          onPress={() => onChange((value + 23) % 24)}
          style={[styles.stepperButton, { borderColor: theme.border }]}
        >
          <ThemedText selectable={false} type="smallBold">
            −
          </ThemedText>
        </Pressable>
        <ThemedText selectable={false} type="smallBold" style={styles.stepperValue}>
          {formatHour(value)}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} 시간 늘리기`}
          onPress={() => onChange((value + 1) % 24)}
          style={[styles.stepperButton, { borderColor: theme.border }]}
        >
          <ThemedText selectable={false} type="smallBold">
            +
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.five,
  },
  profile: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCopy: { flex: 1, gap: Spacing.half },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.large,
    borderCurve: 'continuous',
    paddingVertical: Spacing.four,
  },
  stat: { flex: 1, alignItems: 'center', gap: Spacing.half },
  statDivider: { width: 1, alignSelf: 'stretch', marginVertical: Spacing.one },
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
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  frequencyOptions: { flexDirection: 'row', gap: Spacing.two },
  frequencyOption: {
    minWidth: 56,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectButton: {
    minWidth: 58,
    minHeight: 36,
    borderRadius: Radius.small,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAction: { minHeight: 54, justifyContent: 'center', paddingHorizontal: Spacing.four },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  stepperButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: { minWidth: 56, textAlign: 'center' },
  quietHint: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.three },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', padding: Spacing.four, gap: Spacing.two },
  chip: {
    minHeight: 40,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  version: { textAlign: 'center', paddingTop: Spacing.three },
});
