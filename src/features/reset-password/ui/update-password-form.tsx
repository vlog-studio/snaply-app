import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { isValidPassword, PASSWORD_MIN_LENGTH } from '@/shared/lib/validation';
import { SnaplyButton } from '@/shared/ui/snaply-button';
import { Spacing } from '@/shared/ui/theme';
import { TextField } from '@/shared/ui/text-field';
import { ThemedText } from '@/shared/ui/themed-text';

import { useUpdatePassword } from '../model/use-update-password';

type FieldErrors = { password?: string; confirm?: string };

/**
 * Step 2 UI of password reset, shown on the update-password screen after a
 * recovery deep link. Sets the new password; on success the recovery state
 * ends and the route guard reveals the app.
 */
export function UpdatePasswordForm() {
  const { updatePassword, isPending, error } = useUpdatePassword();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function handleSubmit(): void {
    const next: FieldErrors = {};
    if (!isValidPassword(password))
      next.password = `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 해요.`;
    if (confirm !== password) next.confirm = '비밀번호가 일치하지 않아요.';
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;
    void updatePassword(password);
  }

  return (
    <View style={styles.form}>
      <ThemedText themeColor="textSecondary">새로 사용할 비밀번호를 입력해 주세요.</ThemedText>
      <TextField
        label="새 비밀번호"
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
        label="새 비밀번호 확인"
        value={confirm}
        onChangeText={setConfirm}
        error={fieldErrors.confirm}
        placeholder="새 비밀번호 다시 입력"
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
        title={isPending ? '변경 중…' : '비밀번호 변경'}
        disabled={isPending}
        onPress={handleSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.four },
});
