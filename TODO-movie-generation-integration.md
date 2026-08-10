# 무비 생성 백엔드 연동 — 남은 작업

> **이 문서는 임시 문서입니다.** 아래 "완료 후 정리"의 체크박스가 모두 채워지면 이 파일을 삭제하세요.
> 영구적으로 남아야 하는 내용은 `docs/features/movie.md`와 `docs/features/studio.md`에 이미 반영돼 있습니다.
> 이 문서는 `docs/` 아래가 아니라 저장소 루트에 있습니다 — `AGENTS.md`의 문서 색인에 등재된 문서가 아니기 때문입니다.

작성 2026-08-07 · 갱신 2026-08-10(API 명세 반영) · 대상 브랜치 `main`

---

## 1. 지금까지 한 것

| 단계 | 상태 | 커밋 |
| --- | --- | --- |
| 1. 스타일 3종(백엔드 프리셋)으로 교체 | ✅ | `6b5b85c` |
| 2. 자동 자막 토글 감추기 | ✅ | `6b5b85c` |
| 3. WS·REST API 세그먼트 | ✅ | `ee640f7` |
| 4. 생성 흐름을 서버 job으로 교체 | ✅ | `ee640f7` |
| 5. 렌더된 결과 재생 | ✅ 5-1·5-1b 재생 검증 완료 (5-2 공유는 미해결) | `4b952b6` |
| 6. trim·출력 프로필 전송 | ✅ 전송·9:16 검증 완료 (트림 반영 여부는 미확인) | `b58ba9a` |
| 7. 실기기·실서버 검증 | 🔶 진행 중 (5장) | — |

6단계는 원래 "trim 미반영 안내"였습니다. 2026-08-10 명세 갱신으로 `POST /edit-jobs`가 컷별 구간을 받게 돼서, 안내를 붙이는 일에서 **실제로 전송하는 일**로 바뀌었습니다(→ 4장). 5단계보다 싸고 검증도 같이 되므로 5단계보다 먼저 하는 편이 낫습니다.

---

## 1.5. 2026-08-10 API 명세 갱신 요약

`docs/api/openapi.json`·`src/shared/api/schema.d.ts`가 갱신됐습니다(`b58ba9a`). 바뀐 것은 `/edit-jobs` 두 엔드포인트뿐이고 `/videos`, `/videos/upload-url`, billing, sns는 그대로이며 WebSocket 계약도 변동 없습니다(백엔드 `docs/api-spec.md` 기준).

**`POST /edit-jobs` 요청 body**

```
oneOf: clips | videoIds                     (둘 중 하나 필수)
clips: [{ videoId, startMs?=0, endMs? }]    1~10개, ms 정수, 최대 86400000
videoIds: string[]                          1~10개 (기존 그대로, 계속 유효)
stylePreset: 감성 | 여행 | 일상             (변경 없음)
outputProfile?: short_vertical | youtube_landscape | instagram_portrait | square   기본 short_vertical
fitMode?: contain | cover | blur_background                                        기본 blur_background
```

**`GET /edit-jobs/{id}` 응답**에 필수 필드 3개 추가:

- `pipelineVersion: string`
- `editSpec`: `{version:1, stylePreset}` 또는 `{version:2, stylePreset, clips:[{videoId, startMs, endMs?}]}`
- `renderSpec`: `{profileVersion:1, outputProfile, width, height, fps, fitMode}`

⚠️ **생성된 타입이 `oneOf`를 강제하지 못합니다.** `clips?`와 `videoIds?`가 둘 다 optional로 떨어지고 `& (unknown | unknown)`이 붙어서, 둘 다 빠뜨려도 컴파일은 통과하고 런타임에 400이 됩니다. `create-edit-job.ts`가 코드로 한쪽만 만들도록 보장해야 합니다.

⚠️ **API가 `clips`를 받는다는 것이 워커가 트리밍을 렌더에 반영한다는 뜻은 아닙니다.** 인접 `snaply-backend` 체크아웃에는 `clips`/`editSpec v2` 구현이 없습니다(`main`, `codex/ai-worker-output-profiles` 양쪽 grep 0건 — 구현된 것은 출력 프로필뿐). `apps/ai-worker/src/worker.py`는 `editSpec`에서 `stylePreset`만 읽고 `startMs/endMs`는 쓰지 않습니다. 이 명세는 아직 푸시되지 않은 백엔드 상태에서 뽑힌 것으로 보입니다. 6단계를 시작하기 전에 실서버에서 실제로 잘려 나오는지 확인하거나 백엔드 작업자에게 워커 반영 여부를 확인하세요 — 반영 전이라면 6단계는 "전송은 미리 구현하고 미반영 안내는 유지"가 됩니다.

