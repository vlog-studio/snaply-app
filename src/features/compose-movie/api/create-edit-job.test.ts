import type { MovieStyle } from '@/entities/movie';

import { createEditJob } from './create-edit-job';

jest.mock('@/shared/config/api', () => ({ USE_MOCK_API: false }));

const mockApiRequest = jest.fn();
jest.mock('@/shared/api', () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
}));

/** The body the call would send for these inputs. */
async function bodyFor(videoIds: string[], style: MovieStyle) {
  mockApiRequest.mockResolvedValueOnce({ jobId: 'job-1' });
  await createEditJob({ videoIds, style });
  return mockApiRequest.mock.calls[0][1].body;
}

const emotional = '\uAC10\uC131'; // 감성
const travel = '\uC5EC\uD589'; // 여행
const daily = '\uC77C\uC0C1'; // 일상

describe('createEditJob', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the job id the server issued', async () => {
    mockApiRequest.mockResolvedValueOnce({ jobId: 'job-7' });
    await expect(createEditJob({ videoIds: ['v1'], style: 'daily' })).resolves.toBe('job-7');
  });

  it.each([
    ['emotional', emotional],
    ['travel', travel],
    ['daily', daily],
  ])('sends %s as the backend preset it maps to', async (style, preset) => {
    const body = await bodyFor(['v1'], style as MovieStyle);
    expect(body.stylePreset).toBe(preset);
  });

  // A movie stored by an older build names a style this build dropped; sending
  // it would be a 400, so it goes as the default preset instead.
  it('sends the default preset for a retired style', async () => {
    const body = await bodyFor(['v1'], 'calm' as MovieStyle);
    expect(body.stylePreset).toBe(daily);
  });

  // The array order is the cut order — the backend renders the ids in the order
  // they arrive, and nothing else carries the order the user settled on.
  it('sends the cut ids in the order it was given them', async () => {
    const body = await bodyFor(['v3', 'v1', 'v2'], 'daily');
    expect(body.videoIds).toEqual(['v3', 'v1', 'v2']);
  });
});
