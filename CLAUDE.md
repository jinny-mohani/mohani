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
- 360px 기준, 좌우 여백 20px, Noto Sans KR, 본문 16px / 줄 간격 150%
- 색은 grey-50~900 + 흰색만, CSS 변수(토큰)로 관리
- 주요 버튼·선택 상태: 검정 바탕 + 흰 글씨, 버튼·입력칸 52px, 버튼 글자 18px
- 아이콘 lucide, 터치 영역 44px 이상

## 코드 구조 (빌드 없음 — 파일 그대로 GitHub Pages로 배포)
- `index.html`, `manifest.webmanifest`, `sw.js`(오프라인용 캐시. 파일을 추가하면 SHELL 목록과 VERSION 갱신)
- `src/main.js` 시작점·화면 고르기 / `router.js` 주소(#/탭/id) / `overlay.js` 팝업·시트 / `store.js` 상태·동기화 / `api.js` 시트 통신
- `src/ui/components.js` 공통 컴포넌트(피그마 Components 이름), `src/ui/icons.js` lucide 아이콘
- `src/screens/*.js` 화면, `src/styles/tokens.css` 디자인 토큰(색은 '역할' 토큰만 바꾸기)
- 라이브러리: Preact + htm (`src/vendor/preact-htm.js`, 빌드 없이 쓰는 버전)
- 점검: `apps-script/test/run.js`(시트 API), `tests/screens.js`(화면, Playwright)
- 피그마 이미지 주소(figma.com/api/mcp/asset)는 이 클라우드 환경에서 막혀 있음 → 아이콘은 lucide-static에서 가져옴

## 연결 정보
- Apps Script 웹 앱 URL (v1): https://script.google.com/macros/s/AKfycbzXVqNMwsIEPAPvVAfIsIbdZeNuDtKjWHRUc85ob7zmmnaBBdsLGDBKW__JrUGqjUIaAA/exec
  - 앱 코드에 들어가 공개돼도 됨 (초대코드 없이는 여행 데이터를 읽을 수 없음)
  - Code.gs 수정 후에는 '배포 관리 → 새 버전'으로 배포해야 URL이 유지됨
- 앱 주소(GitHub Pages): https://jinny-mohani.github.io/mohani/ — 초대 링크는 `?t=초대코드`
