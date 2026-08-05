import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import {
  MovieBgmCatalog,
  MovieStyleCatalog,
  movieBgmLabel,
  type Movie,
  type MovieStylePatch,
} from '@/entities/movie';
import { formatSeconds } from '@/shared/lib/datetime';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

export type StylePanelProps = {
  movie: Movie;
  /** How long the cut list plays — what the target length reports. */
  totalSec: number;
  /** False while a job owns the movie; the settings become a read-out. */
  canEdit: boolean;
  onChange: (patch: MovieStylePatch) => void;
};

/**
 * The look and the sound.
 *
 * Every control writes straight through: a style is one tap and a switch is one
 * flip, so there is nothing to stage and no save button to explain. The cut list
 * buffers its edits for a different reason — its rule about a minimum cut count
 * has to be expressible as a disabled control.
 *
 * On a draft this panel is where the look is settled before the run is paid
 * for; on a result it is where the user says "not like that, like this" and
 * runs it again. Ratio and target length are read-outs, not controls: 9:16 is
 * the only ratio the product has, and the length follows the trims set in the
 * cut list.
 */
export function StylePanel({ movie, totalSec, canEdit, onChange }: StylePanelProps) {
  const theme = useTheme();
  const [bgmOpen, setBgmOpen] = useState(false);

  return (
    <View style={styles.step}>
      <View style={styles.sectionHead}>
        <ThemedText type="smallBold">스타일</ThemedText>
        <ThemedText type="edge" themeColor="textSecondary">
          1개 선택
        </ThemedText>
      </View>

      <View style={styles.grid}>
        {MovieStyleCatalog.map((option) => {
          const selected = option.id === movie.style;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: !canEdit }}
              accessibilityLabel={`${option.label} · ${option.description}`}
              disabled={!canEdit}
              onPress={() => onChange({ style: option.id })}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: selected ? theme.primary : theme.border,
                  borderWidth: selected ? 2 : 1,
                  opacity: !canEdit && !selected ? 0.55 : pressed ? 0.85 : 1,
                },
              ]}
            >
              {/* Two flat tones rather than a gradient: the palette carries one
                  accent, and four looks need four identities of their own. */}
              <View style={styles.swatch}>
                <View style={[styles.swatchHalf, { backgroundColor: option.swatch[0] }]} />
                <View style={[styles.swatchHalf, { backgroundColor: option.swatch[1] }]} />
              </View>
              <ThemedText selectable={false} type="smallBold">
                {option.label}
              </ThemedText>
              <ThemedText selectable={false} type="edge" themeColor="textSecondary">
                {option.description}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sectionHead}>
        <ThemedText type="smallBold">세부</ThemedText>
      </View>

      <View style={[styles.details, { backgroundColor: theme.backgroundElement }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`배경 음악 ${movieBgmLabel(movie.bgm)}`}
          accessibilityState={{ disabled: !canEdit }}
          disabled={!canEdit}
          onPress={() => setBgmOpen(true)}
          style={styles.detailRow}
        >
          <ThemedText type="small">배경 음악</ThemedText>
          <ThemedText selectable={false} type="small" themeColor="primary">
            {movieBgmLabel(movie.bgm)} ›
          </ThemedText>
        </Pressable>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.detailRow}>
          <ThemedText type="small">자동 자막</ThemedText>
          <Switch
            accessibilityLabel="자동 자막"
            disabled={!canEdit}
            value={movie.captions}
            onValueChange={(captions) => onChange({ captions })}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={theme.border}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.detailRow}>
          <ThemedText type="small">비율</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {movie.ratio}
          </ThemedText>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.detailRow}>
          <ThemedText type="small">목표 길이</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            컷 합계 ({formatSeconds(totalSec)})
          </ThemedText>
        </View>
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        스타일은 전환·색보정·음악에만 적용돼요. 컷 순서와 길이는 ①에서 정한 그대로예요.
      </ThemedText>

      <BottomSheet
        visible={bgmOpen}
        onClose={() => setBgmOpen(false)}
        accessibilityLabel="배경 음악 선택"
      >
        <View style={styles.sheet}>
          <ThemedText type="heading">배경 음악</ThemedText>
          {MovieBgmCatalog.map((track) => {
            const selected = track.id === movie.bgm;
            return (
              <Pressable
                key={track.id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={track.label}
                onPress={() => {
                  onChange({ bgm: track.id });
                  setBgmOpen(false);
                }}
                style={({ pressed }) => [
                  styles.trackRow,
                  {
                    borderColor: selected ? theme.primary : theme.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <ThemedText selectable={false} type="small">
                  {track.label}
                </ThemedText>
                {selected ? (
                  <ThemedText selectable={false} type="small" themeColor="primary">
                    ✓
                  </ThemedText>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  step: { gap: Spacing.three },
  sectionHead: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  card: {
    // Two per row, whatever the content column is: half the row minus the gap.
    flexBasis: '48%',
    flexGrow: 1,
    gap: Spacing.half,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    padding: Spacing.three,
  },
  swatch: {
    height: 44,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    overflow: 'hidden',
    marginBottom: Spacing.one,
  },
  swatchHalf: { flex: 1 },
  details: {
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  detailRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  divider: { height: StyleSheet.hairlineWidth },
  sheet: { gap: Spacing.two },
  trackRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
  },
});
