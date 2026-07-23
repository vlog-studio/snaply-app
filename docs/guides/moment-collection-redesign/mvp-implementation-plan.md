# MVP 구현 계획 — 데일리 롤 최소 루프

> 이 문서는 사람 개발자를 위한 한글 계획 문서입니다. 에이전트용 문서가 아니므로 `AGENTS.md` 색인에 포함하지 않습니다.
> 상위 기획은 [`concept.md`](concept.md)를 따릅니다. 이 문서는 그중 **MVP로 먼저 만들 범위**의 FSD 슬라이스 설계와 마일스톤만 다룹니다.
> 실제 슬라이스 배치는 착수 시 `docs/architecture/feature-sliced-design.md`, `docs/conventions/module-boundaries.md`, `docs/conventions/implementation-patterns.md`를 재확인해 확정합니다.
> 최초 작성: 2026-07-23.

---

## 1. MVP 정의 (확정)

- **범위**: 데일리 롤 최소 루프. **담기 → (하루 끝) 지연된 현상 → 릴 공개**.
- **AI 편집**: 규칙 기반 **간단 자동조합**(컷 순서 + BGM·전환 메타). 실제 AI는 나중에 교체. "현상" 연출과 결과물은 진짜.
- **데이터 모델**: 처음부터 컷↔롤 **N:M + 수집 규칙** 가능하게 설계하되, UI엔 데일리 롤만 노출.

**뒤로 미룸(v1.1+)**: 테마 롤·프리셋 카드, 지향 화면비·가로 유도, 같은 컷 여러 롤 재사용 UI, "다르게 현상" 고급 편집, 단일 MP4 렌더링·공유 내보내기.

---

## 2. 핵심 흐름 변화 (중요)

현재 캡처 플로우는 `record → editing(시뮬레이션) → result(목업)`로 **촬영 직후 즉시 편집**입니다. 이는 우리의 **"지연된 현상"** 훅과 정면충돌합니다.

MVP에서 흐름을 이렇게 끊습니다.

```text
[기존] 촬영 → 즉시 편집 → 결과
[MVP]  담기 → 오늘의 롤에 컷 저장 → 홈으로 복귀   (여기서 끝. 현상 안 함)
        ⋯ 하루가 지남 ⋯
        롤 상세 → "현상하기" → 현상 세리머니 → 릴 공개
```

즉 촬영은 더 이상 편집으로 자동 진입하지 않고, **현상은 롤 상세에서 명시적으로 시작**합니다.

---

## 3. FSD 슬라이스 설계

### 신설(new)

| 레이어 | 슬라이스 | 소유 책임 |
| --- | --- | --- |
| `entities` | **`clip`** | 컷 도메인 모델(`id, uri, durationSec, mood?, capturedAt, width, height, orientation, tags[]`). `LocalRecording`을 확장한 형태. 메타 CRUD 스토어 |
| `entities` | **`roll`** | 롤 모델(`id, type, collectionRule, targetOrientation, status, createdAt, title, clipRefs[{clipId, order, trim?}], reel?`). 오늘의 롤 셀렉터·멤버십·현상 상태 |
| `features` | **`capture-moment`** | 담기 액션: 촬영 결과 → 컷 영속화 → **오늘의 롤에 추가**. 데일리 롤 자동 생성 포함 |
| `features` | **`develop-roll`** | 현상 액션: 롤의 컷들 → 릴 조합(순서+BGM/전환 메타), 상태 `undeveloped→developing→developed` |
| `pages` | **`roll-detail`** | 컨택트시트(미현상) + `현상하기` CTA. 라우트 `/roll/[id]` |
| `shared/lib` | **`local-store`** | 문서 디렉터리 JSON 파일 기반 영속화 어댑터(`expo-file-system`). zustand `persist`의 storage로 주입. 새 의존성 없이 "메타 저장소 공백"을 메움 |

### 개편(evolve)

| 슬라이스 | 변경 |
| --- | --- |
| `pages/capture-record` | 탭-투-레코드 → **press-and-hold 5초** 뷰파인더. 손 떼면 `capture-moment` 호출 후 **홈 복귀**(편집으로 안 감) |
| `pages/capture-editing` | → **현상 세리머니** 화면으로. 시뮬레이션 진행바를 스캔·컬러 블룸 연출로 교체, `develop-roll` 결과 소비 |
| `pages/capture-result` | → **릴 재생** 화면으로. 정적 목업 제거, 롤의 컷을 **순차 재생** |
| `pages/home` | 하드코딩 제거. **오늘의 롤** 실데이터 바인딩(컨택트시트·`n/총` 카운터·담기 진입·선반 미리보기) |
| `pages/archive` | `vlogs` 탭 하드코딩 → **현상된 롤 선반** 실데이터 |
| `shared/ui/theme` | 라이트/다크 → **암실 다크 고정**. 팔레트를 concept §5 토큰으로 |

