# 감정 일기 웹앱 — Claude Code 작업 안내

## 목표
- 지금의 감정 일기(아이패드 가로형 웹앱)를 **친구들도 각자 쓰는 웹앱**으로 만든다.
- 사용자마다 **자기 일기만** 보이고 쓸 수 있다. 다른 사람 일기는 볼 수 없다(공유·협업 기능 없음).
- 아이패드 Safari에서 '홈 화면에 추가'해 앱처럼 쓴다(PWA).

## 지금 있는 것 (이 폴더)
- `index.html`: 완성된 단일 파일 웹앱(이미지까지 모두 포함). 바로 열어볼 수 있는 기준 결과물.
- `template.html`: 원본 코드. `__이름__` 자리에 `assets/`의 이미지가 들어간다.
- `build.py`: `template.html` + `assets/` → `index.html`을 만드는 스크립트.
- `assets/`: 피그마에서 뽑은 화면 배경, 감정 스티커 40개(`stickers_png.json`), 화면 양옆을 채우는 가장자리 이미지.

화면: 표지, 내 소개, 감정 소개(2쪽), 감정 기록(3쪽), 2026년 11·12월 월간, 일간(2쪽 펼침), 메모(줄/모눈, 여러 장).
기능: 날짜 → 스티커 팝업, 키보드/애플펜슬 손글씨(펜슬만 그림, 손가락 무시), 스와이프로 넘기기, 버튼 눌림 효과.

## 바꿀 것
1. **저장소 교체**: 지금은 브라우저(localStorage·IndexedDB) + claude.ai 전용 저장(`claude.use("db")`)을 쓴다.
   이것을 **Supabase**(로그인 + DB + 파일 저장)로 바꾼다. `claude.use(...)` 코드는 모두 제거한다.
2. **로그인**: Supabase Auth — 카카오 / 구글 로그인. 첫 화면에 로그인 버튼(피그마 표지 위에 얹기).
3. **권한(가장 중요)**: 모든 테이블에 RLS(Row Level Security)를 켜고 `user_id = auth.uid()`인 행만 읽기·쓰기 허용.
   Storage 버킷도 `{user_id}/...` 경로만 본인이 접근하도록 정책 설정.
4. **배포**: Vercel(또는 Netlify)에 올리고, `manifest.json` + 아이콘으로 PWA 설정.

## 데이터 구조 (제안)
| 테이블 | 열 |
|---|---|
| `stickers` | user_id, date, sticker_id — (user_id, date) 고유 |
| `days` | user_id, date, tags(text[]), feel, tmr, minis(text[]), ink_path, updated_at |
| `records` | user_id, page(1~3), fields(jsonb), ink_path, updated_at |
| `profile` | user_id, name, answers(text[]), photo_path, updated_at |
| `memos` | user_id, id, sort, type('line'/'dot'), text, ink_path, updated_at |

손글씨와 프로필 사진은 PNG/JPEG 파일로 Storage 버킷 `ink`에 `{user_id}/day-2026-11-05.png` 형식으로 저장.

## 지켜야 할 것
- 화면은 피그마 그대로(1024×680 무대를 화면 크기에 맞춰 확대/축소, 가운데 정렬, 양옆은 배경 이어짐).
- 오프라인에서도 쓸 수 있게 로컬 저장은 유지하고, 온라인이 되면 Supabase와 동기화(최신 `updated_at` 우선).
- 스티커 이름·순서는 피그마 '감정' 섹션 원본 컴포넌트 기준(01 기쁨 ~ 40 멍하다).
- 폰트: 학교안심 폰트 파일을 직접 넣을 수 있으면 넣는다(지금은 Jua·Gaegu로 대체).

## 작업 순서
1. `template.html`을 `index.html` / `style.css` / `app.js`로 나누고 Vite 프로젝트로 정리
2. Supabase 프로젝트 생성, 테이블·RLS·Storage 정책 SQL 작성
3. 로그인 화면 + 세션 유지
4. 저장 함수(save/pull)를 Supabase로 교체
5. 두 계정으로 테스트: A의 일기가 B에게 절대 보이지 않는지 확인
6. Vercel 배포 + PWA 설정 → 아이패드에서 홈 화면 추가 테스트

## 함께 읽을 문서
- `HANDOFF.md`: 자세한 인수인계(화면, 코드 구조, 정한 것, 완료 기준)
- `PROMPT.md`: 단계별 프롬프트
