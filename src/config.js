// 구글 시트(Apps Script 웹 앱) 주소. Code.gs를 고친 뒤 '배포 관리 → 새 버전'으로 배포하면 주소는 그대로예요.
export const API_URL =
  'https://script.google.com/macros/s/AKfycbzXVqNMwsIEPAPvVAfIsIbdZeNuDtKjWHRUc85ob7zmmnaBBdsLGDBKW__JrUGqjUIaAA/exec';

// 화면을 보고 있을 때 다른 사람의 변경을 불러오는 간격 (기획안 '동기화 규칙')
export const SYNC_INTERVAL_MS = 30 * 1000;