---

## 2. 5단계 — 렌더된 결과 재생

### 5-1. 단일 원격 영상 재생 분기 ✅ (2026-08-10, `4b952b6`)

구현됐습니다. watch 모드만 파일을 재생합니다("완성본을 본다 = 파일, 고친다 = 내 컷").

- `src/pages/movie/ui/render-player.tsx` (신규): `render.uri` 하나를 `expo-video`로 재생하는 단일 플레이어. 진입 시 일시정지로 첫 프레임, 스테이지 탭으로 재생/일시정지, 끝나면 리플레이. 원격 스트림이라 컷 플레이어에 없던 두 상태를 가짐 — 로딩 중 표시, 재생 불가(URL 소멸·네트워크) 오류 표시.
- `movie-watch.tsx`: `render.uri`가 있으면 `RenderPlayer`, 없으면 기존 `CutPlayer`(mock 모드·과거 렌더), 그것도 없으면 빈 상태. 파일은 원본 스냅이 전부 지워져도 재생됩니다.
- `watch-cuts.ts`: 파일이 재생될 때는 길이를 항상 `render.durationSec`로 — 스냅이 다 지워진 무비 옆에 "0초"가 찍히지 않도록.
- `editedSinceRender` 드리프트 안내는 그대로 유효합니다(재생되는 것이 지금 컷 구성이 아니라는 사실이 파일 재생에서 더 정확해짐).
- 스튜디오 스테이지는 의도적으로 컷 재생 유지 — 단, 프리뷰에 BGM·자막·스타일이 없다는 고지가 없다는 부채는 `movie.md` Known limitations에 남김.

### 5-1b. fresh URL 재조회 ✅ (2026-08-10, `4b952b6` · 실서버 검증 완료)

첫 실기기 재생에서 AccessDenied가 났던 문제: 워커가 `edited_url`에 비서명 객체 URL을 저장하고 API가 그대로 돌려주는데 버킷은 비공개였습니다. **백엔드가 `GET /videos/{id}` 응답 시점에 presigned GET URL을 발급하도록 수정됐고, 실기기에서 재생까지 확인했습니다(2026-08-10). 결과물은 9:16 세로(1080×1920) — 6-2의 `outputProfile` 전송도 이 재생으로 검증됐습니다.**

presigned URL은 만료되므로 앱은 저장된 `render.uri`를 영구 신뢰하지 않습니다:

- `MovieRender.videoId` — 결과 영상의 서버 id가 렌더에 남습니다(finish-time 조회가 실패해도 저장).
- `useRenderSource` + `editedVideoQueries` — watch 모드 진입마다 `GET /videos/{id}`로 fresh URL을 다시 받아 재생. 실패 시 저장된 uri로 폴백, fresh 응답이 "파일 없음"이면 컷 재생으로.
- ⚠️ **2026-08-10 이전에 완성된 무비는 `videoId`가 없어 복구 불가** — 저장된 비서명 URL로 폴백하고, 그 링크는 이제 AccessDenied입니다(URL 경로의 id는 jobId라 역산도 안 됨). 한 번 재생성하는 것이 복구 방법입니다. `movie.md` Known limitations에 기록.

### 5-2. 공유가 실제로 동작하게 만들기 ⚠️ (5-1 이후 더 급해짐)

**`expo-sharing`은 로컬 파일만 받습니다.** `Sharing.shareAsync()`에 `https://` URL을 그대로 넘기면 실패합니다.

5-1이 끝난 지금 이 버그는 **노출된 상태입니다**: 실제 렌더가 `render.uri`를 채우면 공유 버튼이 활성화되는데, 누르면 dev 로그 경고만 남고 아무 일도 안 일어납니다. 다음 작업으로 권장.

- 대상: `src/features/share-movie/model/use-share-movie.ts`, `src/shared/lib/sharing/share-file.ts`
- 필요한 것: 공유 직전에 `render.uri`를 캐시 디렉터리로 내려받고(`expo-file-system`의 `File`/`downloadAsync`) 그 로컬 경로를 공유 시트에 넘기는 단계.
- `ShareBlock` 타입에 다운로드 실패 케이스가 필요할 수 있습니다(현재는 `'no-render'` 하나).
- 다운로드 중 표시가 필요한지 판단하세요 — 수십 MB면 즉시 열리지 않습니다.
- 이게 되면 `docs/features/movie.md`의 Sharing 절과 `studio.md`의 선택 바 설명(공유 버튼이 "오늘은 절대 안 뜬다")을 갱신해야 합니다.

