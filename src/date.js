// 날짜 도우미. 시트에는 '2026-12-19' 또는 '2026-12-19T14:30' 형식으로 저장돼요.
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

export function parseDate(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
}

/** 12.19 (토) */
export function formatDay(s) {
  const d = parseDate(s);
  if (!d) return '';
  return `${d.getMonth() + 1}.${d.getDate()} (${WEEK[d.getDay()]})`;
}

/** 15:00 */
export function formatTime(s) {
  const m = String(s || '').match(/T(\d{2}:\d{2})/);
  return m ? m[1] : '';
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** 여행 일수 (2박 3일이면 3) */
export function tripDays(trip) {
  const s = parseDate(trip && trip.startDate);
  const e = parseDate(trip && trip.endDate);
  if (!s || !e) return 1;
  return Math.max(1, Math.round((startOfDay(e) - startOfDay(s)) / 86400000) + 1);
}

/** 2박 3일 */
export function nightsLabel(trip) {
  const days = tripDays(trip);
  return days === 1 ? '당일치기' : `${days - 1}박 ${days}일`;
}

/** Day n의 날짜 (YYYY-MM-DD) */
export function dayDate(trip, n) {
  const s = parseDate(trip && trip.startDate);
  if (!s) return '';
  const d = new Date(s.getFullYear(), s.getMonth(), s.getDate() + n - 1);
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 홈 상단 문구: 여행까지 36일 남았어요 / 여행 2일째예요 / 지난 여행이에요 */
export function ddayText(trip, now = new Date()) {
  const s = parseDate(trip && trip.startDate);
  const e = parseDate(trip && trip.endDate) || s;
  if (!s) return '';
  const today = startOfDay(now);
  const diff = Math.round((startOfDay(s) - today) / 86400000);
  if (diff > 0) return `여행까지 ${diff}일 남았어요`;
  if (today <= startOfDay(e)) return `여행 ${1 - diff}일째예요`;
  return '지난 여행이에요';
}

/** 마지막 동기화: 방금 / 5분 전 / 12.02 21:10 */
export function syncText(ts, now = Date.now()) {
  if (!ts) return '';
  const min = Math.floor((now - ts) / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const d = new Date(ts);
  const p = (x) => String(x).padStart(2, '0');
  return `${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
