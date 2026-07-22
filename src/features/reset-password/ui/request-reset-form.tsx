import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { isValidEmail } from '@/shared/lib/validation';
import { SnaplyButton } from '@/shared/ui/snaply-button';
import { Spacing } from '@/shared/ui/theme';
import { TextField } from '@/shared/ui/text-field';
import { ThemedText } from '@/shared/ui/themed-text';

type Props = {
  onSubmit: (email: string) => void;
  isPending: boolean;
  error: string | null;
};

/** Step 1: enter the account email to receive a recovery code. */
export function RequestResetForm({ onSubmit, isPending, error }: Props) {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string>();

  function handleSubmit(): void {
    if (!isValidEmail(email)) {
      setFieldError('올바른 이메일 주소를 입력해 주세요.');
      return;
    }
    setFieldError(undefined);
    onSubmit(email);
  }

  return (
    <View style={styles.form}>
      <ThemedText type="small" themeColor="textSecondary">
        가입한 이메일 주소로 인증 코드를 보내드려요.
      </ThemedText>
      <TextField
        label="이메일"
        value={email}
        onChangeText={setEmail}
        error={fieldError ?? undefined}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        editable={!isPending}
        onSubmitEditing={handleSubmit}
      />
      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}
      <SnaplyButton
        title={isPending ? '전송 중…' : '인증 코드 받기'}
        disabled={isPending}
        onPress={handleSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.four },
});
