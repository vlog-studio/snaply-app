# 위치 기반 FCM 알림 — 프론트엔드 선행 개발 계획

> 이 문서는 사람 개발자를 위한 한글 계획 문서입니다. 에이전트용 문서가 아니므로 `AGENTS.md` 색인에 포함하지 않습니다.
> 이 기능이 실제로 구현되면, 코드 소유 계층과 동작 정의는 `docs/features/`에 영문 기능 문서로 별도 작성합니다(기능 문서는 "구현된 동작만 기술" 규칙이라 계획 단계에서는 만들지 않습니다).
> 백엔드 API 명세의 출처는 `vlog-studio 백엔드 개발 가이드`이며, 이 앱(프론트)은 그 API의 **소비자**입니다.

---

## 이 문서의 목적

백엔드의 위치 알림 API(`GET /locations`, `POST /notifications/geofence-enter`, `POST /auth/fcm-token`)는 아직 없습니다. 하지만 위치 기반 FCM 알림 흐름은 **대부분 클라이언트에서 일어나기 때문에**, API 없이도 프론트에서 지금 만들 수 있는 부분이 많습니다. 이 문서는 **무엇을 먼저 만들 수 있고, 무엇을 목(mock)으로 두며, 어떤 순서로 진행할지**를 정리합니다.

---

## 1. 왜 이 기능은 프론트가 주도하는가

전체 흐름에서 서버에 의존하는 지점은 두 개뿐입니다. 나머지(권한, 지오펜스 진입 감지, 토큰 발급, 알림 표시, 설정 UI)는 전부 앱의 몫입니다.

```text
[앱] 위치/알림 권한 요청                     ← 앱 단독
[앱] GET /locations 로 주변 지오펜스 포인트 수신   ← 서버 의존 (①)
[앱] expo-location 지오펜싱으로 진입 감지         ← 앱 단독
[앱] 진입 시 POST /notifications/geofence-enter  ← 서버 의존 (②)
[서버] 쿨다운·조용한시간·수신동의 확인 후 FCM 발송   ← 서버 책임
[앱] FCM 수신 → 포그라운드/백그라운드 알림 표시     ← 앱 단독
[앱] FCM 토큰 발급 → POST /auth/fcm-token 등록    ← 서버 의존 (③)
```

**서버가 소유하는 판정 로직**(30분 중복 방지, `quiet_start`~`quiet_end` 조용한 시간, `notification_enabled` 수신 동의)은 `POST /notifications/geofence-enter`와 발송 단계에서 서버가 처리합니다. 앱은 진입 이벤트를 **보고**하고, 설정 값을 **편집**(`PATCH /auth/me`)할 뿐, 발송 여부를 최종 결정하지 않습니다. 앱은 과도한 호출을 줄이기 위한 가벼운 로컬 스로틀만 둘 수 있습니다.

---

## 2. 확정된 기술 결정

| 항목 | 결정 | 이유 |
| --- | --- | --- |
| FCM 토큰 방식 | **네이티브 FCM 토큰** (`@react-native-firebase/messaging`) | 백엔드가 Firebase Admin SDK로 발송함. `getToken()`이 주는 raw FCM 토큰을 `POST /auth/fcm-token`에 그대로 넘기면 서버는 `admin.messaging().send({ token })`으로 바로 발송. 백엔드가 Expo를 몰라도 표준 FCM 흐름 그대로 동작. |
| 지오펜스 감지 | `expo-location` + `expo-task-manager` | 백그라운드 지오펜싱을 SDK 57이 공식 지원(`startGeofencingAsync`). |
| 포그라운드 알림 표시 | `expo-notifications`로 로컬 알림 표시 | RN Firebase는 iOS 포그라운드에서 배너를 자동으로 띄우지 않으므로, 수신 메시지를 로컬 알림으로 표시하는 조합 사용. |
| 서버 데이터 | TanStack Query v5 | 프로젝트 표준. 현재 미연결 상태이므로 이번에 `QueryClientProvider`를 처음 연결. |

