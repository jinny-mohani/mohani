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
- [x] Vercel(개인 계정) 프로젝트 `emotion-diary` — 이 브랜치를 Production으로 추적
      주소: https://emotion-diary-five-omega.vercel.app

## 남은 것 (순서대로)
1. (선택) 구글 정식 게시: 브랜딩에 홈페이지 = 배포 주소, 개인정보처리방침 = `/privacy.html`,
   승인된 도메인에 `emotion-diary-five-omega.vercel.app` 추가 → 대상 › 앱 게시
2. 4단계: 저장 함수를 Supabase로 교체 (localStorage/IndexedDB는 사용자별 오프라인 캐시, 로그아웃 시 삭제)
   - days 테이블에 `weather text` 열 추가 필요 (일간의 4칸은 '함께 느낀 감정'이 아니라 날씨: sun/cloud/rain/snow). `minis` 열은 더 이상 쓰지 않음
3. 5단계: A/B 두 계정 보안 테스트
4. 6단계: 서비스워커(오프라인) 추가 → 아이패드 홈 화면 추가 시험 (manifest·앱 아이콘(피그마 '앱아이콘' 8182:6093, 신기함)·이름 '덕덕 일기'는 완료)

## 메모
- 이 코드는 `jinny-mohani/mohani` 저장소의 `claude/pensive-knuth-ek4xm4` 브랜치에 있다.
  같은 저장소의 다른 브랜치에는 여행 앱(`claude/serene-hawking-ncajd5`)과 업무 기록이 있다.
- 빈 저장소 `jinny-mohani/emotion-diary`를 만들어 두었다(비공개). 개인 Claude 계정에서 이어 갈 때
  이 저장소로 옮기면 Vercel에서 저장소/브랜치도 함께 바꿔야 한다.
- 비밀 값(카카오·구글 시크릿, Supabase secret/service_role 키, DB 비밀번호)은 저장소에 넣지 않는다.