### 재사용(as-is)

- `shared/lib/recording-files` — 컷 원본 파일 저장/목록/삭제. `clip` 엔티티가 이 위에 메타를 얹음.
- `entities/capture-session` — `mood/duration` 타입을 `clip`에 그대로.
- `shared/ui`의 `video-preview`, `progress-bar`, `fade-in-view`, `snaply-button` — 릴 재생·현상 진행·버튼.
- `entities/location` 패턴(DTO↔도메인 + Query 팩토리 + mock) — 훗날 롤을 서버로 옮길 때 청사진.

---

## 4. 데이터 모델 & 영속화

- **컷 원본 영상** → 파일시스템(`recording-files`, 기존). 변경 없음.
- **컷 메타 + 롤** → `shared/lib/local-store`(신설)로 문서 디렉터리 JSON에 저장. `entities/clip`·`entities/roll`의 zustand `persist` storage로 연결(선례: `notification-settings-store`의 `persist + secureStorage`).
  - secure-store는 비밀·용량 제한용이므로 컷/롤 같은 일반·증가 데이터엔 **파일 JSON**을 씀.
- **오늘의 롤 자동 생성**: 앱 진입/촬영 시, `createdAt`이 오늘인 데일리 롤이 없으면 생성(규칙=`그날 전체`, 지향=세로). `formatRecordingDate` 류로 날짜 키.
- N:M은 `roll.clipRefs`(컷 id 참조 배열)로 표현. 컷 원본 불변, 편집정보(trim/order)는 ref에.

---

## 5. MVP 단순화 (정직하게 기록)

| 항목 | MVP 처리 | 진짜 버전(나중) |
| --- | --- | --- |
| 릴 조합 | 컷들을 **순차 재생하는 플레이리스트**(단일 파일 렌더링 아님) | 단일 MP4 렌더링·익스포트 |
| AI 편집 | 규칙 기반 순서+BGM/전환 메타 | 실제 AI 컷 선별·편집 |
| 공유/저장 | 화면 내 재생까지 | 파일 내보내기·SNS 공유 |
| 방향/지향 화면비 | 세로 고정, UI 없음 | 와이드 유도·레터박스 |
| 컷 방향 감지 | 저장만, 방향 메타 최소 | 정확한 orientation 판정 |

> `docs/features` 규칙(구현된 동작만 기술)에 맞춰, 위 "MVP 처리"만 기능 문서에 `Prototype`/`Partial`로 기록하고 시뮬레이션을 정확히 라벨링합니다.

---

## 6. 마일스톤

| # | 목표 | 산출물 | 검증 |
| --- | --- | --- | --- |
| **M1** | 데이터 기반 | `local-store` + `entities/clip` + `entities/roll` + 오늘의 롤 자동 생성 | 유닛 테스트(스토어·오늘의 롤·멤버십) |
| **M2** | 담기 개편 | press-and-hold 뷰파인더 + `capture-moment` → 컷이 오늘의 롤에 저장, 홈 복귀 | 시뮬레이터 촬영→홈 카운터 증가 |
| **M3** | 홈·롤 상세 | 홈 오늘의 롤 바인딩 + `roll-detail` 컨택트시트(미현상)+`현상하기` | 촬영 컷이 컨택트시트에 뜸 |
| **M4** | 현상·릴 | `develop-roll` 자동조합 + 현상 세리머니 + 릴 순차 재생 | 현상 후 릴 재생 확인 |
| **M5** | 보관함 선반 | 현상된 롤 목록(vlogs 하드코딩 대체) | 과거 롤이 선반에 |
| **M6** | 시각·모션 폴리시 | 암실 토큰·그레인·엣지프린트·모션 타이밍(concept §5·§7) | 목업과 대조 |
| **M7** | 네비게이션 셸 개편 | 2탭 + 중앙 촬영 버튼, 설정을 보관함 구석으로(concept §6) | 기기에서 탭 구조·중앙 담기 진입 확인 |

M1→M2→M3가 핵심 루프 뼈대, M4가 "매직", M5·M6은 완성도, M7은 화면 설계(concept §6) 정합.