> **주의:** `@react-native-firebase/messaging`는 네이티브 모듈이라 **Expo Go에서 동작하지 않습니다.** dev build가 필수입니다(3단계 이후). `expo-location`/`expo-task-manager`도 지오펜싱은 dev build에서 검증합니다.

---

## 3. FSD 배치 설계

`docs/frameworks/state-and-data.md`의 배치 규칙을 따릅니다. 서버 데이터는 TanStack Query로 엔티티/페이지 `api`에, `QueryClient`는 `_app/providers`에, 네이티브 호출은 `shared/lib`의 좁은 어댑터에, 사용자 대상 흐름과 에러 메시지는 `features`/`pages`에 둡니다.

```text
_app/
  providers/                      # QueryClientProvider 추가 (신규)
  routes/
    register-background-tasks.ts  # (신규) 최상위 스코프에서 지오펜싱 Task 정의·등록

entities/
  location/                       # (신규) 지오펜스 포인트 도메인
    model/                        #   Location 타입, GeofenceRegion 매핑
    api/                          #   locations.queries.ts (GET /locations) + mock 데이터
    index.ts

features/
  geofence-monitor/               # (신규) 지오펜싱 시작·중지, 진입 이벤트 처리
    model/                        #   모니터 생명주기, 로컬 스로틀
    api/                          #   report-geofence-enter.ts (POST /notifications/geofence-enter) + mock
    index.ts
  register-push-token/            # (신규) FCM 토큰 발급·갱신·등록
    model/                        #   use-push-token, onTokenRefresh 처리
    api/                          #   register-fcm-token.ts (POST /auth/fcm-token) + mock
    index.ts
  notification-settings/          # (신규) 수신 동의·조용한 시간 편집
    model/                        #   폼/스토어 + PATCH /auth/me 뮤테이션
    index.ts

shared/
  lib/
    location/                     # (신규) expo-location 좁은 어댑터: 권한, 지오펜싱 래퍼
    notifications/                # (신규) 좁은 어댑터: FCM 토큰, onMessage, 로컬 알림 표시
  api/                            # (신규) HTTP 경계: Supabase JWT 헤더 주입, 에러 정규화, mock 스위치

pages/
  settings/                       # 기존 프로토타입 알림 UI를 notification-settings 피처와 연결
```

권한 처리는 기존 카메라 훅(`src/pages/capture-record/model/use-recording-permissions.ts`)의 패턴(예: `canAskAgain` 처리, `Linking.openSettings()`로 설정 이동, 한글 안내 메시지)을 참고합니다. 다만 위치·알림 권한은 지오펜스와 푸시 양쪽에서 재사용되므로, 좁은 네이티브 접근은 `shared/lib`에 두고 사용자 대상 권한 흐름은 각 피처(`geofence-monitor`, `register-push-token`)가 소유합니다.

---

## 4. 프론트가 의존하는 API 계약

백엔드 명세 기준. 응답은 공통 형식 `{ success: true, data }` / `{ success: false, error: { code, message } }`을 따릅니다. 이 계약을 `shared/api`(또는 각 `api` 세그먼트)에 Zod 스키마 + 타입으로 먼저 고정해두면, 실제 엔드포인트가 나왔을 때 목 구현만 교체하면 됩니다.

| 용도 | 엔드포인트 | 요청 | 응답(data) |
| --- | --- | --- | --- |
| 주변 지오펜스 포인트 | `GET /locations?lat=&lng=&radius=` | 쿼리 파라미터 | `Location[]` (`id, name, lat, lng, radius_meters, message_template, category`) |
| 진입 이벤트 보고 | `POST /notifications/geofence-enter` | `{ locationId }` | 발송 결과(서버가 쿨다운/조용한시간/동의 판정) |
| FCM 토큰 등록 | `POST /auth/fcm-token` | `{ fcmToken }` | 등록 결과 |
| 알림 설정 편집 | `PATCH /auth/me` | `{ notification_enabled?, quiet_start?, quiet_end?, interests? }` | 갱신된 프로필 |

