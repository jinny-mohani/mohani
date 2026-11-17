// 02 여행 목록
import { html, useEffect } from '../vendor/preact-htm.js';
import { Button, Icon, LabelDday, MemberStack, SubHeader } from '../ui/components.js';
import { openOverlay } from '../overlay.js';
import { useStore, loadTripList, selectTrip, refresh } from '../store.js';
import { replace } from '../router.js';
import { parseDate } from '../date.js';
import { inviteUrl, copyText } from '../share.js';
import { NewTripModal } from './newtrip.js';
import { sized } from '../reservation-util.js';

function dateRange(trip) {
  const s = parseDate(trip.startDate);
  const e = parseDate(trip.endDate);
  if (!s) return '';
  const p = (x) => String(x).padStart(2, '0');
  const start = `${s.getFullYear()}.${p(s.getMonth() + 1)}.${p(s.getDate())}`;
  const end = e ? `${p(e.getMonth() + 1)}.${p(e.getDate())}` : '';
  return end ? `${start} – ${end}` : start;
}

/** D-36 / 여행 중 / 지난예약 */
function dday(trip) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const s = parseDate(trip.startDate);
  const e = parseDate(trip.endDate) || s;
  if (!s) return { text: '', past: false };
  if (e < today) return { text: '지난예약', past: true };
  if (s <= today) return { text: '여행 중', past: false };
  return { text: 'D-' + Math.round((s - today) / 86400000), past: false };
}

export function TripList() {
  const s = useStore();
  useEffect(() => {
    loadTripList();
  }, []);

  // 다가오는 여행 먼저, 지난 여행은 아래
  const list = [...s.tripList].sort((a, b) => {
    const da = dday(a.trip).past;
    const db = dday(b.trip).past;
    if (da !== db) return da ? 1 : -1;
    return String(a.trip.startDate).localeCompare(String(b.trip.startDate)) * (da ? -1 : 1);
  });

  const open = (code) => {
    if (code !== s.current) {
      selectTrip(code);
      refresh();
    }
    replace('/home');
  };

  return html`<main class="screen screen--sub screen--tint">
    ${s.current
      ? html`<${SubHeader} title="" fallback="/home" />`
      : null}
    <div class="page">
      <h1 class="page-title" style=${s.current ? '' : 'padding-top:20px'}>내 여행</h1>
      <ul class="trip-list" style="margin-top:28px">
        ${list.map(({ code, trip, members }) => {
          const d = dday(trip);
          return html`<li key=${code} class=${'trip-card' + (d.past ? ' trip-card--past' : '')}>
            <button class="trip-card__open" onClick=${() => open(code)} aria-label=${trip.title + ' 열기'}>
              <span class="trip-card__img">
                ${trip.coverImage ? html`<img src=${sized(trip.coverImage, 800)} alt="" loading="lazy" />` : html`<${Icon} name="image" size=${28} />`}
              </span>
              <span class="trip-card__info">
                <span class="trip-card__text">
                  <span class="trip-card__title">${trip.title}</span>
                  <span class="trip-card__date">${dateRange(trip)} · ${members.length}명</span>
                </span>
                ${d.text && html`<${LabelDday} text=${d.text} past=${d.past} />`}
              </span>
            </button>
            <${MemberStack} members=${members} />
            ${!d.past &&
            html`<button class="btn-outline" onClick=${() => copyText(inviteUrl(code))}>
              <${Icon} name="link" size=${16} /> 초대 링크 복사
            </button>`}
          </li>`;
        })}
      </ul>
      ${!list.length && html`<p class="muted" style="margin-top:28px">여행을 불러오고 있어요…</p>`}
      <div style="margin-top:32px">
        <${Button} onClick=${() => openOverlay(html`<${NewTripModal} />`)}>새 여행 만들기<//>
      </div>
    </div>
  </main>`;
}
