# FCM 푸시 알림 설정 가이드 (네이티브 FCM 토큰)

> 이 문서는 사람 개발자를 위한 한글 가이드입니다. 에이전트용 문서가 아니므로 `AGENTS.md` 색인에 포함하지 않습니다.
> 전체 위치 알림 기능의 선행 개발 계획과 단계는 [`location-notifications-plan.md`](location-notifications-plan.md)를 참고하세요. 이 문서는 그중 **3단계(FCM 토큰)** 의 Firebase 준비 작업만 다룹니다.

이 앱은 **네이티브 FCM 토큰** 방식(`@react-native-firebase/messaging`)을 사용합니다. Firebase 프로젝트 등록과 설정 파일이 있어야 토큰을 발급받을 수 있고, **이 파일들이 없으면 Android 빌드 자체가 실패**하므로, 아래 준비 작업이 코드 배선보다 먼저입니다.

---

## 왜 이 과정이 필요한가

- **백엔드가 Firebase Admin SDK로 FCM을 발송한다.** 앱은 기기의 raw FCM 토큰을 받아 `POST /auth/fcm-token`으로 서버에 등록하고, 서버는 그 토큰으로 `admin.messaging().send({ token })`을 호출합니다. 백엔드는 Expo를 몰라도 표준 FCM 흐름 그대로 동작합니다.
- **네이티브 FCM 토큰을 받으려면 Firebase에 앱을 등록해야 한다.** Firebase가 발급하는 `google-services.json`(Android) / `GoogleService-Info.plist`(iOS)에 프로젝트·앱 식별자가 들어 있고, 네이티브 SDK가 이 값으로 FCM에 연결합니다.
- **iOS는 APNs를 거친다.** iOS 푸시는 Apple의 APNs를 통해서만 전달되므로, Firebase에 APNs 인증 키를 등록해야 실제 수신이 됩니다(백엔드가 아니라 Firebase↔APNs 설정).
- **Expo Go에서는 동작하지 않는다.** `@react-native-firebase/messaging`는 네이티브 모듈이라 dev build가 필수입니다.

---

## 개발자가 준비해야 하는 것 (요약)

| 항목 | 어디서 | 배치 위치 | 필수 |
| --- | --- | --- | --- |
| Firebase 프로젝트 | [Firebase Console](https://console.firebase.google.com) | — | ✅ |
| `google-services.json` (Android) | Firebase → Android 앱 등록 후 다운로드 | 레포 루트 `./google-services.json` | ✅ (Android) |
| `GoogleService-Info.plist` (iOS) | Firebase → iOS 앱 등록 후 다운로드 | 레포 루트 `./GoogleService-Info.plist` | iOS 쓸 때 |
| APNs 인증 키 `.p8` | Apple Developer → Keys | Firebase → 프로젝트 설정 → Cloud Messaging 에 업로드 | iOS 실수신 시 |

> **앱 식별자는 이미 정해져 있습니다** (`app.json` 기준): Android `package` / iOS `bundleIdentifier` 모두 **`com.anonymous.snaplyapp`**. Firebase 앱 등록 시 이 값을 그대로 입력하세요.

> **`google-services.json`은 비밀 키가 아닙니다**(클라이언트에 배포되는 공개 설정). 다만 프로젝트 식별자가 담기므로 팀 정책에 따라 커밋 여부를 정하면 됩니다. 커밋하지 않는다면 로컬 루트에 두고, EAS 빌드에는 [EAS 파일 환경변수](https://docs.expo.dev/eas/environment-variables/)로 제공해야 합니다. FCM 자체는 SHA-1 지문이 필요 없습니다(그건 Google 로그인·Dynamic Links용).

---

## 1. Firebase 프로젝트 만들기

1. [Firebase Console](https://console.firebase.google.com)에서 프로젝트를 생성합니다(기존 프로젝트 재사용 가능).
2. 좌측 **빌드 → Cloud Messaging** 이 사용 가능한지 확인합니다(별도 요금 없음).

## 2. Android 앱 등록 → `google-services.json`

1. 프로젝트 개요 → **앱 추가 → Android**.
2. **Android 패키지 이름**에 `com.anonymous.snaplyapp` 입력. (앱 닉네임·SHA-1은 선택, FCM엔 불필요)
3. **`google-services.json` 다운로드** → 레포 루트에 `google-services.json`으로 저장.

## 3. iOS 앱 등록 → `GoogleService-Info.plist` (iOS 필요 시)

1. 프로젝트 개요 → **앱 추가 → iOS**.
2. **Apple 번들 ID**에 `com.anonymous.snaplyapp` 입력.
3. **`GoogleService-Info.plist` 다운로드** → 레포 루트에 저장.

## 4. APNs 키 등록 (iOS 실수신 필요 시)

1. [Apple Developer → Certificates, Identifiers & Profiles → Keys](https://developer.apple.com/account/resources/authkeys/list)에서 **APNs 인증 키(.p8)** 를 생성하고 Key ID를 기록합니다(팀 ID도 필요).
2. Firebase → **프로젝트 설정 → Cloud Messaging → Apple 앱 구성**에 `.p8` 키, Key ID, 팀 ID를 업로드합니다.

> iOS는 이 앱 기준 **로컬 네이티브 빌드가 불가**하고 실기기 공기계도 아직 없어, 실제 수신 검증은 **EAS Build + 실제 iOS 기기**에서 진행합니다. (자세한 검증 제약은 [`location-notifications-plan.md`](location-notifications-plan.md) §8 참고)

---

## 5. 파일 확보 후 — 코드/설정 배선 (에이전트가 진행)

`google-services.json`이 레포 루트에 놓이면, 다음 작업을 이어서 진행합니다. **이 단계 전에는 패키지를 설치하지 않습니다**(설정 파일 없이 설치하면 Android 빌드가 깨짐).

1. 패키지 설치: `npx expo install @react-native-firebase/app @react-native-firebase/messaging expo-build-properties`
2. `app.json` 반영:
   - `expo.android.googleServicesFile: "./google-services.json"`, `expo.ios.googleServicesFile: "./GoogleService-Info.plist"`
   - `plugins`에 `"@react-native-firebase/app"` 추가
   - `expo-build-properties` 플러그인으로 iOS `useFrameworks: "static"` + `ios.forceStaticLinking: ["RNFBApp", "RNFBMessaging"]`
3. `shared/lib/notifications` 어댑터: `getToken`, `onTokenRefresh`, `onMessage`(포그라운드 수신 → `expo-notifications`로 로컬 알림 표시), iOS `requestPermission`/`registerDeviceForRemoteMessages`
4. `features/register-push-token`: 토큰 발급 → `registerFcmToken`(이미 작성됨, 현재 mock) 호출, 토큰 갱신 시 재등록
5. `expo prebuild --clean` 후 Android dev build로 검증: 실제 FCM 토큰 발급 + Firebase 콘솔 테스트 발송으로 포그라운드/백그라운드 수신 확인

---

## 지금까지 준비된 코드

- `src/features/register-push-token/api/register-fcm-token.ts` — `POST /auth/fcm-token` 등록 요청(현재 mock, API 나오면 자동 실호출). RNFirebase에 의존하지 않아 빌드 안전.
- 나머지(토큰 발급 어댑터·플러그인·네이티브 설정)는 위 5단계에서 Firebase 파일 확보 후 배선.

---

## 관련 문서

- [`location-notifications-plan.md`](location-notifications-plan.md) — 위치 알림 전체 선행 개발 계획과 단계별 로드맵
- React Native Firebase (Expo): https://rnfirebase.io