인증 헤더(`Authorization: Bearer <supabase_jwt>`)는 `shared/api` 클라이언트에서 Supabase 세션(`supabase.auth.getSession()`)으로부터 주입합니다.

---

## 5. Mock 전략

API가 없는 동안 인터페이스만 확정하고 목으로 동작시킵니다.

- 각 `api` 세그먼트는 **실제 요청 함수와 목 구현을 함께** 두고, 환경 플래그(`EXPO_PUBLIC_USE_MOCK_API=true`)로 스위치합니다.
- `GET /locations` 목 데이터는 백엔드 시드 목록(서울 관광지: 경복궁·남산타워·북촌한옥마을, 감성 카페: 성수·연남·홍대, 제주 스팟)을 그대로 사용해 실제와 같은 형태로 채웁니다.
- `POST /notifications/geofence-enter`, `POST /auth/fcm-token` 목은 성공 응답을 반환하고 콘솔/로그로 페이로드를 남겨 흐름을 눈으로 확인합니다.
- TanStack Query의 쿼리 키/`queryOptions` 팩토리는 목/실제와 무관하게 동일하게 유지합니다.

### 실제 API 연결 방법 (1단계 산출물 기준)

1단계 스캐폴딩은 목 모드로 완성돼 있습니다(`EXPO_PUBLIC_API_BASE_URL`이 비어 있으면 자동 목 모드). 실제 API가 나오면 다음만 하면 됩니다.

1. `.env`에 `EXPO_PUBLIC_API_BASE_URL`을 배포된 API 주소로 설정 → `USE_MOCK_API`가 자동으로 꺼지고 `getLocations`가 실제 `GET /locations`를 호출합니다. (`src/shared/config/api.ts`)
2. 백엔드 응답이 명세와 다르면 **`src/entities/location/api/location.dto.ts`의 Zod 스키마/매퍼만 수정**합니다. 화면·쿼리 코드는 손대지 않습니다.
3. 화면에서 소비: `const { data } = useQuery(locationQueries.nearby({ latitude, longitude, radiusMeters }))`. 목/실제 모드와 무관하게 동일한 코드입니다. (`@/entities/location`)
4. 인증 헤더(`Authorization: Bearer <supabase_jwt>`)는 `src/shared/api` 클라이언트가 Supabase 세션에서 자동 주입하므로 화면 코드는 신경 쓸 필요가 없습니다.

`POST /notifications/geofence-enter`, `POST /auth/fcm-token` 등 다른 엔드포인트도 같은 원칙입니다: 각 `api` 세그먼트의 목 구현을 `apiRequest` 기반 실제 구현으로 바꾸거나, `USE_MOCK_API` 분기만 실제 경로로 태우면 됩니다.

---

## 6. 단계별 계획

각 단계는 **API 없이 만들 수 있는 것 / 목으로 두는 것 / 검증 방법**을 함께 적었습니다.

### 1단계 — API 경계와 스캐폴딩 (네이티브 빌드 불필요)
- `_app/providers`에 `QueryClient` + `QueryClientProvider` 최초 연결.
- `shared/api` HTTP 경계: Supabase JWT 헤더 주입, 공통 응답/에러 정규화, 목 스위치.
- `entities/location`: `Location` 도메인 타입, `locations.queries.ts`, 백엔드 시드 기반 목 데이터.
- API 계약을 Zod 스키마 + 타입으로 고정.
- **검증:** 기존 개발 환경에서 목 데이터로 `useQuery`가 목록을 반환하는지 확인(네이티브 모듈 불필요).

### 2단계 — 권한과 지오펜스 감지 (dev build 필요)
- `shared/lib/location`: 포그라운드/백그라운드 위치 권한(`requestForegroundPermissionsAsync` → `requestBackgroundPermissionsAsync`), `startGeofencingAsync`/`stopGeofencingAsync` 래퍼.
- `_app/routes/register-background-tasks.ts`: **최상위 스코프**에서 `TaskManager.defineTask`로 지오펜싱 태스크 정의(SDK 요구사항). 진입 시 `geofence-monitor`의 보고 함수 호출.
- `features/geofence-monitor`: `/locations`에서 받은 포인트 중 **가까운 N개만** 등록(iOS 20개·Android 100개 제한), 진입 이벤트 → `report-geofence-enter`(목) 호출, 가벼운 로컬 스로틀.
- **검증:** Android dev build + 시뮬레이터 위치 목킹으로 진입 이벤트 → 목 보고 호출 로그 확인.

