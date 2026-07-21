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
          <View style={styles.brand}>
            <View style={[styles.mark, { backgroundColor: theme.primary }]}>
              <Image
                contentFit="contain"
                source={require('@/assets/images/brand-glyph-white.png')}
                style={styles.glyph}
              />
            </View>
            <ThemedText type="eyebrow" themeColor="primary">
              SNAPLY
            </ThemedText>
          </View>
          <View style={styles.heroCopy}>
            <ThemedText type="title" style={styles.centerText}>
              {'찍기만 하세요.\n나머지는 스냅리가.'}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.centerText}>
              오늘의 찰나, 스냅리에 남겨보세요.
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
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.five },
  brand: { alignItems: 'center', gap: Spacing.two },
  heroCopy: { alignItems: 'center', gap: Spacing.two },
  centerText: { textAlign: 'center' },
  mark: {
    width: 80,
    height: 80,
    borderRadius: Radius.large,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { width: 45, height: 45 },
  actions: { gap: Spacing.four },
  disclaimer: { textAlign: 'center' },
});
