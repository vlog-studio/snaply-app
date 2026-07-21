# Snaply

Snaply는 짧은 일상 영상을 기록하는 데일리 브이로그 앱입니다. 사용자는 기분과 촬영 시간(3초 또는 5초)을 선택하고, 카메라로 영상을 촬영한 뒤 원본을 확인할 수 있습니다. 이후 현재는 시뮬레이션으로 구현된 AI 편집 과정을 거쳐 결과 화면으로 이동합니다. 촬영한 영상은 앱의 로컬 문서 디렉터리에만 저장됩니다.

Expo SDK 57(React Native 0.86, Expo Router)을 사용하며, Feature-Sliced Design v2.1을 기준으로 프로젝트를 구성합니다.

## 시작하기

의존성을 설치하고 Expo Go 개발 서버를 실행합니다.

```bash
npm install
npx expo start --go
```

> **Xcode 16.4까지만 사용할 수 있는 구형 macOS 장비에서는 `npx expo run:ios`를 실행할 수 없습니다.** Expo SDK 57은 Swift 6.2 도구 모음이 필요하므로, 이 조건에 해당하는 장비에서는 iOS 시뮬레이터를 Expo Go로 실행하세요. 최신 macOS와 Swift 6.2를 지원하는 Xcode가 설치된 장비에는 이 제한이 적용되지 않습니다.

웹(`npm run web`)도 실행할 수 있지만 기준 개발 환경은 아닙니다. 웹에서는 영상 촬영 기능을 사용할 수 없습니다.

## 프로젝트 구조

`src/app/`의 파일은 Expo Router와 화면을 연결하는 얇은 어댑터입니다. 실제 애플리케이션 코드는 FSD 계층에 배치합니다.

```text
src/
├── app/        Expo Router 라우트 파일
├── _app/       Provider, 루트 Stack, Splash, 플랫폼별 탭 내비게이션
├── pages/      화면 조합과 화면 단위 상태
├── features/   재사용 가능한 사용자 행동
├── entities/   도메인 모델
└── shared/     디자인 토큰, 공용 UI, 플랫폼 어댑터
```

## 문서 구조

문서는 독자에 따라 다음과 같이 구분합니다.

| 위치 | 대상과 역할 |
| --- | --- |
| [`README.md`](README.md) | 개발자가 처음 확인하는 프로젝트 소개와 실행 안내 |
| [`docs/guides/`](docs/guides) | 개발자를 위한 설치, 실행, 디버깅 등의 실무 가이드 |
| [`AGENTS.md`](AGENTS.md) | 작업 유형에 맞는 에이전트 문서를 찾기 위한 색인과 공통 규칙 |
| [`docs/architecture/`](docs/architecture) | 아키텍처 원칙과 FSD 계층 기준 |
| [`docs/conventions/`](docs/conventions) | 모듈 경계, 코드 설계 및 작성 규칙 |
| [`docs/frameworks/`](docs/frameworks) | Expo Router와 상태·데이터 처리 규칙 |
| [`docs/workflows/`](docs/workflows) | 기능 개발, 검증, 브랜딩 변경 절차 |
| [`docs/features/`](docs/features) | 현재 사용자 기능, 구현 상태, 소유 계층 기록 |
| [`docs/migration/`](docs/migration) | 구조 이전 현황과 점진적 마이그레이션 규칙 |

### 개발자 가이드

- [`Android 실기기 무선 연동 가이드`](docs/guides/android-wireless-debugging.md): 실제 Android 기기의 Wi-Fi 디버깅 연결과 Expo Go 실행 방법
- [`Supabase 소셜 로그인 설정 가이드`](docs/guides/supabase-auth-setup.md): Google·Apple 로그인을 켜기 위한 `.env` 값, Supabase·Google·Apple 콘솔 설정, 개발 빌드 실행 절차
- [`위치 기반 FCM 알림 선행 개발 계획`](docs/guides/location-notifications-plan.md): 백엔드 API 이전에 프론트에서 만들 수 있는 범위, FSD 배치, 단계별 계획, 네이티브 설정 체크리스트
- [`FCM 푸시 알림 설정 가이드`](docs/guides/fcm-push-setup.md): 네이티브 FCM 토큰용 Firebase 프로젝트·앱 등록, `google-services.json`/`GoogleService-Info.plist`/APNs 준비 절차

에이전트용 문서는 [`AGENTS.md`](AGENTS.md)에서 작업 유형별로 찾을 수 있습니다.

## 주요 명령어

| 명령어 | 용도 |
| --- | --- |
| `npx expo start --go` | 기본 개발 환경인 Expo Go용 Metro 서버 실행 |
| `npm run web` | 웹 환경 실행(기준 개발 환경 아님) |
| `npm run lint` | ESLint 검사 실행 |
| `npx tsc --noEmit` | TypeScript 타입 검사 실행 |
