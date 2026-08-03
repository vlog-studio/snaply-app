# 스튜디오 재기획 — 구현 계획 (단계별)

> 이 문서는 사람 개발자를 위한 한글 작업 계획서입니다. 에이전트용 문서가 아니므로 `AGENTS.md` 색인에 포함하지 않습니다.
> 기획 원문은 [`concept.md`](concept.md), 화면은 [`studio-mockup.html`](studio-mockup.html)입니다.
> **임시 문서입니다.** 4단계가 모두 끝나면 이 파일과 [`moment-collection-redesign/`](../moment-collection-redesign/)을 함께 지웁니다.

## 이 문서를 읽는 법

세션을 나눠서 작업하기 위한 인계 문서입니다. 새 세션은 다음 순서로 읽으세요.

1. [`concept.md`](concept.md) — 무엇을 만드는지
2. 이 문서의 §1(용어·모델 대응표)과 §2(단계 표)
3. 지금 착수할 단계의 상세 절
4. `AGENTS.md`가 지정하는 규칙 문서 (FSD, 모듈 경계, 쿡북, 기능 문서 유지 규칙)

각 단계는 **그 자체로 컴파일되고 동작하는 앱**을 남깁니다. 단계 사이에 반쯤 마이그레이션된 상태로 멈추지 않습니다.

## 진행 상황

| 단계 | 상태 | 커밋 |
| --- | --- | --- |
| 1. 도메인 교체 + 4탭 셸 + 스냅·트레이·나 | ✅ 완료 (2026-08-03) | 아래 §3 참고 |
| 2. 편집기 ①조립 + 무비 생성 + 스튜디오 보드 | ✅ 완료 (2026-08-03) | 아래 §4 참고 |
| 3. 편집기 ②스타일 ③생성 + 무비 재생·상세 | ✅ 완료 (2026-08-03) | 아래 §5 참고 |
| 4. 마무리 — 실패 복구·완성 푸시·문서 정리 | ⬜ 미착수 | — |

단계를 끝낼 때마다 이 표를 갱신하세요.

---

## 1. 용어와 모델 대응표

코드에서 `roll` / `clip` / `reel` / `develop` 은 전부 사라집니다.

| 지금 | 바뀔 것 | 메모 |
| --- | --- | --- |
| `entities/clip`, `Clip` | `entities/snap`, `Snap` | 필드 동일. `mood` 제거 |
| `entities/roll`, `Roll` + `Reel` | `entities/movie`, `Movie` | 롤·릴 통합. 릴은 `Movie.render` |
| `ClipRef { clipId, order, trim }` | `SnapRef { snapId, order, trim }` | 구조 유지 |
| `RollStatus: undeveloped/developing/developed` | `MovieStatus: draft/generating/ready/failed` | `failed` 신설 |
| `RollType`, `CollectionRule`, `TargetOrientation` | 삭제 | 하루 1롤·자동 수집 폐기 |
| `DailyRollTarget(12)`, `dayKey`, `ensureDailyRoll` | 삭제 | 12컷 목표·데일리 롤 폐기 |
| `entities/roll/lib/roll-tint`, `roll-title`, `roll-date` | 삭제 (일부 `movie-title`로 흡수) | 아래 §3 참고 |
| `entities/capture-session` `CaptureMood` | 삭제 | 무드는 무비 스타일로 이동 |
| — | `entities/tray` (스냅 ID ≤10) | 신설 |
| — | `Movie.style`, `Movie.bgm`, `Movie.ratio`, `Movie.jobId`, `Movie.render` | 신설 |

### 슬라이스 대응표

| 지금 | 바뀔 것 | 단계 |
| --- | --- | --- |
| `features/capture-moment` | 유지하되 "오늘의 롤에 담기" 제거 — 스냅만 만든다 | 1 |
| `features/delete-clip` | `features/delete-snap` (무비·트레이까지 연쇄 삭제) | 1 |
| `features/collect-clips` | 삭제 → 트레이(엔티티) + `compose-movie`로 흡수 | 1·2 |
| `features/develop-roll` | 삭제 → `features/compose-movie` | 2·3 |
| `widgets/roll-shelf` | `widgets/movie-shelf` (무비 요약 읽기 모델) | 1 |
| `widgets/clip-membership` | 삭제 → `pages/snaps/model/use-movie-delete-impact` | 1 |
| `pages/home` | `pages/studio` | 1(트레이) · 2(보드) |
| `pages/archive` + `pages/cut-strip` | `pages/snaps` | 1 |
| — | `pages/movies` | 1 |
| `pages/settings` | `pages/me` (스택 화면 → 탭) | 1 |
| `pages/roll-detail` + `pages/capture-editing` + `pages/capture-result` | `pages/movie-editor` + `pages/movie-detail` | 2·3 |
| `pages/capture-record` | 유지, 무드 칩 제거 + 카운터를 스냅 총계로 | 1 |
| `shared/ui/negative-frame`, `shared/ui/film-grain` | 삭제 | 1 |

