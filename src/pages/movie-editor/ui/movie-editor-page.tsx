import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MovieStatus } from '@/entities/movie';
import { useComposeMovie, type GenerationRefusal } from '@/features/compose-movie';
import { RenameMovieSheet } from '@/features/rename-movie';
import { SnaplyButton } from '@/shared/ui/snaply-button';
import { MaxContentWidth, Radius, Spacing, useTheme, useTopContentInset } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import { useMovieEditor } from '../model/use-movie-editor';
import { AssembleStep } from './assemble-step';
import { GenerateStep } from './generate-step';
import { StyleStep } from './style-step';
import { WizardSteps, type EditorStep } from './wizard-steps';

export type MovieEditorPageProps = {
  movieId?: string;
};

/** Row padding plus its two hairline borders, taken off the content column. */
const RowInset = Spacing.two * 2 + 2;

/**
 * What the subtitle says when there is nothing unsaved. A failed movie has to say
 * so here: the editor is where the board sends it, and its recovery is on ③.
 */
const SavedStateLines: Record<MovieStatus, string> = {
  draft: '초안으로 저장돼 있어요',
  generating: '생성 중이에요',
  ready: '완성된 무비예요',
  failed: '생성에 실패했어요. ③생성에서 다시 시도할 수 있어요',
};

/**
 * The movie editor — the three-step wizard every movie passes through (concept §6).
 *
 * Leaving at any point keeps the movie as a draft on the studio board, so the
 * footer's exit is an ordinary action rather than a warning. Steps stay reachable
 * for a movie a job already owns: its cuts and settings become a read-out, and ③
 * becomes the progress the user came back to see.
 */
export function MovieEditorPage({ movieId }: MovieEditorPageProps) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = useTopContentInset();
  const { width: windowWidth } = useWindowDimensions();
  const { saveStyle, startGeneration } = useComposeMovie();
  const editor = useMovieEditor(movieId);
  const { movie, cuts, totalSec, isDirty, canEdit, refusal } = editor;

  const [step, setStep] = useState<EditorStep>(0);
  const [renaming, setRenaming] = useState(false);
  const [generationRefusal, setGenerationRefusal] = useState<GenerationRefusal>();

  if (!movie) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: theme.background }]}>
        <ThemedText type="heading">무비를 찾을 수 없어요</ThemedText>
        <ThemedText themeColor="textSecondary">이미 사라졌거나 잘못된 주소예요.</ThemedText>
      </View>
    );
  }

  // Derived rather than measured (the content column is centered, capped, and
  // padded) so a trim bar lays out correctly on its first frame.
  const trimWidth = Math.min(windowWidth, MaxContentWidth) - Spacing.five * 2 - RowInset;

  const addSnaps = () =>
    router.push({ pathname: '/snaps', params: { select: '1', for: movie.id } });
  const watchMovie = () =>
    router.replace({ pathname: '/movie/[id]/play', params: { id: movie.id } });

  const goToStep = (next: EditorStep) => {
    // Moving off the cut list commits it: the working copy exists to keep "a movie
    // keeps at least one cut" a disabled control, not to be something the user has
    // to remember to save before walking away from it.
    if (step === 0 && next > 0 && !editor.save()) return;
    setGenerationRefusal(undefined);
    setStep(next);
  };

  const runGeneration = () => {
    const outcome = startGeneration(movie.id);
    setGenerationRefusal(outcome.refused);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Spacing.four + topInset, paddingBottom: Spacing.seven },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <ThemedText type="title" numberOfLines={1}>
              {movie.title}
            </ThemedText>
            <ThemedText
              type="small"
              themeColor={movie.status === 'failed' ? 'danger' : 'textSecondary'}
            >
              {isDirty ? '저장하지 않은 변경이 있어요' : SavedStateLines[movie.status]}
            </ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="무비 이름 바꾸기"
            hitSlop={8}
            onPress={() => setRenaming(true)}
          >
            <ThemedText selectable={false} type="smallBold" themeColor="primary">
              이름
            </ThemedText>
          </Pressable>
        </View>

        <WizardSteps current={step} onSelect={goToStep} />

        {step === 0 ? (
          <AssembleStep
            cuts={cuts}
            totalSec={totalSec}
            canEdit={canEdit}
            refusal={refusal}
            trimWidth={trimWidth}
            onMove={editor.moveCut}
            onRemove={editor.removeCut}
            onTrim={editor.trimCut}
            onResetTrim={editor.resetTrim}
            onAddSnaps={addSnaps}
          />
        ) : null}

        {step === 1 ? (
          <StyleStep
            movie={movie}
            totalSec={totalSec}
            canEdit={canEdit}
            onChange={(patch) => saveStyle(movie.id, patch)}
          />
        ) : null}

        {step === 2 ? (
          <GenerateStep
            movie={movie}
            cutCount={cuts.length}
            totalSec={totalSec}
            refusal={generationRefusal}
            onStart={runGeneration}
            onWatch={watchMovie}
          />
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom + Spacing.four,
          },
        ]}
      >
        {step === 0 && isDirty ? (
          <View style={styles.footerRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="변경 취소"
              onPress={editor.discard}
              style={[styles.secondaryAction, { borderColor: theme.border }]}
            >
              <ThemedText selectable={false} type="button" themeColor="textSecondary">
                되돌리기
              </ThemedText>
            </Pressable>
            <SnaplyButton
              title="컷 구성 저장"
              onPress={() => editor.save()}
              style={styles.primaryAction}
            />
          </View>
        ) : (
          <View style={styles.footerRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="이전 단계"
              accessibilityState={{ disabled: step === 0 }}
              disabled={step === 0}
              onPress={() => goToStep((step - 1) as EditorStep)}
              style={[
                styles.secondaryAction,
                { borderColor: theme.border, opacity: step === 0 ? 0.45 : 1 },
              ]}
            >
              <ThemedText selectable={false} type="button" themeColor="textSecondary">
                이전
              </ThemedText>
            </Pressable>
            {step < 2 ? (
              <SnaplyButton
                title={step === 1 ? '생성 단계로' : '다음'}
                onPress={() => goToStep((step + 1) as EditorStep)}
                style={styles.primaryAction}
              />
            ) : (
              <SnaplyButton
                title="나중에 하기"
                variant="secondary"
                onPress={() => router.back()}
                style={styles.primaryAction}
              />
            )}
          </View>
        )}
      </View>

      {/* Keyed by the movie so the field opens on the name that is stored now. */}
      <RenameMovieSheet
        key={`${movie.id}:${movie.title}`}
        visible={renaming}
        movieId={movie.id}
        title={movie.title}
        onClose={() => setRenaming(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.six,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.four,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  headerCopy: { flex: 1, gap: Spacing.half },
  footer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.four,
  },
  footerRow: { flexDirection: 'row', gap: Spacing.two },
  primaryAction: { flex: 1 },
  secondaryAction: {
    minHeight: 56,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