### 5-3. 썸네일 (선택)

백엔드가 `thumbnailUrl`도 만들지만 앱은 쓰지 않습니다. 현재 커버는 스냅 프레임(`widgets/movie-shelf`의 `coverUris`)입니다. 편집본의 썸네일을 커버로 쓸지는 제품 판단 — 안 쓸 거면 `get-edited-video.ts`에서 필드를 지워도 됩니다.

---

## 3. 6단계 — trim·출력 프로필 전송

**6-1·6-2는 2026-08-10 구현 완료(`b58ba9a`).** `create-edit-job.ts`가 `clips` + `outputProfile`/`fitMode`를 보내고, `use-compose-movie.ts`의 `remoteVideoIds`는 컷의 trim을 함께 모으는 `remoteClips`가 됐습니다. 전체 테스트 712건 통과, `tsc` 클린. `fitMode`는 서버 기본값과 같은 `blur_background`로 두었으므로 **렌더 결과는 아직 바뀌지 않은 상태이며, 제품 결정은 그대로 열려 있습니다.** 남은 것은 6-3(워커 미반영 확인 시 안내)과 실서버 검증입니다.

### 6-1. `videoIds` → `clips` ✅

- 대상: `src/features/compose-movie/api/create-edit-job.ts`, `src/features/compose-movie/model/use-compose-movie.ts`
- 지금 `remoteVideoIds()`가 컷 순서대로 `videoId`만 모읍니다. 이걸 `{videoId, startMs, endMs}` 빌더로 바꾸세요. trim이 없는 컷은 `{videoId}`만 넣습니다 — `startMs` 기본이 0이고, 앱은 "통째로 재생"을 `trim` 없음 하나로만 표현하므로(`withTrim`이 전체 구간 창을 버립니다) 표현이 그대로 맞습니다.
- 초 → ms 변환은 무손실입니다. 트림은 `CutTrimStepSec = 0.1`초 단위로 스냅되고 저장 시 밀리초로 반올림돼 있어서(`src/entities/movie/lib/movie-trim.ts`) `Math.round(sec * 1000)`이면 됩니다. `endMs`는 최소 1이고, `MinCutSec = 0.4`이므로 하한에 걸릴 일이 없습니다.
- `clips`의 상한 10은 `MovieSnapLimit`과 같습니다 — 앱이 이미 막고 있으니 새 게이트는 필요 없습니다.
- `oneOf`가 타입으로 강제되지 않으므로(→ 1.5장) `clips`를 항상 비어 있지 않게 만드는 책임은 코드에 있습니다. `videoIds`는 더 이상 보내지 마세요 — 두 필드를 함께 보내면 `oneOf` 위반으로 400입니다.
- `create-edit-job.ts`의 doc comment가 "trim은 함께 가지 않는다"고 못 박고 있으니 같이 고쳐야 합니다. `CreateEditJobInput`의 `videoIds` 필드도 이름과 모양이 바뀝니다.

### 6-2. `outputProfile` / `fitMode` 명시 전송 ✅

- 기본값이 `short_vertical`(1080×1920)이라 아무것도 보내지 않아도 세로로 나옵니다. 그래도 **명시적으로 보내세요** — 서버 기본 프로필이 바뀌는 순간 앱이 조용히 따라갑니다.
- `fitMode` 기본은 `blur_background`입니다. 세로 스냅에는 무해하지만 가로로 찍은 스냅은 위아래에 블러 배경이 깔립니다. `contain`(검은 레터박스)로 갈지는 **제품 판단이며 아직 미결**입니다. 결정하고 여기에 기록하세요.
- 프로필을 사용자가 고르게 할 계획은 없습니다. 상수 하나로 두고, `movie-style.ts`의 프리셋 매핑처럼 API 경계에 두세요.

### 6-3. trim 미반영 안내 (백엔드 워커가 아직 안 쓸 때만)

1.5장의 확인 결과 워커가 `startMs/endMs`를 무시한다면, 전송은 6-1대로 구현해 두고 안내는 남깁니다.

