import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SnaplyButton } from '@/shared/ui/snaply-button';
import { isValidEmail } from '@/shared/lib/validation';
import { Spacing } from '@/shared/ui/theme';
import { TextField } from '@/shared/ui/text-field';
import { ThemedText } from '@/shared/ui/themed-text';

import { useEmailSignIn } from '../model/use-email-sign-in';

type FieldErrors = { email?: string; password?: string };

/**
 * Email/password sign-in form. Owns per-field validation (format, presence) and
 * delegates the async sign-in and its pending/error state to `useEmailSignIn`.
 * Cross-screen navigation (sign-up, password reset) is composed by the page.
 */
export function EmailSignInForm() {
  const { signIn, isPending, error } = useEmailSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleSubmit(): Promise<void> {
    const next: FieldErrors = {};
    if (!isValidEmail(email)) next.email = '올바른 이메일 주소를 입력해 주세요.';
    if (password.length === 0) next.password = '비밀번호를 입력해 주세요.';
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;
    await signIn(email, password);
  }

  return (
    <View style={styles.form}>
      <TextField
        label="이메일"
        value={email}
        onChangeText={setEmail}
        error={fieldErrors.email}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        editable={!isPending}
        returnKeyType="next"
      />
      <TextField
        label="비밀번호"
        value={password}
        onChangeText={setPassword}
        error={fieldErrors.password}
        placeholder="비밀번호"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        editable={!isPending}
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
      />
      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}
      <SnaplyButton
        title={isPending ? '로그인 중…' : '로그인'}
        disabled={isPending}
        onPress={handleSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.four },
});
