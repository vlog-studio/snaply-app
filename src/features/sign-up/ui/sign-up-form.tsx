import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { isValidEmail, isValidPassword, PASSWORD_MIN_LENGTH } from '@/shared/lib/validation';
import { SnaplyButton } from '@/shared/ui/snaply-button';
import { Spacing } from '@/shared/ui/theme';
import { TextField } from '@/shared/ui/text-field';
import { ThemedText } from '@/shared/ui/themed-text';

type Props = {
  onSubmit: (email: string, password: string) => void;
  isPending: boolean;
  error: string | null;
};

type FieldErrors = { email?: string; password?: string; confirm?: string };

/** Presentational account-creation form. Owns field validation only; the async
 *  sign-up and its pending/error state are owned by the flow hook via props. */
export function SignUpForm({ onSubmit, isPending, error }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function handleSubmit(): void {
    const next: FieldErrors = {};
    if (!isValidEmail(email)) next.email = '올바른 이메일 주소를 입력해 주세요.';
    if (!isValidPassword(password))
      next.password = `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 해요.`;
    if (confirm !== password) next.confirm = '비밀번호가 일치하지 않아요.';
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;
    onSubmit(email, password);
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
      />
      <TextField
        label="비밀번호"
        value={password}
        onChangeText={setPassword}
        error={fieldErrors.password}
        placeholder={`${PASSWORD_MIN_LENGTH}자 이상`}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        editable={!isPending}
      />
      <TextField
        label="비밀번호 확인"
        value={confirm}
        onChangeText={setConfirm}
        error={fieldErrors.confirm}
        placeholder="비밀번호 다시 입력"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        editable={!isPending}
        onSubmitEditing={handleSubmit}
      />
      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}
      <SnaplyButton
        title={isPending ? '가입 중…' : '가입하기'}
        disabled={isPending}
        onPress={handleSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.four },
});