### 라우트 대응표

| 지금 | 바뀔 것 |
| --- | --- |
| `(tabs)/index` 홈 | `(tabs)/index` 스튜디오 |
| `(tabs)/archive` | `(tabs)/snaps` |
| `cuts` | 삭제(스냅 탭이 흡수) |
| — | `(tabs)/movies` |
| `settings` | `(tabs)/me` |
| `roll/[id]` | `movie/[id]` (편집기) |
| `capture/editing`, `capture/result` | 삭제 → 편집기 ③단계 / `movie/[id]/play` |
| `capture/index` | 유지 |

---

## 2. 단계

| 단계 | 끝났을 때 사용자가 할 수 있는 것 | 못 하는 것 |
| --- | --- | --- |
| 1 | 촬영해서 스냅을 모으고, 스냅 탭에서 골라 트레이에 담고, 스냅을 지우고, 나 탭에서 설정을 본다 | 무비를 못 만든다 |
| 2 | 트레이에서 무비 초안을 만들고 컷 순서·트림을 편집하고 초안을 스튜디오에서 이어서 연다 | 스타일 지정·생성을 못 한다 |
| 3 | 스타일·BGM을 고르고 컷 길이를 자르고 생성을 돌리고 완성 무비를 재생한다 | 실패 복구·재생성·공유가 없다 |
| 4 | 실패한 무비를 되살리고, 완성 푸시를 받고, 무비를 공유한다 | — |

각 단계는 `npm run lint`, `npx tsc --noEmit`, `npm run test:ci`를 통과시키고, 영향받은 `docs/features` 문서를 같은 커밋에서 갱신합니다(`AGENTS.md` 규칙).

---

## 3. 단계 1 — 도메인 교체 + 4탭 셸 + 스냅·트레이·나

> **완료 (2026-08-03).** 아래 계획대로 진행했고, 달라진 점만 §3.8에 적었습니다. `lint` / `tsc --noEmit` / `test:ci` 통과. 기기 검증은 하지 않았습니다.

이 단계가 가장 큽니다. 필름 은유를 코드에서 걷어내고 새 정보 구조의 골격을 세우는 일이 한 번에 일어나야 트리가 컴파일되기 때문입니다.

### 3.1 엔티티

**`entities/snap`** — `entities/clip`을 옮겨 이름만 바꾼다. `mood` 필드와 `capture-session/@x/clip` 교차 임포트를 함께 제거.

```text
entities/snap/
├── model/snap.ts          Snap, SnapOrientation
├── model/snap-store.ts    useSnaps / useSnapsHydrated / useAddSnap / useRemoveSnaps / getSnapsByIds
├── model/snap-refs.ts     snapsByRefs / useSnapIndex / useSnapsByRefs (구조적 SnapRefLike 유지)
└── index.ts
```

**`entities/movie`** — `entities/roll`을 대체한다. 데일리 롤·틴트·수동 제목·요일 키는 전부 버린다.

```ts
export const MovieSnapLimit = 10;
export type MovieStatus = 'draft' | 'generating' | 'ready' | 'failed';
export type MovieStyle = 'calm' | 'upbeat' | 'plain' | 'emotional'; // 잔잔한/경쾌한/담백한/감성적인
export type SnapRef = { snapId: string; order: number; trim?: { startSec: number; endSec: number } };
export type MovieRender = { uri?: string; renderedAt: number; durationSec: number };
export type Movie = {
  id: string; title: string; status: MovieStatus;
  createdAt: number; updatedAt: number;
  snapRefs: SnapRef[];
  style: MovieStyle; bgm: string; ratio: '9:16';
  jobId?: string; render?: MovieRender; error?: string;
};
```

단계 1에서 스토어가 내보내는 것은 읽기 셀렉터(`useMovies`, `useMovieById`, `getMovieById`, `useMoviesHydrated`)와 `useRemoveSnapsEverywhere`(삭제 연쇄)뿐입니다. 쓰기 액션(`createMovie`, `updateMovieCuts`, …)은 실제 호출자가 생기는 단계 2·3에서 추가합니다 — 죽은 Public API를 만들지 않기 위해서입니다.

**`entities/tray`** (신설) — 담기 트레이. 스냅 ID 목록만 가진 얇은 스토어이고 `localStore`로 영속화합니다.

```text
entities/tray/
├── model/tray-store.ts   TrayCapacity(10) / useTraySnapIds / useTrayHydrated
│                         useAddSnapsToTray / useRemoveSnapFromTray / useClearTray
└── index.ts
```

