import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useDeleteMovie, useMovieById } from '@/entities/movie';
import { RenameMovieForm } from '@/features/rename-movie';
import { useShareMovie } from '@/features/share-movie';
import { formatSeconds } from '@/shared/lib/datetime';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';
import type { MovieSummary } from '@/widgets/movie-shelf';

import { MovieDeleteConfirm } from './movie-delete-confirm';

/** Where the open sheet stands: the menu, or the step one of its rows led to. */
type Step = 'menu' | 'rename' | 'delete';

export type MovieActionsSheetProps = {
  visible: boolean;
  /** The movie the sheet acts on. Kept through the close animation. */
  movie?: MovieSummary;
  onClose: () => void;
};

const SheetLabels: Record<Step, string> = {
  menu: '무비 옵션',
  rename: '무비 이름 바꾸기',
  delete: '무비 삭제 확인',
};

/**
 * What a long press on a movie tile opens: everything the grid can do to one
 * movie — rename, share, delete — behind a single gesture, so the tile itself
 * stays a plain "open me" surface.
 *
 * Rename and delete are steps *inside* this sheet rather than sheets of their
 * own: closing one RN Modal and presenting the next in the same breath is a
 * race iOS regularly loses, so the one Modal stays up and only its content
 * changes. Cancelling a step returns to the menu it came from; finishing one
 * closes the sheet.
 *
 * Share needs the full movie (`render.uri` is not in the summary a tile
 * carries), so the sheet looks it up by id. The row exists only while there is
 * a file to hand over — a share that cannot happen is not offered, so today,
 * with generation simulated and rendering no file, the menu holds two rows.
 * When a renderer fills `Movie.render.uri` the row appears on its own.
 *
 * The menu reads as one control, iOS-action-sheet style: a centered, plain
 * header naming the movie, then the actions in a single bordered group split
 * by hairlines — matching the app's centered button language rather than a
 * settings list.
 */
export function MovieActionsSheet({ visible, movie, onClose }: MovieActionsSheetProps) {
  const theme = useTheme();
  const [step, setStep] = useState<Step>('menu');
  const deleteMovie = useDeleteMovie();
  const sharing = useShareMovie(useMovieById(movie?.id));

  // Every opening starts at the menu, whatever step the last visit ended on.
  // Reset on open rather than on close so the content holds still while the
  // sheet slides away. Adjusted during render (the documented prop-change
  // pattern) rather than in an effect.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setStep('menu');
  }

  if (!movie) return null;

  const confirmDelete = () => {
    // Synchronous store write: the movie is only a composition, so nothing on
    // disk goes with it — the snap originals belong to the snaps.
    deleteMovie(movie.id);
    onClose();
  };

  return (
    <BottomSheet accessibilityLabel={SheetLabels[step]} visible={visible} onClose={onClose}>
      {step === 'menu' ? (
        <>
          <View style={styles.header}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {movie.title}
            </ThemedText>
            <ThemedText type="note" themeColor="textSecondary">
              컷 {movie.snapCount} · {formatSeconds(movie.totalSec)} · {movie.dateLabel}
            </ThemedText>
          </View>

          <View style={[styles.group, { borderColor: theme.border }]}>
            <ActionRow label="이름 바꾸기" onPress={() => setStep('rename')} />
            {sharing.blocked ? null : (
              <ActionRow
                divider
                label="공유"
                onPress={() => {
                  sharing.share();
                  onClose();
                }}
              />
            )}
            <ActionRow divider label="삭제" danger onPress={() => setStep('delete')} />
          </View>
        </>
      ) : null}

      {step === 'rename' ? (
        <RenameMovieForm
          key={movie.id}
          movieId={movie.id}
          title={movie.title}
          onCancel={() => setStep('menu')}
          onSaved={onClose}
        />
      ) : null}

      {step === 'delete' ? (
        <MovieDeleteConfirm
          movie={movie}
          onCancel={() => setStep('menu')}
          onConfirm={confirmDelete}
        />
      ) : null}
    </BottomSheet>
  );
}

type ActionRowProps = {
  label: string;
  danger?: boolean;
  /** Draws the hairline above — every row in the group but the first. */
  divider?: boolean;
  onPress: () => void;
};

function ActionRow({ label, danger, divider, onPress }: ActionRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        divider ? [styles.divider, { borderTopColor: theme.border }] : null,
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <ThemedText selectable={false} type="button" themeColor={danger ? 'danger' : undefined}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: Spacing.half },
  group: {
    borderWidth: 1,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  row: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
});
