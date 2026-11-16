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
  tripList: store.get('hg.tripList', []), // 02 여행 목록용 요약 [{ code, trip, members }]
  // idle | loading(처음) | syncing(새로고침) | ok | offline | error | not_found
  status: 'idle',
  error: '',
};

const listeners = new Set();
let version = 0; // 바뀔 때마다 1씩 증가
function set(patch) {
  Object.assign(state, patch);
  version++;
  listeners.forEach((fn) => fn());
}
export function getState() {
  return state;
}
/** 화면에서 상태를 쓰는 훅. 상태가 바뀌면 화면을 다시 그려요. */
export function useStore() {
  const [, force] = useState(0);
  const seen = version;
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    // 화면을 그린 뒤 듣기 시작하기 전에 바뀐 것이 있으면 다시 그려요
    if (version !== seen) fn();
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
  if (syncing.count > 0) return Promise.resolve(); // 저장이 끝난 뒤 다음 주기에 불러와요
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

/** 지금 여행에서 고른 '나' (없으면 null) */
export function getMe() {
  const d = state.data;
  if (!d || !state.me) return null;
  return d.members.find((m) => m.id === state.me && !m.deleted) || null;
}

/** 수정자로 남길 이름 */
export function myName() {
  const me = getMe();
  return me ? me.name : '';
}

function cacheCurrent(data) {
  const savedAt = Date.now();
  store.set(KEY.cache(state.current), { data, savedAt });
  set({ data, lastSync: savedAt, status: 'ok', error: '' });
}

/** 02 여행 목록: 휴대폰에 기억된 초대코드들의 여행 요약을 불러와요 */
export async function loadTripList() {
  if (!state.codes.length) return;
  try {
    const res = await api.trips(state.codes);
    const list = res.trips.map((t) => ({ code: t.trip.inviteCode, ...t }));
    store.set('hg.tripList', list);
    set({ tripList: list });
  } catch (e) {
    /* 오프라인이면 마지막 목록을 보여줘요 */
  }
}

/**
 * 13 새 여행 만들기. 만든 사람은 자동으로 '나'가 돼요.
 * me: { name, profile }, members: [{ name, relation, profile }]
 */
export async function createTrip({ trip, me, members }) {
  const res = await api.createTrip({
    trip,
    members: [{ ...me, relation: me.relation || '개설자', isOwner: true }, ...members],
    by: me.name,
  });
  const code = res.trip.inviteCode;
  selectTrip(code);
  const owner = res.members.find((m) => m.isOwner);
  if (owner) setMe(owner.id);
  cacheCurrent({
    trip: res.trip,
    members: res.members,
    reservations: [],
    checklist: [],
    places: [],
    schedule: [],
  });
  loadTripList();
  return res;
}

/**
 * 한 줄 저장 (추가·수정). 화면에 먼저 반영하고, 시트 저장은 뒤에서 해요.
 * 실패하면 원래대로 돌리고 에러를 던져요.
 */
export async function saveRow(table, row, opts = {}) {
  const res = await api.save({
    code: state.current,
    table,
    row,
    baseUpdatedAt: opts.baseUpdatedAt,
    force: opts.force,
    by: opts.by || myName(),
  });
  const saved = res.row;
  const d = state.data;
  if (d) {
    if (table === 'trips') {
      cacheCurrent({ ...d, trip: saved });
    } else {
      const list = d[table] || [];
      const exists = list.some((r) => r.id === saved.id);
      cacheCurrent({ ...d, [table]: exists ? list.map((r) => (r.id === saved.id ? saved : r)) : [...list, saved] });
    }
  }
  return saved;
}

/** 대표 이미지·사진 올리기 → 주소 */
export async function uploadPhoto(dataUrl, mimeType) {
  const res = await api.upload({ code: state.current, data: dataUrl, mimeType, name: 'photo-' + Date.now() + '.jpg' });
  return res.url;
}

function patchRow(table, id, patch) {
  const d = state.data;
  if (!d) return;
  cacheCurrent({ ...d, [table]: d[table].map((r) => (r.id === id ? { ...r, ...patch } : r)) });
}

/** 저장에 실패한 항목 (S-5 '저장 안 됨 · 다시 시도') — { id: 다시 시도 함수 } */
export const failed = {};

/** 체크 리스트 완료 표시. '각자' 일은 나만, 아니면 항목 전체. 화면에 먼저 반영해요 */
export async function toggleDone(item, done) {
  delete failed[item.id];
  const meId = state.me;
  const before = item.doneBy;
  let list = String(item.doneBy || '').split(',').filter(Boolean);
  if (item.assignee === '각자') {
    list = list.filter((x) => x !== meId);
    if (done) list.push(meId);
  } else {
    list = done ? [meId] : [];
  }
  patchRow('checklist', item.id, { doneBy: list.join(',') });
  try {
    const res = await api.toggleDone({ code: state.current, id: item.id, memberId: meId, done, by: myName() });
    patchRow('checklist', item.id, res.row);
  } catch (e) {
    patchRow('checklist', item.id, { doneBy: before });
    failed[item.id] = () => toggleDone({ ...item, doneBy: before }, done);
    set({}); // 화면에 '저장 안 됨' 표시
    throw e;
  }
}

/** 삭제(시트에 '삭제됨' 표시). 되돌리기는 restoreRow */
export async function deleteRow(table, id) {
  patchRow(table, id, { deleted: true, deletedBy: myName(), deletedAt: new Date().toISOString() });
  try {
    const res = await api.remove({ code: state.current, table, id, by: myName() });
    patchRow(table, id, res.row);
  } catch (e) {
    patchRow(table, id, { deleted: false });
    throw e;
  }
}

export async function restoreRow(table, id) {
  patchRow(table, id, { deleted: false });
  try {
    const res = await api.restore({ code: state.current, table, id, by: myName() });
    patchRow(table, id, res.row);
  } catch (e) {
    patchRow(table, id, { deleted: true });
    throw e;
  }
}

/** 저장 중인 개수 — 저장이 끝나기 전에는 자동 새로고침을 미뤄요 (화면이 잠깐 옛 내용으로 돌아가지 않게) */
export const syncing = { count: 0 };

const PREFIX = { members: 'm_', reservations: 'r_', checklist: 'c_', places: 'p_', schedule: 's_' };
export function newId(table) {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  let id = '';
  const rnd = crypto.getRandomValues(new Uint8Array(8));
  for (let i = 0; i < 8; i++) id += chars[rnd[i] % chars.length];
  return (PREFIX[table] || 'x_') + id;
}

/** 화면에 먼저 반영 (시트 저장은 뒤에서) */
export function applyLocal(table, row) {
  const d = state.data;
  if (!d) return;
  if (table === 'trips') return cacheCurrent({ ...d, trip: { ...d.trip, ...row } });
  const list = d[table] || [];
  const exists = list.some((r) => r.id === row.id);
  const maxOrder = list.reduce((m, r) => Math.max(m, Number(r.order) || 0), 0);
  const next = exists
    ? list.map((r) => (r.id === row.id ? { ...r, ...row, updatedBy: myName() } : r))
    : [...list, { order: maxOrder + 1, ...row, tripId: d.trip.id, deleted: false, updatedBy: myName() }];
  cacheCurrent({ ...d, [table]: next });
}

/** 데이터는 그대로 두고 화면만 다시 그리기 (저장 실패 표시 등) */
export function touch() {
  set({});
}