`addSnapsToTray`는 중복을 무시하고 상한에서 잘라낸 뒤 **실제로 담긴 개수**를 돌려줍니다(토스트가 정직해야 하므로). 트레이는 스냅을 참조만 하므로 `entities/snap`을 임포트하지 않습니다.

**`entities/capture-session`** — `CaptureMood`, `normalizeCaptureMood`, `getCaptureMoodLabel`, `@x/clip`을 지우고 `CaptureDuration`(3|5)만 남깁니다.

### 3.2 피처

- `features/capture-moment` — `createClip` → `createSnap`, `ensureDailyRoll`/`addClipToRoll` 호출 제거. 스냅을 만들어 스토어에 넣는 것으로 끝납니다. 촬영은 더 이상 어떤 묶음에도 자동으로 들어가지 않습니다(자동 수집 폐기).
- `features/delete-snap` — `delete-clip`을 옮기고, 연쇄 대상에 트레이를 추가합니다(파일 → 썸네일 → 무비 참조 → 트레이 → 스냅 메타 순서 유지).
- `features/collect-clips`, `features/develop-roll` — 삭제.

### 3.3 위젯

`widgets/movie-shelf` — 무비를 화면이 그리는 형태로 요약하는 교차 엔티티 읽기 모델. 스튜디오 탭과 무비 탭이 둘 다 씁니다.

```ts
export type MovieSummary = {
  id: string; title: string; status: MovieStatus;
  snapCount: number; totalSec: number; style: MovieStyle;
  dateLabel: string;       // '오늘' / '2026년 7월 20일'
  coverUris: string[];     // 최대 3장, 컷 순서
  progress?: number;       // generating 일 때만
};
export function useMovieSummaries(): MovieSummary[];       // 최신순
export function useInProgressMovies(): MovieSummary[];     // status !== 'ready'
export function useReadyMovies(): MovieSummary[];
```

`widgets/clip-membership`은 삭제하고, 남는 소비자(스냅 삭제 확인)는 `pages/snaps/model/use-movie-delete-impact.ts`로 내립니다. 소비자가 하나뿐이면 위젯으로 올리지 않는다는 규칙(`docs/workflows/feature-development.md` §3)을 따릅니다.

### 3.4 페이지

**`pages/studio`** (홈 대체) — 단계 1에서는 트레이 블록만 실제로 동작합니다.

- 담기 트레이: 담긴 스냅 썸네일 가로 스트립, `n / 10 · 약 N초`, 개별 ✕, `비우기`
- `이 스냅으로 새 무비` 버튼은 **단계 2까지 비활성**(단계 2에서 편집기로 연결)
- 트레이가 비면 안내 문구 + `스냅 고르러 가기` → `/snaps?select=1`
- `작업 중` / `최근 완성` 섹션은 `useInProgressMovies` / `useReadyMovies`를 그대로 읽습니다. 단계 1에서는 무비가 만들어질 수 없으므로 항상 빈 상태 문구가 보입니다 — 정상입니다.

**`pages/snaps`** (보관함 + 컷 스트립 대체)

- 날짜 그룹(`오늘` / `어제` / `2026년 7월 20일`) + 3열 그리드, 각 셀에 길이 배지
- 셀 탭 → 재생 모달(기존 `video-player-modal` 재사용)
- 우상단 `선택` → 선택 모드. 셀에 선택 순번 배지, 하단 선택 바에 `n개 / 10`, `해제`, `트레이에 담기`
- 트레이 상한 초과 시 담기를 막고 토스트 대신 인라인 안내(기존 `cut-notice` 패턴 참고)
- 이미 트레이에 있는 스냅에는 `담김` 배지
- 선택 모드에서 `삭제` — 무비 영향(`use-movie-delete-impact`)을 보여주는 확인 다이얼로그 후 `delete-snap`
- 라우트 파라미터 `?select=1`이면 선택 모드로 진입

**`pages/movies`** — 2열 카드 그리드(`useMovieSummaries`). 상태 배지(`초안`/`생성 중`/`실패`). 카드 탭은 단계 2에서 편집기로 연결. 비었으면 빈 상태 문구.

**`pages/me`** — 기존 `pages/settings`를 옮기고 다음을 조정합니다.

- 상단에 프로필(아바타·이름·이메일) + 통계 3칸(스냅/무비/트레이)
- 문구에서 필름·현상 표현 제거
- `무비 완성 알림` 스위치 추가(단계 4에서 실제 푸시와 연결, 그전까지는 설정 저장만 — 기능 문서에 `Prototype`으로 표기)

**`pages/capture-record`** — 무드 칩 제거, 하단 카운터를 `오늘의 롤 n컷` → `스냅 n개`로. 나머지(권한·홀드 녹화·라이브러리)는 그대로.

### 3.5 라우팅과 셸

`_app/routes/app-tabs.tsx`를 4탭 + 중앙 촬영 버튼으로 고칩니다.

