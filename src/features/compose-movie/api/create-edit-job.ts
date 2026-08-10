import { z } from 'zod';

import { movieStyleOrDefault, type MovieStyle } from '@/entities/movie';
import { apiRequest } from '@/shared/api';
import { USE_MOCK_API } from '@/shared/config/api';

/**
 * The app's styles as the backend names its editing presets.
 *
 * This table is the whole reason `MovieStyle` may stay English (see its own
 * doc comment): the correspondence is one-to-one, and it lives at the API
 * boundary so a preset renamed on the server moves one line. The literals are
 * checked against the generated spec at the `apiRequest` call below — a value
 * the enum does not have is a compile error here, not a 400 at runtime.
 */
const StylePresets: Record<MovieStyle, '감성' | '여행' | '일상'> = {
  emotional: '감성',
  travel: '여행',
  daily: '일상',
};

export type CreateEditJobInput = {
  /**
   * The server ids of the cuts, **in cut order** — the backend renders them in
   * the order they arrive (its `fetch_source_keys` is explicit about it), which
   * is the only channel the app has for the order the user settled on.
   */
  videoIds: readonly string[];
  style: MovieStyle;
};

const jobStartSchema = z.object({ jobId: z.string() });

async function createFromApi(input: CreateEditJobInput, signal?: AbortSignal): Promise<string> {
  const { jobId } = await apiRequest('/edit-jobs', {
    method: 'POST',
    body: {
      videoIds: [...input.videoIds],
      stylePreset: StylePresets[movieStyleOrDefault(input.style)],
    },
    schema: jobStartSchema,
    signal,
  });
  return jobId;
}

function createMock(input: CreateEditJobInput): Promise<string> {
  if (__DEV__) {
    console.log(`[compose-movie][mock] edit job queued for ${input.videoIds.length} videos`);
  }
  return Promise.resolve(`mock-job-${Date.now()}`);
}

/**
 * Queue a generation run (`POST /edit-jobs`) and return the server's job id.
 *
 * The endpoint accepts nothing but the cut ids and a preset, so a movie's trim
 * windows, BGM choice, captions flag, title, and ratio do not travel with it —
 * see the movie feature document for what that means on screen. Everything it
 * *can* refuse it refuses with a `403`: a video that is not the caller's, is not
 * `ready`, or is itself a generated result, and the free plan's monthly cap.
 * Both cases share the code `FORBIDDEN` and differ only in the message, so the
 * message is what the user is shown.
 *
 * Routes to the mock until an API origin is configured.
 */
export function createEditJob(input: CreateEditJobInput, signal?: AbortSignal): Promise<string> {
  return USE_MOCK_API ? createMock(input) : createFromApi(input, signal);
}
