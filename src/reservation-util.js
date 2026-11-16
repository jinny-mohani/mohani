// 예약 공통 규칙 (기획안 '2. 예약')
import { nightsBetween } from './date.js';

export const TYPES = ['항공권', '숙소', '기타'];
export const TYPE_ICON = { 항공권: 'plane', 숙소: 'bed-double', 기타: 'car' };
export const STATUSES = ['예약 전', '예약 완료', '보류'];
export const STATUS_ICON = { '예약 전': 'clock', '예약 완료': 'check', 보류: 'pause' };
export const OTHER_KINDS = ['렌터카', '투어', '체험', '입장권'];
export const OTHER_ICON = { 렌터카: 'car', 투어: 'bus', 체험: 'ticket', 입장권: 'ticket' };
export const TERMINALS = ['국내선', '국제선 T1', '국제선 T2'];
export const SEATS = ['이코노미', '프리미엄 이코노미', '비즈니스'];

/** 'ICN 인천' → { code: 'ICN', name: '인천' } / '인천' → { code: '', name: '인천' } */
export function parseAirport(s) {
  const t = String(s || '').trim();
  const m = t.match(/^([A-Za-z]{3})\b\s*(.*)$/);
  return m ? { code: m[1].toUpperCase(), name: m[2] } : { code: '', name: t };
}

/** '제주항공 7C101' → { airline: '제주항공', flightNo: '7C101' } */
export function parseFlight(s) {
  const t = String(s || '').trim();
  const m = t.match(/^(.*?)\s*([A-Za-z0-9]{2}\s?\d{1,4})$/);
  return m ? { airline: m[1], flightNo: m[2].replace(/\s/, '') } : { airline: t, flightNo: '' };
}

export function firstPhoto(r) {
  return String(r.photos || '').split(',').map((s) => s.trim()).filter(Boolean)[0] || '';
}

export function photoList(r) {
  return String(r.photos || '').split(',').map((s) => s.trim()).filter(Boolean);
}

/** 목록 위 요약: '3건 중 2건 완료 · 1건 보류' / '2건 · 모두 예약 완료' / '1건 · 2박' */
export function summary(list, type) {
  const n = list.length;
  if (!n) return '';
  const done = list.filter((r) => r.status === '예약 완료').length;
  const hold = list.filter((r) => r.status === '보류').length;
  if (type === '숙소') {
    const nights = list.reduce((s, r) => s + nightsBetween(r.startAt, r.endAt), 0);
    return `${n}건${nights ? ' · ' + nights + '박' : ''}`;
  }
  if (done === n) return `${n}건 · 모두 예약 완료`;
  return `${n}건 중 ${done}건 완료${hold ? ` · ${hold}건 보류` : ''}`;
}

/** 시간 순으로 (날짜 없는 것은 뒤로) */
export function sortReservations(list) {
  return [...list].sort((a, b) => {
    const x = a.startAt || '9999';
    const y = b.startAt || '9999';
    return x === y ? (Number(a.order) || 0) - (Number(b.order) || 0) : x.localeCompare(y);
  });
}
