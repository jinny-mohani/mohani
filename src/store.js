// 앱 상태: 휴대폰에 기억할 것(여행 코드·내 프로필·마지막 데이터)과 시트 동기화.
import { useEffect, useState } from './vendor/preact-htm.js';
import { api } from './api.js';
import { SYNC_INTERVAL_MS } from './config.js';

const KEY = {
  codes: 'hg.codes',       // 참여한 여행들의 초대코드
  current: 'hg.current',   // 지금 보고 있는 여행
  cache: (c) => 'hg.cache.' + c, // 마지막으로 불러온 데이터 (오프라인 보기용)
  me: (c) => 'hg.me.' + c,       // 이 여행에서 고른 내 프로필
};

// 브라우저 저장소는 사생활 보호 모드 등에서 막힐 수 있어서 항상 try로 감싸요
const store = {
  get(k, fallback) {
    try {
      const v = localStorage.getItem(k);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) {
      return fallback;
    }
  },
  set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 공간 없음 */ }
  },
};

const initialCode = store.get(KEY.current, null);
const initialCache = initialCode ? store.get(KEY.cache(initialCode), null) : null;

const state = {
  codes: store.get(KEY.codes, []),
  current: initialCode,
  data: initialCache ? initialCache.data : null,
  lastSync: initialCache ? initialCache.savedAt : null,
  me: initialCode ? store.get(KEY.me(initialCode), null) : null,
  // idle | loading(처음) | syncing(새로고침) | ok | offline | error | not_found
  status: 'idle',
  error: '',
};

const listeners = new Set();
function set(patch) {
  Object.assign(state, patch);
  listeners.forEach((fn) => fn());
}
export function getState() {
  return state;
}
/** 화면에서 상태를 쓰는 훅. 상태가 바뀌면 화면을 다시 그려요. */
export function useStore() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  return state;
}

/**
 * 초대 링크(?t=코드)로 들어오면 그 여행을 기억해요.
 * 코드 없이 열었으면 기억해 둔 여행 코드를 주소에 다시 붙여요.
 * (아이폰은 '홈 화면에 추가'할 때 지금 주소를 그대로 쓰므로, 주소에 코드가 있어야 이어져요)
 */
export function enterFromUrl() {
  const url = new URL(location.href);
  const code = (url.searchParams.get('t') || '').trim();
  if (code) {
    selectTrip(code);
  } else if (state.current) {
    url.searchParams.set('t', state.current);
    history.replaceState(history.state, '', url);
  }
}

export function selectTrip(code) {
  const codes = state.codes.includes(code) ? state.codes : [code, ...state.codes];
  store.set(KEY.codes, codes);
  store.set(KEY.current, code);
  const cache = store.get(KEY.cache(code), null);
  set({
    codes,
    current: code,
    data: cache ? cache.data : null,
    lastSync: cache ? cache.savedAt : null,
    me: store.get(KEY.me(code), null),
    status: 'idle',
  });
}

export function setMe(memberId) {
  if (!state.current) return;
  store.set(KEY.me(state.current), memberId);
  set({ me: memberId });
}

let inFlight = null;
/** 시트에서 지금 여행을 다시 불러와요. 실패하면 마지막 데이터로 '보기만' 해요. */
export function refresh() {
  if (!state.current) return Promise.resolve();
  if (inFlight) return inFlight;
  const code = state.current;
  set({ status: state.data ? 'syncing' : 'loading' });
  inFlight = api
    .load(code)
    .then((res) => {
      if (code !== state.current) return; // 그사이 다른 여행으로 바꿈
      const savedAt = Date.now();
      store.set(KEY.cache(code), { data: res, savedAt });
      set({ data: res, lastSync: savedAt, status: 'ok', error: '' });
    })
    .catch((e) => {
      if (e.code === 'trip_not_found') set({ status: 'not_found', error: e.message });
      else set({ status: state.data ? 'offline' : 'error', error: e.message });
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/** 화면을 보고 있을 때만 30초마다 불러오고, 앱을 다시 열면 즉시 1회 불러와요. */
export function startSync() {
  refresh();
  setInterval(() => {
    if (document.visibilityState === 'visible') refresh();
  }, SYNC_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh();
  });
  window.addEventListener('online', refresh);
}