- 안내를 **한 곳에 격리**하세요. 서버 지원이 들어오면 그 한 곳만 걷어내면 되도록.
- 후보 위치: 컷 인스펙터의 `사용 N초` 옆이 가장 맥락에 가깝습니다. 문구는 `src/pages/movie/ui/refusal-notice.tsx`가 이미 "무비 화면의 모든 거절 문구는 한 파일에" 원칙을 갖고 있으니 그 근처가 자연스럽습니다.
- 조건부로 띄우세요 — trim이 하나도 없는 무비에 "트리밍이 반영되지 않아요"는 소음입니다.

### 6-4. (선택) 서버가 실제로 무엇을 렌더했는지 읽기

`GET /edit-jobs/{id}`가 이제 `editSpec`·`renderSpec`을 돌려주므로, 결과 파일이 어떤 컷 구성·해상도로 만들어졌는지 앱이 알 수 있습니다. `editedSinceRender` 드리프트 판정을 로컬 기억이 아니라 서버가 말한 스펙과 비교하는 쪽으로 옮길 수 있습니다. 지금 당장 필요한 것은 아니고, `get-edit-job.ts`의 zod 스키마는 모르는 키를 무시하므로 읽지 않아도 깨지지 않습니다.

---

## 4. 백엔드에 달린 항목

앱에서 할 수 있는 일이 아니고, 백엔드 쪽 작업이 끝나야 닫히는 것들입니다.

| 항목 | 현재 | 필요한 것 | 진행 |
| --- | --- | --- | --- |
| **결과 파일 URL presign** | ~~비서명 URL이라 AccessDenied~~ → `GET /videos/{id}` 응답 시점 presign 발급으로 수정됨 | — | ✅ 2026-08-10 실기기 재생으로 검증 완료 |
| **9:16 세로 렌더** | `pipeline/render_spec.py`의 `PROFILE_V1`이 `short_vertical = 1080×1920`을 정의하고 워커가 `renderSpec`대로 렌더 | — | ✅ 2026-08-10 실기기 재생으로 결과물 확인 완료 |
| **trim 전송** | 명세는 `clips: [{videoId, startMs, endMs}]`를 받지만 워커(`worker.py`)는 `stylePreset`만 읽음 | 워커가 컷별 구간을 실제로 잘라내기 | ⚠️ 명세만 선반영된 것으로 보임 — 1.5장 확인 필요 |
| 완료 후 재접속 시 `outputUrl` | `done` 분기가 `{progress:100, step:'완료'}`만 보내고 닫음 | 있으면 좋음. 없어도 앱이 REST 폴백으로 처리 중 | 미요청 |
| BGM 선택 | 프리셋이 트랙을 결정 | 트랙 id를 받을지 여부 (제품 판단) | 미정 |
| `fitMode` 기본값 | `blur_background` — 가로 스냅에 블러 배경이 깔림 | 앱이 `contain`을 보낼지 결정 (백엔드 작업 아님, 제품 판단) | 미정 |
| 자막 on/off | 매 실행 강제 삽입, 게다가 `mov_text` 소프트 자막이라 `expo-video`가 렌더 안 할 가능성 높음 | on/off 필드, 또는 하드섭 | 미정 |

**스펙이 바뀌면** `npm run api:pull && npm run api:gen`으로 `docs/api/openapi.json`과 `src/shared/api/schema.d.ts`를 함께 갱신하고 커밋하세요. WebSocket 계약은 OpenAPI에 없으므로 백엔드 저장소의 `docs/api-spec.md`를 봐야 합니다.

---

## 5. 검증 (7단계)

JS 테스트로는 증명되지 않는 것들입니다. 지금까지 **실서버·실기기 검증은 한 번도 하지 않았습니다.**

### 준비

1. 백엔드 구동 (`snaply-backend`의 `docker-compose.dev.yml`)
2. ⚠️ **`STORAGE_PUBLIC_ENDPOINT`를 Mac의 LAN IP로 설정** — `localhost`면 폰에서 presigned PUT과 결과 파일 다운로드가 모두 실패합니다. (백엔드 커밋 `aa6e9c4`가 내부/외부 엔드포인트를 분리했습니다.)
3. 앱 `.env`의 `EXPO_PUBLIC_API_BASE_URL`도 같은 LAN IP로. 이 값이 비어 있으면 `USE_MOCK_API`가 켜져서 아무것도 실제로 검증되지 않습니다.
4. 무선 adb로 안드로이드 실기기 연결 + Metro 실행 (`docs/workflows/android-device-verification.md`)

