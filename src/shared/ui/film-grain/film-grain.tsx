import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

// A tiled fractal-noise tile rendered as an inline SVG. expo-image decodes SVG
// on every platform, and the browser/native renderer resolves the turbulence
// filter into the grain texture.
const NOISE_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

/**
 * A faint film-grain texture laid over the whole app. This is the decisive
 * darkroom detail — it erases the "smooth, AI-generated" feel (concept §5).
 *
 * The grain must never intercept touches. `pointerEvents: 'none'` is applied to
 * the wrapping `View` (which honors it reliably on every platform) rather than
 * to the `expo-image` `Image` — the latter ignores it on Android native, which
 * left the full-screen overlay swallowing every tap.
 */
export function FilmGrain() {
  return (
    <View style={styles.grain}>
      <Image
        accessible={false}
        source={NOISE_SVG}
        contentFit="cover"
        style={StyleSheet.absoluteFill}
        // The overlay is decorative; skip fade-in so it is present from frame one.
        transition={0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grain: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.05,
    zIndex: 50,
    pointerEvents: 'none',
  },
});