### 3단계 — FCM 토큰 (react-native-firebase, Android dev build로 실검증)
- `@react-native-firebase/app` + `@react-native-firebase/messaging` 설치, config plugin 등록.
- `shared/lib/notifications`: 알림 권한 요청, `getToken()`, `onTokenRefresh`, `onMessage`(포그라운드 수신 → `expo-notifications` 로컬 알림 표시).
- `features/register-push-token`: 토큰 발급 → `register-fcm-token`(목) 호출, 토큰 갱신 시 재등록.
- **검증:** Android dev build에서 실제 FCM 토큰 발급 확인, Firebase 콘솔 테스트 발송으로 포그라운드/백그라운드 수신 확인. 등록 API는 목(성공 응답 + 로그)까지.

### 4단계 — 알림 설정 UI
- `pages/settings`의 기존 프로토타입 알림 섹션(수신 토글, 빈도)을 `features/notification-settings`와 연결.
- `notification_enabled`, `quiet_start`, `quiet_end`, `interests`를 편집. 초기엔 로컬 상태/스토어로 두고, `PATCH /auth/me`가 준비되면 뮤테이션으로 전환.
- **검증:** 값 변경이 상태에 반영·유지되는지 확인. (현재는 리마운트 시 초기화되는 프로토타입 — `docs/features/settings.md` 참고.)

### 5단계 — 네이티브 설정 마무리와 iOS 검증
- `app.json`에 `expo-location`, `expo-notifications`, `@react-native-firebase/app` 플러그인 등록, iOS는 `expo-build-properties`로 `useFrameworks: "static"` 설정.
- 권한/설정 추가: Android `ACCESS_BACKGROUND_LOCATION` + `POST_NOTIFICATIONS`, iOS `UIBackgroundModes`(location, remote-notification) 및 `NSLocationAlwaysAndWhenInUseUsageDescription` 문구 정비.
- `google-services.json`(Android) / `GoogleService-Info.plist`(iOS) 추가, iOS APNs 키를 Firebase에 업로드.
- **검증:** iOS는 로컬 빌드 불가(아래 제약 참고)이므로 **EAS Build**로 dev build 생성 후 검증.

---

## 7. 네이티브 설정 체크리스트 (Firebase 미설정 상태)

Firebase는 아직 설정 전이므로, 실제 FCM 토큰 발급은 아래가 갖춰진 뒤에만 가능합니다. 그 전까지 3단계의 토큰 등록부는 목/스텁으로 두고 나머지를 먼저 진행합니다.

- [ ] Firebase 프로젝트 생성, Android 앱(`com.anonymous.snaplyapp`) 등록 → `google-services.json`
- [ ] Firebase iOS 앱 등록 → `GoogleService-Info.plist`
- [ ] iOS APNs 인증 키(.p8)를 Firebase Cloud Messaging 설정에 업로드
- [ ] `app.json` 플러그인/권한 추가 및 네이티브 매니페스트 반영(현재 `app.json`엔 위치·알림 관련 항목이 없고, iOS/Android 네이티브 폴더엔 전경 위치 권한만 수동 추가돼 있어 불일치 상태 — prebuild로 동기화 필요)

> 파일 배치 위치: `google-services.json`은 `app.json`의 `expo.android.googleServicesFile`, `GoogleService-Info.plist`는 `expo.ios.googleServicesFile`로 지정합니다. 네이티브 폴더가 이미 존재하므로 `app.json` 변경은 `expo prebuild` 후에만 반영됩니다.

---

## 8. 테스트/검증 환경 제약

