import { act, renderHook } from '@testing-library/react-native';

import type { MovieTemplate } from '@/entities/movie-template';
import type { Snap } from '@/entities/snap';

import { useTemplateFill } from './use-template-fill';

const mockSnaps = jest.fn<Snap[], []>();

jest.mock('@/entities/snap', () => ({
  useSnaps: () => mockSnaps(),
}));

const Noon = new Date('2026-08-03T12:00:00+09:00').getTime();
const MinuteMs = 60 * 1000;
const seongsu = { latitude: 37.5445, longitude: 127.0557 };

function makeSnap(id: string, minutesFromNoon: number): Snap {
  return {
    id,
    uri: `file:///doc/recordings/${id}.mp4`,
    durationSec: 3,
    capturedAt: Noon + minutesFromNoon * MinuteMs,
    width: 1080,
    height: 1920,
    orientation: 'portrait',
    place: seongsu,
  };
}

const template: MovieTemplate = {
  id: 'walk',
  name: '동네 산책',
  description: '세 장면',
  style: 'calm',
  bgm: 'lofi-walk',
  slots: [
    { id: 'start', label: '출발', hint: '집 앞' },
    { id: 'alley', label: '골목', hint: '좁은 길' },
    { id: 'back', label: '돌아오는 길', hint: '마무리' },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSnaps.mockReturnValue([makeSnap('a', 0), makeSnap('b', 10)]);
});

describe('useTemplateFill', () => {
  it('lays the outing into the slots in order and leaves the rest empty', async () => {
    const { result } = await renderHook(() => useTemplateFill(template));

    expect(result.current.slots.map((slot) => slot.snap?.id)).toEqual(['a', 'b', undefined]);
    expect(result.current.filledCount).toBe(2);
    expect(result.current.totalSec).toBe(6);
    expect(result.current.snapIds).toEqual(['a', 'b']);
  });

  it('puts a confidence on a proposed cut and none on an empty slot', async () => {
    const { result } = await renderHook(() => useTemplateFill(template));

    expect(result.current.slots[0].confidence).toBeGreaterThan(0);
    expect(result.current.slots[2].confidence).toBeUndefined();
  });

  it('drops a cut out of a slot and puts it back', async () => {
    const { result } = await renderHook(() => useTemplateFill(template));

    await act(async () => result.current.dropSlot('start'));
    expect(result.current.slots[0].snap).toBeUndefined();
    expect(result.current.slots[0].isDropped).toBe(true);
    expect(result.current.snapIds).toEqual(['b']);

    await act(async () => result.current.restoreSlot('start'));
    expect(result.current.slots[0].snap?.id).toBe('a');
  });

  it('puts a snap shot for a slot into that slot, with no confidence to claim', async () => {
    const { result } = await renderHook(() => useTemplateFill(template));

    await act(async () => result.current.fillSlot('back', makeSnap('c', 20)));

    expect(result.current.slots[2].snap?.id).toBe('c');
    expect(result.current.slots[2].confidence).toBeUndefined();
    expect(result.current.snapIds).toEqual(['a', 'b', 'c']);
  });

  it('never lets one snap fill two slots after it joins the library', async () => {
    const { result, rerender } = await renderHook(() => useTemplateFill(template));

    // Shooting for the empty slot, then the library gaining that same snap — the
    // next match would otherwise propose it for a slot of its own as well.
    const shot = makeSnap('c', 20);
    await act(async () => result.current.fillSlot('back', shot));
    mockSnaps.mockReturnValue([makeSnap('a', 0), makeSnap('b', 10), shot]);
    await act(async () => rerender({}));

    expect(result.current.snapIds).toEqual(['a', 'b', 'c']);
    expect(new Set(result.current.snapIds).size).toBe(3);
  });

  it('reports and reverses the user’s edits', async () => {
    const { result } = await renderHook(() => useTemplateFill(template));
    expect(result.current.isEdited).toBe(false);

    await act(async () => result.current.dropSlot('start'));
    expect(result.current.isEdited).toBe(true);

    await act(async () => result.current.resetSlots());
    expect(result.current.isEdited).toBe(false);
    expect(result.current.slots.map((slot) => slot.snap?.id)).toEqual(['a', 'b', undefined]);
  });

  it('leaves every slot empty and says so when the library has no outing', async () => {
    mockSnaps.mockReturnValue([]);
    const { result } = await renderHook(() => useTemplateFill(template));

    expect(result.current.hasMatch).toBe(false);
    expect(result.current.filledCount).toBe(0);
    expect(result.current.slots).toHaveLength(3);
    expect(result.current.summary).toContain('빈 자리를 찍어서');
  });

  it('answers empty for no template at all', async () => {
    const { result } = await renderHook(() => useTemplateFill(undefined));

    expect(result.current.slots).toEqual([]);
    expect(result.current.snapIds).toEqual([]);
  });
});