```text
[스튜디오] [스냅] (●촬영) [무비] [나]
```

- 탭 순서상 중앙 버튼이 스냅과 무비 사이에 오도록 `Tabs.Screen` 순서를 잡고, 촬영 버튼은 지금처럼 `<Tabs>` 바깥의 절대 배치 오버레이로 둡니다(`/capture`가 루트 스택 모달이라서).
- 아이콘: 스튜디오 `albums`, 스냅 `grid`, 무비 `film`, 나 `person`.
- 앰버 세이프라이트 후광(`boxShadow`)은 유지해도 좋습니다 — 색은 팔레트의 `primary`이고 필름 은유에 묶인 장식이 아닙니다.

`_app/routes/root-layout.tsx`에서 `capture/editing`, `capture/result`, `roll/[id]`, `cuts`, `settings` 스크린을 지우고 `FilmGrain`을 제거합니다. `_app/providers/daily-roll-gate.tsx`와 그 마운트도 삭제합니다.

### 3.6 삭제 목록 (단계 1에서 실제로 지우는 파일)

```text
src/_app/providers/daily-roll-gate.tsx
src/app/(tabs)/archive.tsx  src/app/cuts.tsx  src/app/settings.tsx
src/app/roll/[id].tsx  src/app/capture/editing.tsx  src/app/capture/result.tsx
src/entities/clip/**  src/entities/roll/**  src/entities/capture-session/@x/**
src/features/collect-clips/**  src/features/develop-roll/**  src/features/delete-clip/**
src/pages/home/**  src/pages/archive/**  src/pages/cut-strip/**
src/pages/roll-detail/**  src/pages/capture-editing/**  src/pages/capture-result/**
src/pages/settings/**
src/widgets/roll-shelf/**  src/widgets/clip-membership/**
src/shared/ui/negative-frame/**  src/shared/ui/film-grain/**
```

`pages/roll-detail`의 드래그 정렬 그리드(`cut-sheet-grid.tsx`, `reorder-layout.ts`)와 `pages/capture-result/ui/reel-player.tsx`는 단계 2·3에서 다시 필요합니다. **지우기 전에 이 파일들을 읽어 두거나, git 이력(`git show HEAD~1:...`)에서 꺼내 쓰세요.** 순서 편집은 단계 2의 편집기 ①단계, 순차 재생은 단계 3의 무비 재생에 그대로 대응합니다.

### 3.7 문서

- `docs/features/README.md` — 애플리케이션 맵·기능 색인·FSD 소유 맵 전면 갱신
- `docs/features/home.md` → `studio.md`, `recording-archive.md` → `snaps.md`, `settings.md` → `me.md`로 재작성
- `docs/features/roll-detail.md` — 삭제(단계 2에서 `movie-editor.md` 신설)
- `docs/features/capture-flow.md` — 자동 수집 제거, 트레이 연결 반영
- `docs/features/app-shell-and-navigation.md` — 4탭 구조
- `docs/guides/moment-collection-redesign/`의 "대체됨" 배너 유지(단계 4에서 삭제)

### 3.8 계획과 달라진 점

- `entities/movie`의 Public API에서 `getMovieById`를 뺐습니다 — 단계 1에 호출자가 없습니다. 단계 2에서 필요해지면 그때 내보내세요.
- 트레이 액션 이름은 `useRemoveSnapsFromTray`(복수)입니다. 삭제 연쇄가 여러 개를 한 번에 빼기 때문입니다.
- `entities/snap`에서 `Snap.tags`와 태그 setter를 지웠습니다. 아무도 읽지 않는 필드였고 새 기획에 자리가 없습니다.
- `pages/studio`의 무비 카드 컴포넌트와 `pages/movies`의 카드 그리드는 **만들지 않았습니다.** 단계 1에서는 무비가 생길 수 없어 절대 렌더되지 않는 코드가 되기 때문입니다. 두 화면 모두 실제 셀렉터(`useInProgressMovies` / `useReadyMovies` / `useMovieSummaries`)를 읽고 빈 상태만 그립니다 — 카드는 단계 2에서 추가하세요.
- `shared/ui/video-frame`을 새로 만들었습니다(`negative-frame`의 블러 없는 판). 썸네일 캐시를 쓰는 것은 동일합니다.
- 팔레트 토큰에서 `film` / `aiSoft` / `success` / `successSoft`를 지웠습니다(사용처 없음). 값 자체는 그대로 남긴 다크 팔레트입니다.
- 그리드 셀은 `aspectRatio` 대신 **포인트 단위 width/height**로 그립니다. `%` width + `aspectRatio` + 절대 배치 자식만 있는 셀은 `flexWrap` 안에서 높이가 0으로 접힙니다.
- `?select=1` 반영은 effect가 아니라 **렌더 중 상태 조정**으로 했습니다. React Compiler 린트(`react-hooks/set-state-in-effect`)가 effect 안의 setState를 막습니다.
- `.expo/types/router.d.ts`(gitignore 대상 생성물)가 옛 라우트를 담고 있어 지웠습니다. 다음 `expo start` 때 다시 생성됩니다. 그전까지는 타입 검사가 라우트 문자열을 검증하지 못하므로, 단계 2에서 `movie/[id]`를 추가할 때 경로 오타에 주의하세요.

