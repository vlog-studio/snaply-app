import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';

import { MovieTitleMaxLength, useRenameMovie } from '@/entities/movie';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { FormTextField } from '@/shared/ui/form-text-field';
import { SnaplyButton } from '@/shared/ui/snaply-button';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import { renameMovieSchema, type RenameMovieValues } from '../model/rename-movie-schema';

export type RenameMovieSheetProps = {
  visible: boolean;
  movieId: string;
  /** The name to open on. */
  title: string;
  onClose: () => void;
};

/**
 * Renaming a movie.
 *
 * A feature rather than page code because both surfaces a movie has need it: the
 * editor names a draft, and the playback screen is where a finished movie finally
 * earns a name — a user names a thing after seeing it.
 *
 * The sheet is mounted with the movie's current name as its default, so it is
 * keyed by `movieId` at the call site to reset when the sheet moves to another
 * movie. Clearing the field is a valid submission: the movie goes back to being
 * called after the day it was started.
 */
export function RenameMovieSheet({ visible, movieId, title, onClose }: RenameMovieSheetProps) {
  const theme = useTheme();
  const renameMovie = useRenameMovie();
  const { control, handleSubmit } = useForm<RenameMovieValues>({
    resolver: zodResolver(renameMovieSchema),
    defaultValues: { title },
  });

  const submit = handleSubmit((values) => {
    renameMovie(movieId, values.title);
    onClose();
  });

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="무비 이름 바꾸기">
      <View style={styles.sheet}>
        <ThemedText type="heading">이름 바꾸기</ThemedText>
        <FormTextField
          control={control}
          name="title"
          label="무비 이름"
          placeholder="비워두면 만든 날짜로 지어요"
          maxLength={MovieTitleMaxLength}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
        />
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="이름 바꾸기 취소"
            onPress={onClose}
            style={[styles.cancel, { borderColor: theme.border }]}
          >
            <ThemedText selectable={false} type="button" themeColor="textSecondary">
              취소
            </ThemedText>
          </Pressable>
          <SnaplyButton title="저장" onPress={() => void submit()} style={styles.save} />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: { gap: Spacing.four },
  actions: { flexDirection: 'row', gap: Spacing.two },
  save: { flex: 1 },
  cancel: {
    minHeight: 56,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
