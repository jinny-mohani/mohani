// 함께 가요! — 앱 시작점
import { html, render } from './vendor/preact-htm.js';
import { useStore, enterFromUrl, startSync, refresh } from './store.js';
import { useRoute } from './router.js';
import { OverlayHost } from './overlay.js';
import { TabBar, OfflineBanner, SubHeader, Todo } from './ui/components.js';
import { Home } from './screens/home.js';
import { Reservations, ReservationDetail } from './screens/reservations.js';
import { Schedule } from './screens/schedule.js';
import { Places, PlaceDetail } from './screens/places.js';
import { Friends } from './screens/friends.js';
import { Start, Loading, LoadError, TripNotFound } from './screens/entry.js';

/** 지금 주소에 맞는 화면 */
function Screen({ route, data, me }) {
  const { tab, id, query } = route;
  if (tab === 'reservations') {
    return id ? html`<${ReservationDetail} data=${data} id=${id} />` : html`<${Reservations} data=${data} query=${query} />`;
  }
  if (tab === 'schedule') return html`<${Schedule} data=${data} query=${query} />`;
  if (tab === 'places') {
    return id ? html`<${PlaceDetail} data=${data} id=${id} />` : html`<${Places} data=${data} query=${query} />`;
  }
  if (tab === 'friends') return html`<${Friends} data=${data} me=${me} />`;
  if (tab === 'home' && id) {
    // 03-3 체크 리스트, 03-4 여행 설정, 03-7 최근 삭제 … 3단계에서 채워요
    return html`<main class="screen screen--sub">
      <${SubHeader} title="준비 중" fallback="/home" />
      <div class="page"><${Todo}>이 화면은 3단계에서 만들어요.<//></div>
    </main>`;
  }
  return html`<${Home} data=${data} />`;
}

function App() {
  const s = useStore();
  const route = useRoute();

  if (!s.current) return html`<${Start} />`;
  if (s.status === 'not_found') return html`<${TripNotFound} />`;
  if (!s.data) {
    if (s.status === 'error') return html`<${LoadError} message=${s.error} onRetry=${refresh} />`;
    return html`<${Loading} />`;
  }

  const tabs = ['home', 'reservations', 'schedule', 'places', 'friends'];
  const tab = tabs.includes(route.tab) ? route.tab : 'home';
  const isSub = !!route.id; // 상세 화면에서는 하단 탭을 숨겨요

  return html`
    ${s.status === 'offline' && html`<${OfflineBanner} lastSync=${s.lastSync} />`}
    <${Screen} route=${{ ...route, tab }} data=${s.data} me=${s.me} />
    ${!isSub && html`<${TabBar} active=${tab} />`}
    <${OverlayHost} />
  `;
}

enterFromUrl();
render(html`<${App} />`, document.getElementById('app'));
startSync();

// 홈 화면에 추가했을 때 앱처럼 동작하고, 인터넷이 약해도 열리게
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
