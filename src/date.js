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
  if (diff > 0) return `D-${diff}`;
  if (diff === 0) return 'D-day';
  if (today <= startOfDay(e)) return `여행 ${1 - diff}일째`;
  return '지난 여행';
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

export function datePart(s) {
  const m = String(s || '').match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : '';
}

export function timePart(s) {
  return formatTime(s);
}

/** 날짜와 시간을 합쳐 시트 형식으로: 2026-12-19T15:00 (시간이 없으면 날짜만) */
export function joinDateTime(date, time) {
  if (!date) return '';
  return time ? `${date}T${time}` : date;
}

/** 두 날짜 사이 박 수 */
export function nightsBetween(a, b) {
  const s = parseDate(datePart(a));
  const e = parseDate(datePart(b));
  if (!s || !e) return 0;
  return Math.max(0, Math.round((e - s) / 86400000));
}

/** 12.19 (토) 15:00 */
export function formatDayTime(s) {
  return [formatDay(s), formatTime(s)].filter(Boolean).join(' ');
}

/** 12.19 (토) 15:00 – 12.21 (월) 11:00 (같은 날이면 끝은 시간만) */
export function rangeText(a, b) {
  if (!a) return '';
  if (!b) return formatDayTime(a);
  if (datePart(a) === datePart(b)) {
    const t = formatTime(b);
    return t ? `${formatDayTime(a)} – ${t}` : formatDayTime(a);
  }
  return `${formatDayTime(a)} – ${formatDayTime(b)}`;
}

/** 1시간 50분 (출발·도착 시간 차이, 도착이 더 이르면 다음 날로 봄) */
export function durationText(a, b) {
  const ta = formatTime(a);
  const tb = formatTime(b);
  if (!ta || !tb) return '';
  const [h1, m1] = ta.split(':').map(Number);
  const [h2, m2] = tb.split(':').map(Number);
  let min = h2 * 60 + m2 - (h1 * 60 + m1);
  if (min <= 0) min += 24 * 60;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return [h && h + '시간', m && m + '분'].filter(Boolean).join(' ');
}