| 플랫폼 | dev build | 비고 |
| --- | --- | --- |
| Android | `expo run:android` 로컬 빌드 가능 | 지오펜스·실제 FCM 수신까지 로컬에서 검증 가능. 권장 주 검증 환경. |
| iOS | 로컬 빌드 불가 → **EAS Build** | Xcode 16.4가 SDK 57 네이티브 빌드에 부족(Swift 6.2 필요). iOS는 EAS로만 dev build/검증. |
| Expo Go | 사용 불가(3단계 이후) | `@react-native-firebase/messaging`가 네이티브 모듈이라 Expo Go에서 동작 안 함. |

로직·UI는 크로스플랫폼으로 한 번만 작성하고, 실검증만 위 환경 제약을 따릅니다.

### 검증 현황 (2026-07-21 기준)

| 항목 | Android | iOS |
| --- | --- | --- |
| 네이티브 config 컴파일 (`expo-location` 플러그인, background location, `expo-task-manager`) | ✅ 실기기(갤럭시 S22 Ultra, Android 16) dev build 성공 | ⏳ 미검증 |
| 앱 부팅 (크래시 없음) | ✅ | ⏳ 미검증 |
| 권한 요청 → 지오펜스 시작 → 진입 → mock 보고 e2e (2단계) | ✅ 실기기에서 전 구간 로그 확인 | ⏳ 미검증 |
| FCM 토큰 발급(RNFirebase) → 등록(mock) e2e (3단계) | ✅ 실기기에서 142자 토큰 발급·등록 확인 | ⏳ 미검증 |

> **iOS는 실기기 테스트가 필요합니다.** 현재 iOS 공기계가 없어 검증하지 못했습니다. iOS는 로컬 네이티브 빌드도 불가하므로(Xcode 제약), **EAS Build로 dev build를 만들어 실제 iOS 기기에서** 권한 흐름·지오펜싱·진입 이벤트·FCM 수신을 확인해야 합니다. iOS 시뮬레이터는 백그라운드 위치/지오펜싱·푸시 동작이 실기기와 다르므로 실기기 검증이 원칙입니다. app.json의 `expo-location` 플러그인이 iOS plist 문구와 `UIBackgroundModes:location`도 설정하지만, 이 역시 EAS 빌드 산출물에서만 확인 가능하며, iOS FCM 수신은 **APNs `.p8` 키를 Firebase에 업로드**해야 동작합니다.
>
> **Android 알림 표시 주의:** `POST_NOTIFICATIONS`(Android 13+)는 매니페스트에 선언돼 있으나 런타임 부여가 필요합니다. FCM **토큰 발급·데이터 메시지 수신**은 이 권한 없이 되지만, **알림을 트레이에 표시**하려면 사용자가 권한을 허용해야 합니다(포그라운드 로컬 표시 포함 — 4단계/실사용에서 처리).

---

## 9. 결정·확인이 필요한 미해결 사항

- **백엔드 토큰 형식 재확인:** 서버가 `POST /auth/fcm-token`에서 raw FCM 토큰을 받는지(권장) 최종 확인.
- **지오펜스 포인트 갱신 주기:** `/locations`를 언제 다시 불러 등록 지오펜스를 갱신할지(앱 포그라운드 복귀 시 / 위치 크게 이동 시 등).
- **클라이언트 로컬 스로틀 정책:** 서버 30분 쿨다운과 별개로 앱이 진입 보고를 얼마나 억제할지.
- **`interests`(관심사) UI:** 알림 개인화에 쓰이는 관심사 편집을 설정에 포함할지 범위 결정.

---

## 관련 문서

- 상태·데이터 배치 규칙: `docs/frameworks/state-and-data.md`
- FSD 계층: `docs/architecture/feature-sliced-design.md`
- 권한 처리 참고 구현: `src/pages/capture-record/model/use-recording-permissions.ts`
- 설정 화면 현재 동작: `docs/features/settings.md`
- Expo SDK 57 지오펜싱: https://docs.expo.dev/versions/v57.0.0/sdk/location/