---

## 4. 단계 2 — 편집기 ①조립 + 무비 생성 + 스튜디오 보드

> **완료 (2026-08-03).** 계획과 달라진 점은 §4.6에 있습니다. `lint` / `tsc --noEmit` / `test:ci`(45 suites, 250 tests) 통과. 기기 검증은 하지 않았습니다.

### 4.1 엔티티 확장

`entities/movie` 스토어에 쓰기 액션을 추가합니다.

- `createMovie({ snapIds, title?, createdAt? }): Movie` — `status: 'draft'`, `style: 'calm'`, `ratio: '9:16'`, `snapRefs`는 주어진 순서대로 `order` 0..n
- `updateMovieCuts(movieId, snapRefs)` — 순서·트림·구성원을 한 번에 쓴다. 컷 0개는 거부(최소 1컷)
- `renameMovie(movieId, title)`
- `deleteMovie(movieId)`

기본 제목은 `entities/movie/lib/movie-title.ts`가 정합니다 — 빈 이름은 `무비 07-28`처럼 만든 날짜로. (기존 `roll-title.ts`의 규칙을 그대로 옮기면 됩니다.)

### 4.2 `features/compose-movie`

트레이 → 무비로 넘어가는 행위와 컷 편집 커밋이 여기 삽니다. 트레이(엔티티)와 무비(엔티티)를 함께 건드리므로 페이지가 아니라 피처입니다.

```ts
export function useComposeMovie(): {
  /** 트레이의 스냅으로 초안을 만들고 트레이를 비운다. 트레이가 비었으면 undefined. */
  startMovieFromTray: () => Movie | undefined;
  /** 편집기 ①단계의 커밋. 상한(10)과 최소 1컷을 여기서 강제한다. */
  saveCuts: (movieId: string, snapRefs: SnapRef[]) => CommitOutcome;
  /** 편집기에서 '스냅 더 넣기' → 트레이에 담아 온 스냅을 무비에 이어 붙인다. */
  appendSnaps: (movieId: string, snapIds: readonly string[]) => CommitOutcome;
};
```

`ready` 상태의 무비는 컷을 못 고칩니다(완성본은 재생성으로만 바뀜 — 단계 4). 이 규칙은 UI가 아니라 이 피처가 강제합니다.

### 4.3 `pages/movie-editor` — 3단계 위저드의 뼈대 + ①조립

라우트는 `movie/[id]`. 상단에 3단계 진행 표시(`조립 / 스타일 / 생성`), 하단에 `이전` / `다음`. 나가면 초안으로 남고, 스튜디오 보드에서 다시 열립니다.

①조립 화면:

- 컷 행 목록: 그립 · 썸네일 · `컷 n` · `원본 Ns → 사용 Ns` · 트림 바 · ▲▼ · ✕
- 순서 변경은 ▲▼ 버튼을 1차로 구현합니다(목업과 동일). 드래그는 기존 `reorder-layout.ts`를 되살려 붙일 수 있으면 붙이되, 필수는 아닙니다.
- 트림은 시작·끝 초 조정. 슬라이더가 부담되면 단계 3으로 미루고 `trim` 미설정(=원본 전체)로 둡니다.
- `스냅 더 넣기` → `/snaps?select=1&for=<movieId>`
- 컷 최소 1개 — 마지막 컷 삭제는 막고 안내

단계 2에서 ②·③ 단계는 "단계 3에서 옵니다" 안내만 두고 `다음`을 비활성화합니다.

### 4.4 `pages/studio` 보드 완성

- `작업 중` 섹션: `useInProgressMovies()`를 카드로. 카드 탭 → `movie/[id]`
- `이 스냅으로 새 무비` 활성화 → `startMovieFromTray()` → 편집기로 이동

### 4.5 문서

`docs/features/movie-editor.md` 신설 + README 색인·맵 갱신, `studio.md`에 보드 동작 추가.

### 4.6 계획과 달라진 점

