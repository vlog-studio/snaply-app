import { z } from 'zod';

import { apiRequest } from './client';
import { apiPath } from './paths';

/**
 * Compile-time contract of `apiRequest`'s spec-derived typing. None of these
 * thunks is ever called — `npm run typecheck` is the real assertion, including
 * that every `@ts-expect-error` line genuinely fails to compile (tsc reports an
 * unused suppression otherwise).
 */
describe('apiRequest type contract', () => {
  const accepted: (() => unknown)[] = [
    // A schema may narrow the spec's data to the fields the app consumes.
    () =>
      apiRequest('/videos/upload-url', {
        query: { filename: 'a.mp4', contentType: 'video/mp4' },
        schema: z.object({ videoId: z.string(), uploadUrl: z.string() }),
      }),
    // z.unknown() opts out of response typing (the body still type-checks).
    () =>
      apiRequest('/videos', {
        method: 'POST',
        body: { videoId: 'video-1', durationSeconds: 3 },
        schema: z.unknown(),
      }),
    // A resolved path keeps the typing of the template it was built from.
    () =>
      apiRequest(apiPath('/videos/{id}', { id: 'video-1' }), {
        method: 'DELETE',
        schema: z.unknown(),
      }),
  ];

  const rejected: (() => unknown)[] = [
    () =>
      apiRequest('/videos/upload-url', {
        // @ts-expect-error — `filenam` is not a query parameter of this endpoint
        query: { filenam: 'a.mp4', contentType: 'video/mp4' },
        schema: z.unknown(),
      }),
    () =>
      apiRequest('/videos', {
        method: 'POST',
        // @ts-expect-error — the spec types durationSeconds as a number
        body: { videoId: 'video-1', durationSeconds: '3' },
        schema: z.unknown(),
      }),
    () =>
      apiRequest('/videos/upload-url', {
        query: { filename: 'a.mp4', contentType: 'video/mp4' },
        // @ts-expect-error — GET /videos/upload-url takes no request body
        body: { anything: true },
        schema: z.unknown(),
      }),
    () =>
      apiRequest('/locations', {
        // @ts-expect-error — the spec defines no POST /locations
        method: 'POST',
        schema: z.unknown(),
      }),
    () =>
      apiRequest('/videos/upload-url', {
        query: { filename: 'a.mp4', contentType: 'video/mp4' },
        // @ts-expect-error — the spec's data carries no `downloadUrl` field
        schema: z.object({ downloadUrl: z.string() }),
      }),
    // @ts-expect-error — POST-only endpoint: omitting `method` would GET it
    () => apiRequest('/edit-jobs', { schema: z.unknown() }),
  ];

  it('keeps its compile-time cases anchored to real code', () => {
    expect(accepted).toHaveLength(3);
    expect(rejected).toHaveLength(6);
  });
});
