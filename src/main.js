// 함께 가요! — 앱 시작점
import { html, render, useEffect } from './vendor/preact-htm.js';
import { useStore, enterFromUrl, startSync, refresh, getMe } from './store.js';
import { useRoute, replace } from './router.js';
import { OverlayHost } from './overlay.js';
import { TabBar, OfflineBanner, SubHeader, Todo } from './ui/components.js';
import { Home } from './screens/home.js';
import { Reservations, ReservationDetail } from './screens/reservations.js';
import { Schedule } from './screens/schedule.js';
import { Places, PlaceDetail } from './screens/places.js';
import { Friends } from './screens/friends.js';
import { Start, Loading, LoadError, TripNotFound } from './screens/entry.js';
import { ProfileSelect } from './screens/profile.js';
import { TripList } from './screens/trips.js';
import { ToastHost } from './ui/toast.js';
import { DeletedList } from './screens/deleted.js';
import { Checklist } from './screens/checklist.js';
import { maybeShowInstallGuide } from './screens/install-guide.js';

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
  if (tab === 'home' && id === 'deleted') return html`<${DeletedList} data=${data} />`;
  if (tab === 'home' && id === 'checklist') return html`<${Checklist} data=${data} me=${me} query=${query} />`;
  if (tab === 'home' && id) {
    return html`<main class="screen screen--sub">
      <${SubHeader} title="준비 중" fallback="/home" />
      <div class="page"><${Todo}>이 화면은 3단계에서 만들어요.<//></div>
    </main>`;
  }
  return html`<${Home} data=${data} me=${me} />`;
}

function App() {
  const s = useStore();
  const route = useRoute();

  const page = (node) => html`${node}<${OverlayHost} /><${ToastHost} />`;

  if (route.tab === 'trips' && s.codes.length) return page(html`<${TripList} />`); // 02 여행 목록
  if (!s.current) return page(html`<${Start} />`); // 00 시작
  if (s.status === 'not_found') {
    return page(html`<${TripNotFound} onList=${s.codes.length > 1 ? () => replace('/trips') : null} />`);
  }
  if (!s.data) {
    if (s.status === 'error') return page(html`<${LoadError} message=${s.error} onRetry=${refresh} />`);
    return page(html`<${Loading} />`);
  }
  // 처음 들어온 여행이면 프로필부터 고르기 (01)
  if (!getMe()) return page(html`<${ProfileSelect} data=${s.data} />`);
  return html`<${Main} s=${s} route=${route} />`;
}

function Main({ s, route }) {
  useEffect(() => maybeShowInstallGuide(), []); // S-2 첫 진입 1회

  const tabs = ['home', 'reservations', 'schedule', 'places', 'friends'];
  const tab = tabs.includes(route.tab) ? route.tab : 'home';
  const isSub = !!route.id; // 상세 화면에서는 하단 탭을 숨겨요

  return html`
    ${s.status === 'offline' && html`<${OfflineBanner} lastSync=${s.lastSync} />`}
    <${Screen} route=${{ ...route, tab }} data=${s.data} me=${s.me} />
    ${!isSub && html`<${TabBar} active=${tab} />`}
    <${OverlayHost} />
    <${ToastHost} />
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