- **트림 UI는 만들지 않았습니다.** `SnapRef.trim`은 모델에 있고 커밋도 보존하지만 설정할 화면이 없습니다. 모든 컷이 원본 전체로 들어갑니다. 슬라이더든 스테퍼든 단계 3에서 스타일 화면과 함께 붙이세요.
- **순서 변경은 ▲▼ 버튼입니다.** 드래그 그리드는 넣지 않았습니다. 커밋하는 값(`SnapRef[]`)은 동일하므로 나중에 갈아끼워도 됩니다. 옛 구현과 그때 배운 함정은 `docs/frameworks/animations-and-gestures.md`에 복구 경로와 함께 남아 있습니다.
- **이름 변경 UI도 없습니다.** `useRenameMovie`는 있는데 호출자가 없습니다 — 유일하게 남긴 미사용 Public API입니다(단계 3에서 씁니다). 기본 이름은 `무비 08-03`, 같은 날 두 번째부터 `(2)`가 붙습니다.
- **`스냅 더 넣기`는 트레이를 거치지 않습니다.** `/snaps?select=1&for=<movieId>`로 가서 고른 스냅을 무비에 바로 이어 붙이고 편집기로 돌아옵니다. 트레이를 경유하면 편집기를 나갔다가 트레이를 비우고 다시 들어와야 해서입니다. `SnapsPage`는 이 모드에서 상한을 무비 기준(`MovieSnapLimit`)으로 재고, 확인 버튼 문구도 바뀝니다.
- **편집기의 편집은 로컬입니다.** `컷 구성 저장`을 눌러야 스토어에 씁니다. "최소 1컷"을 제스처 도중에 거절하는 대신 버튼 비활성으로 표현하기 위해서입니다. 저장 중 스토어가 밖에서 바뀌면(다른 화면에서 스냅 삭제 등) 작업본을 버립니다 — 더 이상 그 리스트를 설명하지 못하기 때문입니다.
- **무비 카드는 위젯으로 올렸습니다.** 스튜디오(행)와 무비 탭(타일)이 같은 요약과 같은 상태 어휘를 써야 해서 `widgets/movie-shelf/ui`에 `MovieRow`·`MovieTile`·`MovieStatusBadge`를 뒀습니다.

---

## 5. 단계 3 — 편집기 ②스타일 ③생성 + 무비 재생·상세

> **완료 (2026-08-03).** 계획과 달라진 점은 §5.5에 있습니다. `lint` / `tsc --noEmit` / `test:ci`(53 suites, 355 tests) 통과. 기기 검증은 하지 않았습니다.

단계 2에서 미룬 **트림 UI**와 **이름 변경**도 이 단계에서 함께 붙이세요. 둘 다 모델·스토어는 이미 준비돼 있습니다(`SnapRef.trim`, `useRenameMovie`).

### 5.1 스타일 카탈로그

`entities/movie/lib/movie-style.ts`에 4종 스타일(`calm`/`upbeat`/`plain`/`emotional`)의 한글 라벨·설명·대표색을, `movie-bgm.ts`에 BGM 목록을 둡니다. 서버 카탈로그(`GET /styles`, `GET /bgms`)가 생기기 전까지는 로컬 상수이고, 기능 문서에 그렇게 적습니다.

`updateMovieStyle(movieId, { style, bgm, targetSec? })` 액션을 스토어에 추가합니다.

### 5.2 생성 잡

`features/compose-movie`에 생성 흐름을 추가합니다.

- `startGeneration(movieId)` → `status: 'generating'`, 5단계(`업로드 → 장면 분석 → 컷 다듬기 → 음악·자막 → 렌더`) 진행
- 백엔드가 없으므로 **로컬 시뮬레이션**입니다. 진행 단계는 타이머로 넘기고, 마지막에 `render`를 채우고 `status: 'ready'`로 전이합니다. 기능 문서에 반드시 `Prototype`으로 표기하세요 — 실제 합성은 일어나지 않습니다.
- 실제 렌더 산출물이 없으므로 `render.uri`는 비우고, 재생은 컷을 순서대로 잇는 **순차 재생**으로 합니다(기존 `reel-player.tsx`가 정확히 이 일을 합니다 — 되살려 쓰세요).
- 진행 상태는 무비 스토어에 남아야 앱을 나갔다 와도 이어집니다. 진행률은 스토어에 `jobId` + 단계 인덱스로 두는 편이 안전합니다.
- 서버가 생기면 이 자리에 `POST /movies` + 폴링/푸시가 들어갑니다. 계약 초안은 `concept.md` §9.

### 5.3 무비 재생·상세

`pages/movie-detail`(라우트 `movie/[id]/play` 또는 편집기 안의 완성 화면). 순차 재생 + `컷 수정`(편집기 ①로) + `스타일 변경`(②로). 공유·재생성은 단계 4.

### 5.4 문서

`docs/features/movie-editor.md` 갱신 + `movie-playback.md` 신설(또는 편집기 문서에 흡수), README 갱신.

### 5.5 계획과 달라진 점

**모델**

