import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { TemplateOffer } from '@/features/fill-template';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

export type TemplatePanelProps = {
  offers: TemplateOffer[];
  onOpen: (templateId: string) => void;
};

const CardWidth = 168;

/**
 * The other way to start a movie: pick the shape first and let the app find the
 * material, instead of gathering material and deciding later.
 *
 * It sits beside the tray rather than replacing it, because the two answer
 * different questions — the tray is "these ones", a template is "something like
 * this" — and because the shortfall a card prints ("4/6컷 있음") is the one thing
 * in the app that tells a user what to go out and shoot.
 */
export function TemplatePanel({ offers, onOpen }: TemplatePanelProps) {
  const theme = useTheme();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <ThemedText type="smallBold">템플릿으로 시작</ThemedText>
        <ThemedText type="edge" themeColor="textSecondary">
          내 스냅 기준
        </ThemedText>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {offers.map(({ template, filled, slotCount }) => {
          const isComplete = filled === slotCount;
          return (
            <Pressable
              key={template.id}
              accessibilityRole="button"
              accessibilityLabel={`${template.name} · ${template.description} · ${slotCount}컷 중 ${filled}컷 있음`}
              onPress={() => onOpen(template.id)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <ThemedText selectable={false} type="smallBold" numberOfLines={1}>
                {template.name}
              </ThemedText>
              <ThemedText
                selectable={false}
                type="small"
                themeColor="textSecondary"
                numberOfLines={2}
                style={styles.description}
              >
                {template.description}
              </ThemedText>
              <ThemedText
                selectable={false}
                type="edge"
                themeColor={isComplete ? 'lumen' : 'textSecondary'}
              >
                {isComplete
                  ? `바로 만들 수 있어요 · ${slotCount}컷`
                  : `${filled}/${slotCount}컷 있음 · ${slotCount - filled}컷 더`}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  sectionHead: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  row: { gap: Spacing.two, paddingRight: Spacing.two },
  card: {
    width: CardWidth,
    minHeight: 118,
    borderWidth: 1,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    padding: Spacing.three,
    gap: Spacing.one,
    justifyContent: 'space-between',
  },
  description: { flex: 1 },
});
