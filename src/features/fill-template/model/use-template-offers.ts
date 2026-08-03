import { useMemo } from 'react';

import { MovieTemplateCatalog, type MovieTemplate } from '@/entities/movie-template';
import { useSnaps } from '@/entities/snap';

import { groupIntoSessions, pickBestSession } from '../lib/match-template';

export type TemplateOffer = {
  template: MovieTemplate;
  /** How many of its slots the library can fill right now. */
  filled: number;
  /** How many it asks for. */
  slotCount: number;
};

/**
 * Every template with how far the library gets through it — what the studio's
 * cards read out.
 *
 * The point of showing the shortfall rather than hiding templates that do not
 * fit is that the shortfall is the invitation: "4/6컷 있음" is the app naming
 * two shots the user could go take. A template the library cannot fill at all
 * still belongs on the shelf for the same reason.
 */
export function useTemplateOffers(): TemplateOffer[] {
  const snaps = useSnaps();

  return useMemo(
    () =>
      MovieTemplateCatalog.map((template) => {
        const slotCount = template.slots.length;
        const best = pickBestSession(groupIntoSessions(snaps), slotCount);
        return {
          template,
          filled: Math.min(best?.snaps.length ?? 0, slotCount),
          slotCount,
        };
      }),
    [snaps],
  );
}
