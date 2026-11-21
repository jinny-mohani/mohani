# 함께 가요! — 작업 규칙

친구와 함께 쓰는 여행 앱(PWA). 데이터는 구글 시트 + Apps Script.

## 참고 문서 (작업 전 항상 확인)
- `docs/기획안.md` — 설계도. 기능·화면·데이터 구조의 기준. 구현하면서 바뀐 내용은 여기에 반영한다.
- `docs/제작-과정-기록.md` — 지금까지의 결정, 주의할 점, 진행 순서
- 피그마: https://www.figma.com/design/YYjQNU1s6RQJ5H0YMlZ9AZ/?node-id=7891-8968 (화면 번호별로 읽기)

## 작업 방식
- 작업 하나가 끝날 때마다 커밋하고 푸시한다.
- 단계마다 사용자가 확인한 뒤 다음 단계로 넘어간다.
- 사용자는 디자이너다. 설명은 짧고 쉽게, 근거와 함께. 사용자가 직접 할 설정은 단계별로 안내한다.

## 디자인 규칙 (요약)
- 360px 기준, 좌우 여백 20px, Pretendard(프리텐다드), 본문 16px / 줄 간격 150%
- 색은 grey-50~900 + 흰색 + 포인트 #10A66B, CSS 변수(토큰)로 관리
- 주요 버튼: 포인트 색 #10A66B + 흰 글씨 / 선택 상태(칩·탭): 검정 바탕 + 흰 글씨. 버튼·입력칸 52px, 버튼 글자 18px
- 글자 5단계 12·14·16·20·26, 간격 4px 단위
- 아이콘 Solar(선 Linear, 선택 탭은 채움 Bold), 터치 영역 44px 이상

## 코드 구조 (빌드 없음 — 파일 그대로 GitHub Pages로 배포)
- `index.html`, `manifest.webmanifest`, `sw.js`(오프라인용 캐시. 파일을 추가하면 SHELL 목록과 VERSION 갱신)
- `src/main.js` 시작점·화면 고르기 / `router.js` 주소(#/탭/id) / `overlay.js` 팝업·시트 / `store.js` 상태·동기화 / `api.js` 시트 통신
- `src/ui/components.js` 공통 컴포넌트(피그마 Components 이름), `src/ui/icons.js` Solar 아이콘(`tools/icons/build.py`로 만듦, CC BY 4.0)
- `src/screens/*.js` 화면, `src/styles/tokens.css` 디자인 토큰(색은 '역할' 토큰만 바꾸기)
- 라이브러리: Preact + htm (`src/vendor/preact-htm.js`, 빌드 없이 쓰는 버전)
- 점검: `apps-script/test/run.js`(시트 API), `tests/screens.js`(화면, Playwright)
- 피그마 이미지 주소(figma.com/api/mcp/asset)는 이 클라우드 환경에서 막혀 있음 → 아이콘은 npm(@iconify-json/solar)에서 가져옴

## 2차 목표: 앱마켓 출시 (나중에)
- 자세한 내용은 `docs/기획안.md` '2차 작업: 앱마켓 출시'. 지금은 1차(다듬기) 중
- 작업하다가 출시에 영향을 주는 선택이 나오면 **"앱스토어에 올리려면 이 방향이 맞아요"** 하고 사용자에게 먼저 추천한다
  - 예: 새 개인정보 수집, 데이터 저장 방식, 주소·도메인, 외부 서비스 추가, 아이콘·이름, 데이터 삭제 기능, 오프라인 동작

## 연결 정보
- Apps Script 웹 앱 URL (v1): https://script.google.com/macros/s/AKfycbzXVqNMwsIEPAPvVAfIsIbdZeNuDtKjWHRUc85ob7zmmnaBBdsLGDBKW__JrUGqjUIaAA/exec
  - 앱 코드에 들어가 공개돼도 됨 (초대코드 없이는 여행 데이터를 읽을 수 없음)
  - Code.gs 수정 후에는 '배포 관리 → 새 버전'으로 배포해야 URL이 유지됨
- 앱 주소(GitHub Pages): https://jinny-mohani.github.io/mohani/ — 초대 링크는 `?t=초대코드`

## 디자인 점검 도구 (Impeccable 4.9.2)
- `.claude/skills/impeccable/` — GitHub(pbakaus/impeccable)에서 직접 복사해 설치 (impeccable.style 다운로드는 이 환경에서 막혀 있음). 사용 기록 전송(telemetry)은 꺼 둠, 자동 훅은 설치 안 함
- 쓸 명령: audit · critique · polish · harden · typeset · document · clarify. **live 모드는 쓰지 않는다** (승인·격리를 끄고 AI를 실행할 수 있음)
- 화면 점검: 앱 데이터가 시트에서 오므로, 가짜 데이터로 띄운 뒤 `impeccable detect --cdp` 로 화면별 검사
- 최근 리포트: `docs/점검-리포트-impeccable.md`
