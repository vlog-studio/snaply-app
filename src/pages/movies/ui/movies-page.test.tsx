import { fireEvent, render, screen } from '@testing-library/react-native';

import type { MovieSummary } from '@/widgets/movie-shelf';

import { MoviesPage } from './movies-page';

const mockPush = jest.fn();
const mockDeleteMovie = jest.fn();
const mockShare = jest.fn();
const mockSetTabBarHidden = jest.fn();
let mockMovies: MovieSummary[] = [];

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useScrollToTop: jest.fn(),
  useIsFocused: () => true,
}));

// The page and its sheets read safe-area insets — a native answer a test has
// no provider for.
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/entities/movie', () => ({
  useDeleteMovie: () => mockDeleteMovie,
  useMovieById: () => undefined,
}));

jest.mock('@/features/share-movie', () => ({
  useShareMovie: () => ({ blocked: 'no-render', share: mockShare }),
}));

jest.mock('@/shared/ui/tab-bar-chrome', () => ({
  useSetTabBarHidden: () => mockSetTabBarHidden,
}));

// The real tile draws video frames; the page only needs its press contract.
jest.mock('@/widgets/movie-shelf', () => ({
  useMovieSummaries: () => mockMovies,
  MovieTile: ({
    movie,
    selected,
    onPress,
    onLongPress,
  }: {
    movie: MovieSummary;
    selected?: boolean;
    onPress: (movieId: string) => void;
    onLongPress?: (movie: MovieSummary) => void;
  }) => {
    const { Pressable: MockPressable } =
      jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <MockPressable
        accessibilityRole="button"
        accessibilityLabel={movie.title}
        accessibilityState={{ selected: selected === true }}
        onPress={() => onPress(movie.id)}
        onLongPress={() => onLongPress?.(movie)}
      />
    );
  },
}));

function makeSummary(overrides: Partial<MovieSummary> = {}): MovieSummary {
  return {
    id: 'm1',
    title: '\uBB34\uBE44 \uCCAB\uC9F8', // 무비 첫째
    status: 'ready',
    style: 'daily',
    snapCount: 3,
    totalSec: 12,
    dateLabel: '\uC624\uB298', // 오늘
    coverUris: [],
    ...overrides,
  };
}

const firstTitle = '\uBB34\uBE44 \uCCAB\uC9F8'; // 무비 첫째
const secondTitle = '\uBB34\uBE44 \uB458\uC9F8'; // 무비 둘째
const selectLabel = '\uBB34\uBE44 \uC120\uD0DD'; // 무비 선택
const cancelLabel = '\uC120\uD0DD \uCDE8\uC18C'; // 선택 취소

describe('MoviesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMovies = [makeSummary(), makeSummary({ id: 'm2', title: secondTitle })];
  });

  it('opens a movie on tap while not selecting', async () => {
    await render(<MoviesPage />);

    await fireEvent.press(screen.getByRole('button', { name: firstTitle }));

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/movie/[id]', params: { id: 'm1' } });
  });

  it('enters selection mode on a long press, with that movie selected', async () => {
    await render(<MoviesPage />);

    await fireEvent(screen.getByRole('button', { name: firstTitle }), 'longPress');

    expect(screen.getByText('1\uD3B8 \uC120\uD0DD')).toBeTruthy(); // 1편 선택
    expect(screen.getByRole('button', { name: firstTitle })).toBeSelected();
    expect(mockSetTabBarHidden).toHaveBeenCalledWith(true);
  });

  it('toggles a movie with taps while selecting', async () => {
    await render(<MoviesPage />);

    await fireEvent(screen.getByRole('button', { name: firstTitle }), 'longPress');
    await fireEvent.press(screen.getByRole('button', { name: secondTitle }));
    expect(screen.getByText('2\uD3B8 \uC120\uD0DD')).toBeTruthy(); // 2편 선택
    expect(mockPush).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: secondTitle }));
    expect(screen.getByText('1\uD3B8 \uC120\uD0DD')).toBeTruthy(); // 1편 선택
  });

  it('enters and leaves selection mode through the header button', async () => {
    await render(<MoviesPage />);

    await fireEvent.press(screen.getByRole('button', { name: selectLabel }));
    expect(screen.getByText('0\uD3B8 \uC120\uD0DD')).toBeTruthy(); // 0편 선택

    await fireEvent.press(screen.getByRole('button', { name: cancelLabel }));
    expect(screen.queryByText('0\uD3B8 \uC120\uD0DD')).toBeNull();
  });

  it('deletes the selection only after the sheet confirms', async () => {
    await render(<MoviesPage />);

    await fireEvent(screen.getByRole('button', { name: firstTitle }), 'longPress');
    await fireEvent.press(screen.getByRole('button', { name: secondTitle }));

    // 2편 무비 삭제
    await fireEvent.press(
      screen.getByRole('button', { name: '2\uD3B8 \uBB34\uBE44 \uC0AD\uC81C' }),
    );
    expect(mockDeleteMovie).not.toHaveBeenCalled();

    // 무비 2편을 지울까요? → 2편 삭제
    expect(
      await screen.findByText('\uBB34\uBE44 2\uD3B8\uC744 \uC9C0\uC6B8\uAE4C\uC694?'),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '2\uD3B8 \uC0AD\uC81C' }));

    expect(mockDeleteMovie).toHaveBeenCalledWith('m1');
    expect(mockDeleteMovie).toHaveBeenCalledWith('m2');
    // Confirming leaves selection mode behind.
    expect(screen.queryByText('2\uD3B8 \uC120\uD0DD')).toBeNull(); // 2편 선택
  });

  it('never offers rename or share in the bar while no movie has a rendered file', async () => {
    await render(<MoviesPage />);

    await fireEvent(screen.getByRole('button', { name: firstTitle }), 'longPress');

    // Renaming belongs to the movie screen, not the grid's selection bar.
    expect(screen.queryByRole('button', { name: '\uC774\uB984 \uBC14\uAFB8\uAE30' })).toBeNull(); // 이름 바꾸기
    expect(screen.queryByRole('button', { name: '\uACF5\uC720' })).toBeNull(); // 공유
  });
});
