# 감정 일기 웹앱 — 인수인계 문서

> 작성: 2026-11-19 · 디자인/기획: 허진희(지니) · 원본 피그마: `Re_작업중 (지니)` 파일의 `감정일기_플래너` 페이지
> 이 문서는 Claude(Cowork)에서 만든 시제품을 Claude Code로 옮겨 **여러 명이 각자 쓰는 웹앱**으로 만들기 위한 인수인계 자료입니다.

---

## 1. 한 줄 요약
아이패드 가로 화면용 **감정 일기 플래너** 웹앱. 피그마 화면을 그대로 옮겼고, 날짜에 감정 스티커를 붙이고, 키보드와 애플펜슬로 일기를 쓴다.
지금은 claude.ai 아티팩트(단일 HTML)라서 **claude.ai 계정이 있어야만** 열 수 있다. 이것을 **친구들이 각자 로그인해서 자기 일기만 쓰는 웹앱**으로 바꾸는 것이 목표다.

## 2. 왜 만들었나 (사용자 문제)
굿노트 + PDF 플래너로 쓸 때의 불편함을 없애기 위해 만들었다.

| 굿노트에서 불편했던 점 | 이 앱에서 해결한 방식 |
|---|---|
| 이미지 썸네일이 작아 고르기 어려움 | 스티커 팝업에서 이름과 함께 크게 보여줌 |
| 스티커를 매번 잘라야 함 | 투명 배경 스티커를 미리 준비 |
| 달력 칸에 위치 맞추기 어려움 | 날짜를 누르면 칸 정중앙에 자동으로 붙음 |
| 스티커 하나 붙이는 데 지침 | 날짜 누르기 → 스티커 누르기, 2번이면 끝 |
| 손글씨가 힘듦 | 키보드 입력 + 펜슬 손글씨(필요할 때만) |

## 3. 파일 구성
```
emotion-diary/
├─ index.html        ← 완성본(이미지까지 모두 들어간 단일 파일, 약 1.9MB). 기준 결과물.
├─ template.html     ← 원본 코드. __이름__ 자리에 assets의 이미지가 들어감
├─ build.py          ← template.html + assets → index.html 생성
├─ CLAUDE.md         ← Claude Code가 먼저 읽는 짧은 작업 안내
├─ HANDOFF.md        ← 이 문서
├─ PROMPT.md         ← Claude Code에 붙여 넣을 프롬프트
└─ assets/
   ├─ stickers_png.json   감정 스티커 40개(이미지 + 정중앙 정렬 값)
   ├─ nov_*.webp / dec_*.webp   월간(11월 갈색 / 12월 회색) 화면 조각
   ├─ nov_daily.webp / dec_daily.webp   일간 배경
   ├─ rec1~3.webp    감정 기록 3쪽
   ├─ intro1~2.webp  감정 소개 2쪽
   ├─ cover.webp / profile.webp   표지 / 내 소개
   ├─ memoLine.webp / memoDot.webp   메모(줄 / 모눈)
   ├─ *_edgeL.png / *_edgeR.png      넓은 화면 양옆을 채우는 가장자리 띠
   └─ rec_bg.webp, *_bg.webp          배경 질감
```

## 4. 화면과 기능

| 화면 | 피그마 노드 | 기능 |
|---|---|---|
| 표지 | 7879:19322 | 아무 곳이나 누르면 이번 달 월간으로 |
| 내 소개 | 7879:19227 | 사진(사진첩 선택·지우기), 이름, 질문 4개, 2026년 11·12월 작은 달력(스티커가 있으면 숫자 대신 스티커, 누르면 그날 일기), 감정 소개·기록 바로가기 |
| 감정 소개 | 7879:24663, 24748 | 보기 전용 2쪽 |
| 감정 기록 | 7879:24166, 24357, 24521 | 질문 40개(3쪽), 질문마다 3줄 입력 + 펜 |
| 월간 | 11월 7879:24773(갈색) / 12월 7879:24100(회색) | 날짜 → 스티커 팝업 → 칸 정중앙에 붙음. 붙은 칸은 바꾸기·떼기. 일기를 쓴 날은 작은 점 |
| 일간 | 11월 7879:24845 / 12월 7879:24909 | 2쪽 펼침(이틀). 대표 감정, 해시태그 3, 함께 느낀 감정 4칸, 오늘 느낀 감정(7줄), 내일 기대되는 일(3줄), 펜 |
| 메모 | 줄 7879:25002 / 모눈 7879:17883 | 여러 장. 제목 옆 아이콘으로 줄/모눈 전환. 마지막 장에서 다음으로 넘기면 새 장(빈 장은 안 만듦) |