- `Movie.jobId?: string`을 `Movie.job?: MovieJob`(`{ id, stepIndex, startedAt }`)으로 바꿨습니다. 계획대로 "jobId + 단계 인덱스"를 두려면 필드 두 개가 따로 떠다니게 되는데, 둘은 항상 같이 생기고 같이 사라집니다. 서버가 생기면 `job.id`가 서버 `jobId` 자리입니다.
- `Movie.captions: boolean`을 새로 넣었습니다. 기획 §6의 ②단계 항목(자동 자막)이라 목업처럼 죽은 스위치로 두는 대신 실제로 저장합니다.
- **`targetSec`은 넣지 않았습니다.** §7의 미결 사항("목표 길이를 사용자가 정하게 할지")을 **컷 합계를 그대로 쓴다**로 정했습니다. 길이는 ①의 트림으로 정하는 것이고, 같은 값을 두 군데서 정하게 하면 둘이 어긋날 때 뭘 따를지가 또 문제가 됩니다. 그래서 ②의 `목표 길이`는 읽기 전용입니다.
- `updateMovieStyle(movieId, { style?, bgm?, captions? })`. 위 이유로 `targetSec`이 없습니다.

**트림 UI (§7 미결 사항 결정)**

- **드래그 슬라이더**로 갔습니다(스테퍼 아님). 컷 행마다 두 손잡이 바가 항상 붙어 있고, 0.5초 격자에 스냅되며 최소 1초입니다(`CutTrimStepSec`, `MinCutSec`).
- 손잡이는 UI 스레드에서 손가락을 따라가고, JS로는 **0.5초 경계를 넘을 때만** 넘어옵니다(`animations-and-gestures.md`의 규칙). 제스처는 모듈 레벨 팩토리(`buildTrimGesture`)로 만들어 React Compiler 린트를 구조적으로 피했습니다. 픽셀↔초 계산은 `pages/movie-editor/model/trim-geometry.ts`에 `'worklet'`로 분리해 표 기반 테스트를 붙였습니다.
- 트랙 폭은 재는 대신 콘텐츠 컬럼에서 계산해 내려보냅니다(`movies-page`의 타일 폭과 같은 방식) — 첫 프레임에 제자리에 그려야 하니까요.
- 길이가 소수가 될 수 있어 `shared/lib/datetime`에 `formatSeconds`를 넣었습니다(`4초` / `4.5초`). 무비 카드·타일·편집기·재생 화면이 전부 이걸 씁니다.

**생성 잡**

- 잡을 돌리는 주체는 편집기가 아니라 **앱 전역 헤드리스 노드**(`features/compose-movie`의 `MovieGenerationGate`, `_app/providers`에 마운트)입니다. 화면을 나가도 계속돼야 한다는 게 기획의 약속이라, 편집기 안의 타이머로는 지킬 수 없습니다.
- 진행은 세어 올리지 않고 **`startedAt`과 현재 시각으로 계산**합니다(`movieJobProgressAt`). 백그라운드에서 타이머가 눌려도, 앱이 죽었다 다시 떠도 경과 시간은 이미 거기 있고, 닫아둔 동안 잡 전체 시간이 지났으면 첫 확인에서 완성됩니다.
- 스토어에는 `stepIndex`만 둡니다. 더 잘게 두면 무비 카드 목록이 타이머로 리렌더되기 때문입니다. 초 단위 숫자가 필요한 건 ③화면 하나뿐이라 거기서만 `useJobClock`으로 틱을 돌립니다.
- 그래서 스토어 액션 중 `advanceMovieJob`·`updateMovieStyle`은 **바뀐 게 없으면 state 객체를 그대로 돌려줍니다**(`patchMovie`). 러너가 타이머마다 같은 단계를 다시 쓰는데, 매번 새 `movies` 배열이 나오면 모든 무비 화면이 초당 몇 번씩 리렌더됩니다.
- 실패 경로는 만들지 않았습니다. 시뮬레이션이 실패하지 않으므로 실패 UI는 절대 렌더되지 않는 코드가 됩니다 — 단계 4가 그걸 가집니다.

**재생·상세**

- `pages/movie-detail`을 **별도 라우트 `movie/[id]/play`**로 뒀고(편집기 안의 완성 화면이 아니라), `src/app/movie/[id].tsx`를 `movie/[id]/index.tsx`로 옮겼습니다. 스택 스크린 이름도 `movie/[id]/index`로 바뀝니다.
- **완성된 무비는 편집기를 거치지 않고 바로 재생 화면으로 갑니다.** 완성본에 할 일은 보는 것이고, 컷·스타일은 재생성(단계 4)까지 동결이라 편집기로 보내면 읽기 전용 화면이 됩니다. 그래서 계획 §5.3의 `컷 수정`·`스타일 변경` 버튼은 **넣지 않았습니다** — 지금 눌러도 갈 곳이 읽기 전용입니다. 재생 화면은 재생 + 레시피(스타일·음악·자막·비율·완성 시각) + 이름 변경입니다.
- 옛 `reel-player.tsx`를 되살려 `cut-player.tsx`로 옮겼습니다. 이중 버퍼링은 그대로 두고 **트림을 지키도록** `timeUpdate`로 끝 지점을 감시해 넘깁니다. 파일이 남았는데 컷이 끝나므로 넘길 때 이전 플레이어를 **반드시 pause**해야 합니다(안 하면 안 보이는데 소리가 계속 납니다). `player.currentTime = x`는 React Compiler 린트가 막아서(훅이 돌려준 값의 프로퍼티 쓰기) `seekBy`로 갔고, 시크는 프리로드 시점에 걸어 트림된 컷이 0프레임을 한 순간 보여주지 않게 했습니다.

