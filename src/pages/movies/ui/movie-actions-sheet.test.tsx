import { fireEvent, render, screen } from '@testing-library/react-native';

import type { MovieSummary } from '@/widgets/movie-shelf';

import { MovieActionsSheet } from './movie-actions-sheet';

const mockDeleteMovie = jest.fn();
const mockShare = jest.fn();
let mockBlocked: 'no-render' | undefined = 'no-render';

// The sheet renders inside `BottomSheet`, which reads safe-area insets — a
// native answer a test has no provider for.
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/entities/movie', () => ({
  useDeleteMovie: () => mockDeleteMovie,
  useMovieById: () => undefined,
}));

jest.mock('@/features/share-movie', () => ({
  useShareMovie: () => ({ blocked: mockBlocked, share: mockShare }),
}));

jest.mock('@/features/rename-movie', () => ({
  RenameMovieForm: () => {
    const { Text: MockText } = jest.requireActual<typeof import('react-native')>('react-native');
    return <MockText>rename-form</MockText>;
  },
}));

function makeSummary(overrides: Partial<MovieSummary> = {}): MovieSummary {
  return {
    id: 'm1',
    title: '\uBB34\uBE44 08-03', // 무비 08-03
    status: 'ready',
    style: 'calm',
    snapCount: 3,
    totalSec: 12,
    dateLabel: '\uC624\uB298', // 오늘
    coverUris: [],
    ...overrides,
  };
}

const renameLabel = '\uC774\uB984 \uBC14\uAFB8\uAE30'; // 이름 바꾸기
const shareLabel = '\uACF5\uC720'; // 공유
const deleteLabel = '\uC0AD\uC81C'; // 삭제
const confirmDeleteLabel = '\uBB34\uBE44 08-03 \uC0AD\uC81C'; // <title> 삭제
const cancelDeleteLabel = '\uC0AD\uC81C \uCDE8\uC18C'; // 삭제 취소

describe('MovieActionsSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBlocked = 'no-render';
  });

  it('opens on a menu with rename and delete for the movie', async () => {
    await render(<MovieActionsSheet visible movie={makeSummary()} onClose={jest.fn()} />);

    expect(screen.getByText('\uBB34\uBE44 08-03')).toBeTruthy(); // 무비 08-03
    expect(screen.getByRole('button', { name: renameLabel })).toBeTruthy();
    expect(screen.getByRole('button', { name: deleteLabel })).toBeTruthy();
    // No rendered file (every movie today), so there is nothing to share and
    // the row is not offered at all.
    expect(screen.queryByRole('button', { name: shareLabel })).toBeNull();
  });

  it('steps into the rename form without leaving the sheet', async () => {
    await render(<MovieActionsSheet visible movie={makeSummary()} onClose={jest.fn()} />);

    fireEvent.press(screen.getByRole('button', { name: renameLabel }));

    expect(await screen.findByText('rename-form')).toBeTruthy();
    expect(screen.queryByRole('button', { name: deleteLabel })).toBeNull();
  });

  it('deletes only after the confirmation step confirms', async () => {
    const onClose = jest.fn();
    await render(<MovieActionsSheet visible movie={makeSummary()} onClose={onClose} />);

    fireEvent.press(screen.getByRole('button', { name: deleteLabel }));
    expect(mockDeleteMovie).not.toHaveBeenCalled();

    fireEvent.press(await screen.findByRole('button', { name: confirmDeleteLabel }));
    expect(mockDeleteMovie).toHaveBeenCalledWith('m1');
    expect(onClose).toHaveBeenCalled();
  });

  it('returns from the confirmation step to the menu on cancel', async () => {
    await render(<MovieActionsSheet visible movie={makeSummary()} onClose={jest.fn()} />);

    fireEvent.press(screen.getByRole('button', { name: deleteLabel }));
    fireEvent.press(await screen.findByRole('button', { name: cancelDeleteLabel }));

    expect(await screen.findByRole('button', { name: renameLabel })).toBeTruthy();
    expect(mockDeleteMovie).not.toHaveBeenCalled();
  });

  it('offers share, and shares and closes, when a rendered file exists', async () => {
    mockBlocked = undefined;
    const onClose = jest.fn();
    await render(<MovieActionsSheet visible movie={makeSummary()} onClose={onClose} />);

    fireEvent.press(screen.getByRole('button', { name: shareLabel }));

    expect(mockShare).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
