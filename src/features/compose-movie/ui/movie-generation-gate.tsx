import { useGenerationRunner } from '../model/use-generation-runner';

/**
 * Headless mount point for movie generation. Render once high in the tree so a
 * job keeps running while the user browses other tabs, and is picked back up on
 * the next app start if they left before it finished.
 */
export function MovieGenerationGate(): null {
  useGenerationRunner();
  return null;
}