**이름 변경**

- `features/rename-movie` 슬라이스를 새로 만들었습니다. 편집기와 재생 화면이 **둘 다** 필요한데 페이지끼리는 임포트할 수 없어서입니다. 시트는 React Hook Form + Zod(프로젝트 표준)로 만들었고, 스키마는 길이 상한만 봅니다 — 빈 이름은 유효하고 만든 날짜로 되돌아갑니다.
- `renameMovie`가 이제 `movieTitle()`을 거칩니다. 만들 때와 바꿀 때가 같은 규칙(상한·빈 이름 처리·중복 접미사)을 쓰게 하려고요.

**남긴 것**

- **무비 삭제 UI는 안 만들었습니다.** §7의 미결 사항이고 단계 4 목록에도 없어서, 이 단계에서 자리를 정하기보다 `useDeleteMovie`를 호출자 없는 상태로 뒀습니다 — 지금 유일하게 미사용인 Public API입니다.
- ▲▼ 순서 변경은 그대로입니다(드래그 그리드 아님). 커밋하는 값이 같으니 나중에 갈아끼울 수 있습니다.

---

## 6. 단계 4 — 마무리

- **실패 복구** — `status: 'failed'`인 무비를 스튜디오 보드와 무비 탭에서 되살리는 UI. `error` 문구 노출 + `다시 시도`
- **무비 완성 푸시** — 기존 FCM 인프라(`features/register-push-token`, `shared/lib/notifications`)에 무비 완성 알림을 연결. `나` 탭의 `무비 완성 알림` 스위치와 묶는다
- **공유 내보내기** — `expo-sharing`으로 완성 무비 내보내기
- **지오펜스 정리** — 기획에서 "지오펜스 기반 자동 수집"은 버렸습니다. 위치 알림 인프라 자체는 남기되(`concept.md` §1 "남기는 것"), 자동 수집을 전제한 코드·문구가 남아 있으면 정리합니다
- **문서 정리** — `docs/guides/moment-collection-redesign/` 삭제, 이 계획 문서 삭제, `docs/features/*` 최종 검토, `README.md` 가이드 목록 갱신

---

## 7. 결정해 둔 것 / 아직 안 정한 것

기획 §11의 미결 사항 중 구현에 바로 걸리는 것만 여기서 정리합니다.

**정한 것**

- 트레이는 **1개**입니다. 여러 개는 요구가 나올 때 재검토.
- 무비 1편 = 스냅 ≤10. 이 상한은 트레이(`TrayCapacity`)와 무비(`MovieSnapLimit`) 양쪽이 같은 값을 씁니다.
- 스냅 원본은 당분간 **기기에만** 둡니다(현재 `shared/lib/recording-files` 그대로). 서버 업로드는 백엔드가 생길 때.
- 기존 롤/클립 데이터는 **버립니다**. 로컬 저장 키가 `snaply.rolls` / `snaply.clips`이고 새 키는 `snaply.movies` / `snaply.snaps` / `snaply.tray`이므로, 마이그레이션 코드 없이 기존 데이터는 그냥 읽히지 않습니다. 개발 중 앱이므로 이 방식을 택했습니다 — 실사용자가 생긴 뒤라면 다른 결정이 필요합니다.

**단계 3에서 정한 것**

- 트림 UI는 **드래그 슬라이더**입니다. 0.5초 격자, 최소 1초. 근거는 §5.5.
- 목표 길이는 **컷 합계를 그대로** 씁니다. `targetSec`은 모델에 없고, ②의 `목표 길이`는 읽기 전용입니다.
- 완성된 무비는 편집기가 아니라 **재생 화면**(`movie/[id]/play`)으로 엽니다.

**아직 안 정한 것**

- 무비 삭제 UI를 어디에 둘지(무비 탭 롱프레스 vs 편집기 안 vs 재생 화면). `useDeleteMovie`는 아직 호출자가 없습니다.
- 완성된 무비의 컷·스타일을 고칠 때 재생성을 강제할지, 초안으로 되돌릴지. 단계 4에서 판단.