### 확인할 것

- [x] ~~Supabase JWT를 백엔드 JWKS가 받아주는가~~ — **2026-08-10 확인.** 백엔드 JWKS가 앱 프로젝트(`glvzrxllfopvgsjsivub`)의 키를 해석하고, 실기기에서 찍은 스냅이 서버 발급 `videoId`를 받았다. 즉 presign·등록 두 인증 요청이 실제 앱 토큰으로 통과한다.
- [x] ~~스냅 업로드 → `uploaded` + `videoId` 매핑~~ — 2026-08-10 확인 (sync 엔트리 15건 전부 `uploaded`, tombstone 없음)
- [ ] 업로드 안 끝난 스냅이 섞인 무비 → `uploading` 거절 문구
- [ ] 생성 시작 → 진행률 링이 서버 마일스톤(0/10/35/60/85/95/100)을 따라 움직이고 서버 단계 문구가 보이는가
- [ ] **앱을 백그라운드로 보낸 뒤 완료** → 복귀 시 catch-up으로 완성되는가 (이 케이스가 모바일에서 가장 흔함)
- [ ] **앱 강제 종료 후 재실행** → 완성 상태로 복구되는가
- [ ] 비행기 모드로 소켓을 끊고 → 20초 폴링이 따라잡는가
- [ ] 무료 플랜 월 3편 초과 → 백엔드 메시지가 그대로 노출되는가
- [ ] 실패한 job → 서버 사유가 푸터에 남는가
- [ ] 생성 중 마지막 스냅 원본 삭제 → 로컬 실패 처리
- [x] ~~결과 영상이 실제로 9:16(1080×1920)인가~~ — 2026-08-10 실기기 재생으로 확인
- [ ] `GET /edit-jobs/{id}`의 `renderSpec`이 앱이 보낸 `outputProfile`/`fitMode`를 그대로 되돌려주는가
- [ ] 6단계 완료 후: **트림한 컷이 실제로 잘려서 렌더되는가** (여기서 워커 반영 여부가 판명됩니다)
- [ ] 6단계 완료 후: 가로로 찍은 스냅의 `fitMode` 결과가 의도한 모양인가
- [x] ~~원격 파일 재생~~ — 2026-08-10 확인 (presign 발급 + fresh URL 재조회 경로로 재생)
- [ ] 공유 시트 (5-2 구현 후)

검증 결과는 `docs/features/movie.md`에 기록하고, 구현 상태(`Prototype`/`Partial`/`Functional`)를 실제에 맞게 올리세요.

---

## 6. 알려진 부채 (연동과 별개, 지금 고칠 것 아님)

- 무비 자체는 여전히 로컬 전용입니다. 재설치하면 무비가 전부 사라지고, 그 무비들이 만든 결과 파일은 서버에 참조 없이 남습니다. 다기기 동기화도 없습니다.
- 재생성해도 버전이 없습니다. 앱은 최신 결과만 가리키고 이전 결과 row는 서버에 계속 쌓입니다. 정리 정책이 없습니다.
- 소켓은 작업당 한 번만 열고 재연결하지 않습니다. 끊기면 폴링이 메웁니다.
- `Movie.captions` 필드는 저장되지만 아무도 읽지 않습니다.

---

## 7. 완료 후 정리

- [ ] 갱신된 `docs/api/openapi.json`·`src/shared/api/schema.d.ts` 커밋
- [x] ~~5-1 구현 및 문서 반영 (원격 파일 재생)~~ — 2026-08-10 완료, 실서버 재생 검증까지 완료
- [ ] 5-2 구현 및 문서 반영 (공유: 다운로드 후 로컬 경로 공유)
- [x] ~~6단계 구현 및 문서 반영 (`clips` 전송 + `outputProfile`/`fitMode` 명시)~~ — 2026-08-10 완료(6-3은 워커 확인 후)
- [ ] `fitMode` 결정 기록 (`blur_background` 유지 vs `contain`)
- [x] ~~백엔드 9:16 렌더 결과물 확인~~ — 2026-08-10 확인
- [ ] 백엔드 워커의 trim 반영 확인 (미반영이면 6-3 안내 유지 결정 기록)
- [ ] 실기기·실서버 검증 완료 및 `docs/features/movie.md`에 결과 기록
- [ ] **이 파일 삭제**
