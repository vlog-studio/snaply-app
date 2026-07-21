import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';

import { SocialLoginList } from '@/features/sign-in';
import { MaxContentWidth, Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

export function SignInPage() {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={[styles.mark, { backgroundColor: theme.primary }]}>
            <Image
              contentFit="contain"
              source={require('@/assets/images/brand-glyph-white.png')}
              style={styles.glyph}
            />
          </View>
          <View style={styles.heroCopy}>
            <ThemedText type="eyebrow" themeColor="primary">
              SNAPLY
            </ThemedText>
            <ThemedText type="title">찍으면 알아서 됩니다.</ThemedText>
            <ThemedText themeColor="textSecondary">
              소셜 계정으로 3초 만에 시작하고 오늘의 찰나를 남겨보세요.
            </ThemedText>
          </View>
        </View>

        <View style={styles.actions}>
          <SocialLoginList />
          <ThemedText type="small" themeColor="textSecondary" style={styles.disclaimer}>
            계속하면 서비스 이용약관과 개인정보 처리방침에 동의하게 됩니다.
          </ThemedText>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.six,
    justifyContent: 'space-between',
  },
  hero: { flex: 1, justifyContent: 'center', gap: Spacing.six },
  mark: {
    width: 82,
    height: 82,
    borderRadius: Radius.large,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { width: 46, height: 46 },
  heroCopy: { gap: Spacing.two },
  actions: { gap: Spacing.four },
  disclaimer: { textAlign: 'center' },
});
