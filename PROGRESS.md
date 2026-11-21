# 진행 상황 (2026-11-19 저녁 기준)

다음 세션에서 이 파일부터 읽고 이어서 진행한다.

## 끝난 것
- [x] 1단계: Vite 프로젝트로 분리 (기준본 `original/index.html`과 픽셀 단위 동일 확인)
- [x] 2단계: `supabase/schema.sql` 실행 완료 — 테이블 5개 RLS on, authenticated 권한은 SELECT/INSERT/UPDATE/DELETE만, `ink` 비공개 버킷
- [x] 3단계(코드): 표지 위 로그인 카드(신기함·덕덕 일기·카카오/구글 버튼·개인정보처리방침 링크), 내 소개 왼쪽 위 로그아웃
- [x] Supabase Auth: Kakao·Google provider ENABLED, URL Configuration
      (Site URL은 배포 주소로 바꾸는 중, Redirect URLs: `http://localhost:5173/**`, `https://emotion-diary-five-omega.vercel.app/**`)
- [x] 카카오 앱 '덕덕 일기': 카카오 로그인 ON, 리다이렉트 URI = Supabase callback, 클라이언트 시크릿 재발급 후 Supabase에 입력
- [x] 카카오 KOE205(account_email) 해결: 앱 아이콘 등록 → 개인 개발자 비즈 앱 전환(본인인증) →
      동의항목 이메일 '선택 동의'(정보 수집 후 제공 체크 안 함). 닉네임·프로필 사진 외 항목은 사용 안 함
- [x] **배포 주소에서 카카오·구글 로그인 성공 확인**
- [x] 구글 OAuth: 프로젝트 `emotion-diary`, 클라이언트 `supabase`(웹), 게시 상태 '테스트 중' + 테스트 사용자 등록
- [x] **4단계: Supabase 저장/동기화** (실제 Supabase + 테스트 계정으로 확인)
      - 기기별·사용자별 로컬 저장(emodiary.<uid>.*) → 올릴 목록(dirty) → 온라인이면 업로드, 실패 시 재시도
      - 로그인/앱 복귀 시 내려받기, 행마다 updated_at 최신 우선. 손글씨·사진은 ink 버킷 {uid}/...
      - 로그아웃: 먼저 올리고(남으면 경고) 이 기기의 내 데이터 삭제
      - 확인: 2기기 동기화(스티커·글·날씨·손글씨·기록·소개·메모), 오프라인→재연결, 스티커 떼기, 로그아웃 후 B 계정에 A 흔적 없음
      - migration 001(days.weather) 실행 완료
- [x] **5단계: A/B 보안 테스트: 공격 33가지 모두 차단, 확인 3가지 정상** (docs/security-test.md)
- [x] **6단계: 오프라인** — vite-plugin-pwa 서비스워커(앱 화면 89개 파일 미리 저장, 구글 글꼴 런타임 저장, Supabase 요청은 건드리지 않음).
      확인: 인터넷 끊고 새로고침해도 월간·스티커·글꼴·일기 표시 / 만료된 토큰으로 오프라인 열기 가능 / 재연결 시 토큰 갱신·업로드 / privacy.html 정상
- [x] Vercel(개인 계정) 프로젝트 `emotion-diary` — 이 브랜치를 Production으로 추적
      주소: https://emotion-diary-five-omega.vercel.app

## 남은 것 (순서대로)
1. (선택) 구글 정식 게시: 브랜딩에 홈페이지 = 배포 주소, 개인정보처리방침 = `/privacy.html`,
   승인된 도메인에 `emotion-diary-five-omega.vercel.app` 추가 → 대상 › 앱 게시
2. (선택) 테스트 계정 정리: test-a/test-b@duckduck.test 데이터·계정 삭제
3. 아이패드 실기기 시험: 홈 화면 추가 → 전체 화면·로그인 유지·비행기 모드·애플펜슬

## 메모
- 이 코드는 `jinny-mohani/mohani` 저장소의 `claude/pensive-knuth-ek4xm4` 브랜치에 있다.
  같은 저장소의 다른 브랜치에는 여행 앱(`claude/serene-hawking-ncajd5`)과 업무 기록이 있다.
- 빈 저장소 `jinny-mohani/emotion-diary`를 만들어 두었다(비공개). 개인 Claude 계정에서 이어 갈 때
  이 저장소로 옮기면 Vercel에서 저장소/브랜치도 함께 바꿔야 한다.
- 비밀 값(카카오·구글 시크릿, Supabase secret/service_role 키, DB 비밀번호)은 저장소에 넣지 않는다.

- 이 클라우드 환경은 네트워크 허용 도메인에 `llewtihbcejijrjqpttk.supabase.co`를 추가해 두었다(실제 DB 시험 가능). Node fetch는 `NODE_USE_ENV_PROXY=1` 필요.

## 2026-11-20 추가 수정
- 로그아웃 확인 팝업을 앱 디자인으로 교체 (`ask()` 함수, 저장 안 된 게 있으면 경고 팝업 한 번 더)
- 내 소개: '감정 소개' · '나의 감정 기록' 아래에 실제 화면 그림 6장으로 사용법 안내 (`public/assets/guide/`, 누르면 해당 화면으로)
- 내 소개 손글씨 (`#meInk`, 왼쪽 카드 위) → Storage `{user_id}/profile-ink.png`, `profile.ink_path`
  - **Supabase에서 `supabase/migrations/002_profile_ink.sql` 실행 필요** (실행 전에는 손글씨만 기기에 남고 나머지는 정상 저장)
- 감정 기록: 답 칸이 질문 글자와 겹치던 문제 수정 (원본부터 있던 위치 오류, 질문 아래 첫 점선부터 3줄)

## 2026-11-21 화면 밀림 수정
- 증상: 아이패드에서 가끔 무대가 왼쪽 위로 밀린 채 남음(앱을 다시 켜도 그대로인 날도 있음).
- 원인: iOS가 키보드·확대 동작 때 페이지(body) 자체를 스크롤해 두고, 키보드가 내려가도 되돌리지 않음. 스크롤 위치는 앱을 다시 열 때 복원되기도 함.
- 수정: body 고정(position:fixed), 창/body 스크롤 감지 시 (0,0)으로 복귀, 포커스 해제·앱 복귀·화면 크기 변경 때 다시 맞춤, 스크롤 위치 복원 끔, 두 손가락 확대 막음.
