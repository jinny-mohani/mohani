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

## 연결 정보
- Apps Script 웹 앱 URL (v1): https://script.google.com/macros/s/AKfycbzXVqNMwsIEPAPvVAfIsIbdZeNuDtKjWHRUc85ob7zmmnaBBdsLGDBKW__JrUGqjUIaAA/exec
  - 앱 코드에 들어가 공개돼도 됨 (초대코드 없이는 여행 데이터를 읽을 수 없음)
  - Code.gs 수정 후에는 '배포 관리 → 새 버전'으로 배포해야 URL이 유지됨