**공통 기능**
- **화면 맞춤:** 1024×680 무대를 화면 크기에 맞춰 확대·축소하고 가운데에 둔다. 넓은 화면의 양옆은 배경이 이어지게 채운다.
- **넘기기:** 좌우 화살표 + 스와이프. 손가락은 항상 넘기고, 펜슬은 키보드 모드에서만 넘긴다.
- **펜 도구:** [가 | ✎] 모드 전환, 색상 말풍선(4색, 선택한 색 표시), 지우개, 되돌리기(Lucide 아이콘, 18px, 선 두께 2).
- **손바닥 무시:** 펜 모드에서는 `pointerType === "pen"`만 그린다. 손가락은 넘기기에만 쓴다.
- **눌림 효과:** 모든 버튼이 86% → 106% → 100%로 튕긴다(340ms).
- **상단 메뉴(GNB):** 피그마 이미지 위에 보이지 않는 터치 영역을 얹은 방식이다.

## 5. 코드 구조 (template.html)
단일 HTML 안에 CSS와 JS가 모두 들어 있다. 프레임워크는 쓰지 않았다(바닐라 JS).

| 구역 | 주요 함수 / 변수 |
|---|---|
| 화면 맞춤 | `fit()`: `#stage` scale, CSS 변수 `--sh`, `--sy`(양옆 띠 위치) |
| 화면 전환 | `setView(v)`: month / day / rec / intro / cover / me / memo, `showMonth`, `openDay`, `openRec`, `openIntro`, `openCover`, `openMe`, `openMemo` |
| 스티커 | `STICKERS`(pos / neg / mix), `BY_ID`, `svgOf(id)`: 이미지를 몸통 중심 기준 정중앙에 배치 |
| 팝업 | `openSheet(key, type, idx)`: type은 main(대표 감정) 또는 mini(함께 느낀 감정), `apply`, `pick` |
| 일간 | `pages[]`, `renderDay(force)`, `dayStep`, `dayOf`, `saveDay`, `pullDay` |
| 손글씨 | `setupInk(pad)`, `drawStroke`, `redraw`, `commitInk`, `loadInk`. pad는 일간 2쪽 / `recPad` / `memoPad` |
| 저장(로컬) | localStorage 키 `emodiary.v1`(스티커), `emodiary.days`, `emodiary.rec`, `emodiary.me`, `emodiary.memo` / IndexedDB `emodiary`의 `ink` 저장소(손글씨·사진 dataURL) |
| 저장(클라우드) | `claude.use("db")` → `data/users/<id>/`의 문서 `diary`, `day-YYYY-MM-DD`, `rec-1~3`, `profile`, `memo`, `memo-<id>` ← **이 부분을 Supabase로 교체** |
| 스와이프 | `attachSwipe(stage, onPrev, onNext)`, 스와이프 직후 300ms 동안 클릭 무시 |

**좌표 규칙**
모든 위치는 피그마 프레임 좌표(px)를 그대로 쓴다. 예: 일간 대표 감정 칸은 `left:214 top:136 98×90`. 피그마를 고치면 좌표도 같이 확인한다.

## 6. 지금까지 정한 것 (바꾸지 말 것)
- **스티커 원본:** 반드시 피그마 **'감정' 섹션(7879:17049)의 원본 컴포넌트(68×68)** 기준이다. 스티커 시트(감정 스티커01·02·03)는 크기가 감정마다 다르게 늘어나 있고, 복합 감정 이름표도 틀렸다. 쓰지 말 것.
- **스티커 순서·이름:** 01 기쁨 … 14 따뜻함(긍정) / 15 아쉬움 … 31 불편(부정) / 32 놀람, 졸립다, 신기함, 편안, 부러움, 미안함, 혼란, 궁금함, 40 멍하다(복합).
- **스티커 크기:**