### M7 상세 — 네비게이션 셸 개편 (추가: 2026-07-23)

**배경**: M1~M6은 concept §5(시각)·§7(모션)만 폴리시했고, concept §6 **화면 설계의 네비게이션**은 애초에 슬라이스·마일스톤에 없었다. 그 결과 색상 토큰만 반영되고 동작은 기존 3탭 구조(홈/보관함/설정)를 그대로 따른다. M7이 이 공백을 메운다.

**목표 (concept §6)**:

```text
[ 오늘 ]      ( 담기 )      [ 보관함 ]
  홈 탭     중앙·상시 촬영      선반+아카이브
```

- 하단 **2탭**(오늘/보관함) + **가운데 세이프라이트 촬영 버튼**. 담기는 어느 탭에서든 한 번의 탭.
- **설정 탭 제거** → 보관함 헤더 구석 진입점으로 이동.

**소유 계층 (`docs/frameworks/expo-router.md` 네비게이션 오너십 준수)**:

| 변경 | 위치 | 내용 |
| --- | --- | --- |
| 탭 셸 재구성 | `_app/routes/app-tabs.tsx` | `Tabs.Screen`을 `index`·`archive` 2개로. 중앙 촬영 버튼은 탭 스크린이 아니라 탭바 위 오버레이 Pressable로 두고 `router.push('/capture')`(루트 스택 모달). |
| 설정 라우트 이동 | `src/app/settings.tsx`(신설) + `_app/routes/root-layout.tsx` | `(tabs)/settings.tsx` 제거. 인증 그룹 스택에 `settings` 스크린 등록(모달 아님, 일반 push). |
| 설정 진입점 | `pages/archive` | 보관함 헤더 구석에 `설정` 링크 추가(`Link href="/settings"`). |

**MVP 단순화(정직하게)**: 중앙 버튼은 concept §7의 "꾹 눌러 담기" 링 애니메이션까지 완성하지 않고, 기존 `/capture` 모달로 보내는 **진입 트리거**만 담당한다(링 연출은 이미 뷰파인더 화면 소관).

**후속(완료: 2026-07-23)**: 중앙 버튼이 담기를 맡으면서 홈의 중복 담기 링을 제거하고 "오늘" 홈을 정리했다 — 헤더 롤 번호를 데일리 롤 실 순번으로, 선반 미리보기를 현상된 롤 실데이터로 바인딩(M3의 "선반 미리보기" 실데이터화 완결). 현상된 롤 read-model은 `pages/archive`에서 신설 `widgets/developed-rolls-shelf`로 올려 홈·보관함이 공유한다(크로스-엔티티 조합이라 엔티티·페이지에 둘 수 없어 위젯 레이어 신설). `/12`는 concept §4의 의도된 소프트 타깃이라 유지. "촬영 중 테마 롤"은 테마 롤이 v1.1+라 홈에 미노출.

**검증**: 실기기에서 (1) 탭이 2개로 줄었는지, (2) 중앙 촬영 버튼이 두 탭 모두에서 `/capture`를 여는지, (3) 설정이 보관함 구석에서 열리는지, (4) 기존 탭바 블러/세이프에어리어가 깨지지 않는지 확인.

---

## 7. 테스트 대상 (`docs/workflows/writing-unit-tests.md` 기준)

- `entities/clip`·`entities/roll` 스토어 CRUD·셀렉터.
- 오늘의 롤 자동 생성/재사용 로직(날짜 경계).
- `develop-roll` 조합(빈 롤·1컷·N컷, 순서).
- `local-store` 직렬화/역직렬화 라운드트립.

---

## 8. 미결정 / 리스크

- ~~press-and-hold 최소 시간·자동 종료(5초) 튜닝(concept §7).~~ → 구현 완료(2026-07-23): 셔터가 press-and-hold + 담기 링(0→N초 linear, react-native-svg)으로 전환. 최소 홀드 250ms 미만은 담지 않고 버림, 자동 종료는 네이티브 `maxDuration` 그대로. 임계값 튜닝 여지는 `pages/capture-record/model/hold-gesture.ts`에 상수로 남김.
- 순차 재생 릴을 `expo-video`로 어떻게 이어붙일지(끊김 없는 전환) — 기술 스파이크 필요.
- 암실 다크 고정 전환이 기존 라이트 테마 자산과 충돌하는 범위(`shared/ui/theme`, `theme-mode` 스토어).
- 오늘의 롤 자동 생성 트리거 위치(앱 부팅 vs 첫 촬영) — `src/_app/providers` 헤드리스 vs feature.
