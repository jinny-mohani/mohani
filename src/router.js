// 화면 주소: #/home, #/reservations?type=항공권, #/reservations/r_123 처럼 # 뒤에 붙여요.
// (# 방식은 GitHub Pages처럼 서버 설정이 없는 곳에서도 새로고침해도 화면이 유지돼요)
import { useEffect, useState } from './vendor/preact-htm.js';

export const TABS = [
  { id: 'home', label: '홈', icon: 'house' },
  { id: 'reservations', label: '예약', icon: 'ticket' },
  { id: 'schedule', label: '일정', icon: 'calendar-days' },
  { id: 'places', label: '장소', icon: 'map-pin' },
  { id: 'friends', label: '친구들', icon: 'users' },
];

export function parseRoute() {
  const hash = decodeURIComponent(location.hash.replace(/^#/, '')) || '/home';
  const [path, qs] = hash.split('?');
  const parts = path.split('/').filter(Boolean);
  return {
    path,
    tab: parts[0] || 'home',
    id: parts[1] || null,
    query: Object.fromEntries(new URLSearchParams(qs || '')),
  };
}

export function useRoute() {
  const [route, setRoute] = useState(parseRoute());
  useEffect(() => {
    const onChange = () => {
      const next = parseRoute();
      setRoute((prev) => {
        // 다른 탭이나 상세로 가면 맨 위부터 보여요
        if (prev.path !== next.path) document.getElementById('app').scrollTo(0, 0);
        return next;
      });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

let depth = 0; // 앱 안에서 이동한 횟수 (뒤로 가기가 앱 밖으로 나가지 않게)

/** 화면 이동 */
export function go(path) {
  depth++;
  location.hash = path;
}

/** 탭 안에서 칩만 바꿀 때: 뒤로 가기 기록을 쌓지 않아요 */
export function replace(path) {
  const url = new URL(location.href);
  url.hash = path;
  location.replace(url);
}

/** ‹ 뒤로. 링크로 바로 들어와서 돌아갈 곳이 없으면 fallback으로 가요 */
export function back(fallback) {
  if (depth > 0) {
    depth--;
    history.back();
  } else {
    replace(fallback);
  }
}