| 위치 | 크기 |
|---|---|
| 월간 칸 | 54px |
| 일간 대표 감정 | 70px |
| 작은 칸 | 22px |
| 팝업 | 46px, 이름 14px |
| 감정 소개 | 58px |
| 감정 기록 | 38px |

- **스티커 배치:** 회전 없이 똑바로 붙인다(기울이면 찌그러져 보인다는 피드백).
- **글자 크기:** 일간 날짜 '11월 20일 금'(14px, 테이프 정중앙), 월간 날짜 숫자 13px.
- **글씨 폰트:** 일기 글씨는 Gaegu, UI는 Jua(학교안심 폰트 대체). 직접 배포하면 학교안심 폰트로 교체를 검토한다(라이선스 확인).
- **연도:** 2026년 11·12월만 있다. 다른 달은 아직 없다.

## 7. 이번 작업 범위 (Claude Code)
1. 코드 정리: Vite 프로젝트, html / css / js 분리, 이미지는 `public/assets`로
2. **Supabase**: Auth(카카오·구글), Postgres + RLS, Storage
3. 저장 계층 교체: 지금의 localStorage / IndexedDB는 **오프라인 캐시**로 유지하고, Supabase와 동기화(`updated_at`이 최신인 쪽 우선)
4. 로그인 화면(표지 위), 로그아웃(내 소개 화면 어딘가)
5. Vercel 배포 + PWA(manifest, 아이콘, 홈 화면 전체 화면)

### 데이터 구조 (제안)
```sql
stickers (user_id uuid, date date, sticker_id text, updated_at timestamptz, primary key (user_id, date))
days     (user_id uuid, date date, tags text[], feel text, tmr text, minis text[], ink_path text, updated_at timestamptz, primary key (user_id, date))
records  (user_id uuid, page int, fields jsonb, ink_path text, updated_at timestamptz, primary key (user_id, page))
profile  (user_id uuid primary key, name text, answers text[], photo_path text, updated_at timestamptz)
memos    (user_id uuid, id text, sort int, type text, text text, ink_path text, updated_at timestamptz, primary key (user_id, id))
```
- 모든 테이블에 RLS를 켠다. 정책: `using (user_id = auth.uid()) with check (user_id = auth.uid())`
- Storage 버킷 `ink`(비공개): 경로는 `{user_id}/day-2026-11-05.png`, `{user_id}/rec-1.png`, `{user_id}/memo-<id>.png`, `{user_id}/profile.jpg`. 정책은 경로 첫 폴더가 `auth.uid()`인 경우만 허용한다.

## 8. 완료 기준 (테스트)
- [ ] `index.html`(기준본)과 화면이 똑같다: 아이패드 1180×820, 1024×768, 넓은 화면 1366×768
- [ ] A 계정과 B 계정이 서로의 스티커·일기·손글씨·사진·메모를 **절대 볼 수 없다** (API를 직접 호출해도)
- [ ] 비행기 모드에서 쓰고 → 다시 연결하면 동기화된다
- [ ] 아이패드 Safari에서 홈 화면에 추가 → 전체 화면으로 열리고 로그인이 유지된다
- [ ] 애플펜슬: 펜 모드에서 펜슬만 그려지고, 손바닥은 무시되고, 손가락 스와이프로 넘어간다

## 9. 알려진 한계 / 다음에 할 일
- 메모 장 지우기 기능이 없다
- 2026년 11·12월 외의 달이 없다(달력 화면 자동 생성 필요)
- 상단 메뉴가 이미지라서 눌림 효과가 없다. 웹으로 다시 만들면 가능하다
- 시작 화면이 월간이다(표지부터 시작할지 결정 필요)
- 감정 기록 2쪽 '황당' 질문의 배경 글자가 '황당하다'로 다른 감정과 표기 방식이 다르다(피그마)
- 내 소개의 '나의 감정 기록' 설명 문구가 '감정 소개'와 같다(피그마)
