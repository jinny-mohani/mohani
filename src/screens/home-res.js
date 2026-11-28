// 03 홈 — 항공권 · 숙소 · 기타 예약 (11.28 확정: 프로토타입 '수정파일-1123')
// 항공권·숙소는 사진 위 흰 정보 판 카드를 옆으로 넘겨 보고, 누르면 아래로 펼쳐져요. 기타 예약은 사진 카드를 옆으로 (11.28 피그마 '홈_기타예약').
import { html, useState } from '../vendor/preact-htm.js';
import { Icon, StatusLabel } from '../ui/components.js';
import { go } from '../router.js';
import { openOverlay } from '../overlay.js';
import { formatDay, formatTime, durationText, nightsBetween, rangeText } from '../date.js';
import { memberName } from '../members.js';
import { OTHER_ICON, parseAirport, parseFlight, firstPhoto, flightBg, sortReservations, sized, withSqm } from '../reservation-util.js';
import { ReservationForm } from './reservation-form.js';

const DONE = '예약 완료';

/** 섹션 제목: 이름 + 개수(초록) + › */
function Head({ title, count, to }) {
  return html`<button class="home-section__head" onClick=${() => go(to)}>
    <h2>${title}${count > 0 && html`<em class="home-section__count">${count}</em>`}</h2>
    <${Icon} name="select-right" size=${18} stroke=${1.4} label=${title + ' 전체 보기'} />
  </button>`;
}

/** 옆으로 넘기는 줄 + 아래 점 (카드가 2장 이상일 때만 점) */
function Swipe({ items }) {
  const [i, setI] = useState(0);
  const n = items.length;
  const onScroll = (e) => {
    const row = e.currentTarget;
    const w = row.firstElementChild ? row.firstElementChild.getBoundingClientRect().width + 12 : 1;
    setI(Math.round(row.scrollLeft / w));
  };
  return html`<div>
    <div class=${'tk-row' + (n === 1 ? ' tk-row--one' : '')} onScroll=${onScroll}>${items}</div>
    ${n > 1 && html`<div class="tk-dots" aria-hidden="true">${items.map((_, k) => html`<i class=${k === Math.min(i, n - 1) ? 'on' : ''}></i>`)}</div>`}
  </div>`;
}

/** 카드 틀: 누르면 펼치기 / 접기 (카드마다 따로 — 사용자 결정 11.28). 링크·버튼을 누르면 펼치지 않아요 */
function Ticket({ r, photo, empty, label, children, extra }) {
  const [open, setOpen] = useState(false);
  const toggle = (e) => {
    if (e.target.closest('a, .tk__link')) return;
    setOpen(!open);
  };
  return html`<div class=${'tk' + (photo ? '' : ' tk--empty') + (open ? ' tk--open' : '')}>
    ${photo ? html`<img class="tk__bg" src=${sized(photo, 800)} alt="" loading="lazy" />` : html`<span class="tk__ph"><${Icon} name=${empty} size=${48} stroke=${1.2} /></span>`}
    <div class="tk__panel" onClick=${toggle}>
      ${children}
      <div class="tk__extra" aria-hidden=${open ? null : 'true'}><div><div class="tk__extra-in">
        ${extra}
        <button class="tk__link" tabindex=${open ? null : '-1'} onClick=${() => go('/reservations/' + r.id)}>자세히 보기<${Icon} name="chevron-right" size=${16} /></button>
      </div></div></div>
      <button class="tk__more" aria-expanded=${open ? 'true' : 'false'} aria-label=${label + (open ? ' 접기' : ' 펼치기')}>
        <${Icon} name="chevron-down" size=${18} />
      </button>
    </div>
  </div>`;
}

/** 비행기 곡선: 출발(초록 점) → 지나온 길(초록) → 비행기 → 남은 길(회색 점선) → 도착(회색 원) */
const Arc = () => html`<span class="tk-arc" aria-hidden="true">
  <svg viewBox="0 0 100 40" preserveAspectRatio="none">
    <path d="M3 34 Q50 -6 97 34" fill="none" stroke="var(--color-border-strong)" stroke-width="1.5" stroke-dasharray="3 3" vector-effect="non-scaling-stroke" />
    <path d="M3 34 Q50 -6 97 34" fill="none" stroke="var(--color-point)" stroke-width="2" pathLength="100" stroke-dasharray="52 100" vector-effect="non-scaling-stroke" />
  </svg>
  <i class="tk-arc__from"></i><i class="tk-arc__to"></i>
  <span class="tk-arc__plane"><${Icon} name="airplane" size=${18} bold /></span>
</span>`;

const Cells = ({ items }) => html`<span class="tk-cells">${items.map(([k, v]) => html`<span><small>${k}</small><b>${v || '–'}</b></span>`)}</span>`;
const Memo = ({ text }) => text && html`<p class="tk-memo"><${Icon} name="file-text" size=${16} />${text}</p>`;

function FlightTicket({ data, r }) {
  const from = parseAirport(r.fromAirport);
  const to = parseAirport(r.toAirport);
  const { flightNo } = parseFlight(r.title);
  const dur = durationText(r.startAt, r.endAt);
  const done = r.status === DONE;
  const terminal = r.fromTerminal || r.toTerminal ? [r.fromTerminal || '–', r.toTerminal || '–'].join(' → ') : '';
  const who = memberName(data, r.assignee);
  return html`<${Ticket} r=${r} photo=${flightBg(r)} label=${r.title}
    extra=${html`
      <span class="tk-box">${[['기종', r.aircraft], ['예약번호', r.bookingNo], ['담당', who]].map(([k, v]) => html`<span><small>${k}</small><b>${v || '–'}</b></span>`)}</span>
      ${r.vendor && html`<span class="tk-chips"><span>예약처 · ${r.vendor}</span></span>`}
      <${Memo} text=${r.memo} />`}>
    <span class="tk__top">
      <span class="tk__when">${[r.direction || '항공권', formatDay(r.startAt)].filter(Boolean).join(' · ')}</span>
      ${done
        ? dur && html`<span class="tk__dur"><${Icon} name="clock" size=${14} stroke=${2} />${dur}</span>`
        : html`<${StatusLabel} status=${r.status} />`}
    </span>
    <span class="tk-route">
      <span class="tk-route__end"><b>${from.code || from.name || '출발'}</b><small>${[formatTime(r.startAt), from.code && from.name].filter(Boolean).join(' ')}</small></span>
      <${Arc} />
      <span class="tk-route__end tk-route__end--to"><b>${to.code || to.name || '도착'}</b><small>${[formatTime(r.endAt), to.code && to.name].filter(Boolean).join(' ')}</small></span>
    </span>
    <span class="tk__rule"></span>
    <${Cells} items=${[['항공편', flightNo || r.title], ['터미널', terminal], ['좌석', r.seat]]} />
  <//>`;
}

function StayTicket({ data, r }) {
  const nights = nightsBetween(r.startAt, r.endAt);
  const day = (s) => formatDay(s).split(' ');  // ['12.19', '(토)']
  const [d1, w1] = day(r.startAt);
  const [d2, w2] = day(r.endAt);
  const inT = r.checkInTime || formatTime(r.startAt);
  const outT = formatTime(r.endAt);
  return html`<${Ticket} r=${r} photo=${firstPhoto(r)} empty="bed-double" label=${r.title}
    extra=${html`
      ${(r.address || r.mapUrl) && html`<span class="tk-chips">
        ${r.address && html`<span>${r.address}</span>`}
        ${r.mapUrl && html`<a href=${r.mapUrl} target="_blank" rel="noopener">지도 보기</a>`}
      </span>`}
      <${Memo} text=${r.memo} />`}>
    <span class="tk__top tk__top--name">
      <b class="tk__name">${r.title}</b>
      ${r.status !== DONE && html`<${StatusLabel} status=${r.status} />`}
    </span>
    <span class="tk-route">
      <span class="tk-route__end tk-route__end--date"><b>${d1 || '날짜 미정'}</b><small>${[w1, inT && '체크인 ' + inT].filter(Boolean).join(' ')}</small></span>
      <span class="tk-nights">${nights > 0 && html`<span>${nights}박</span>`}</span>
      <span class="tk-route__end tk-route__end--to tk-route__end--date"><b>${d2 || ''}</b><small>${[w2, outT && '체크아웃 ' + outT].filter(Boolean).join(' ')}</small></span>
    </span>
    <span class="tk__rule"></span>
    <${Cells} items=${[['방', r.roomType], ['크기', withSqm(r.roomSize)], ['담당', memberName(data, r.assignee)]]} />
  <//>`;
}

/** 아직 없을 때: 바로 추가 */
const AddBox = ({ type, text }) => html`<button class="home-add" onClick=${() => openOverlay(html`<${ReservationForm} type=${type} />`)}>
  <${Icon} name="plus" size=${18} />${text}</button>`;

export function HomeReservations({ data }) {
  const all = sortReservations(data.reservations.filter((r) => !r.deleted));
  const flights = all.filter((r) => r.type === '항공권');
  const stays = all.filter((r) => r.type === '숙소');
  const others = all.filter((r) => r.type === '기타');
  return html`
    <section class="home-section home-section--wide">
      <${Head} title="항공권" count=${flights.length} to="/reservations?type=항공권" />
      ${flights.length
        ? html`<${Swipe} items=${flights.map((r) => html`<${FlightTicket} key=${r.id} data=${data} r=${r} />`)} />`
        : html`<${AddBox} type="항공권" text="항공권을 등록해 보세요" />`}
    </section>
    <section class="home-section home-section--wide">
      <${Head} title="숙소" count=${stays.length} to="/reservations?type=숙소" />
      ${stays.length
        ? html`<${Swipe} items=${stays.map((r) => html`<${StayTicket} key=${r.id} data=${data} r=${r} />`)} />`
        : html`<${AddBox} type="숙소" text="숙소를 등록해 보세요" />`}
    </section>
    ${others.length > 0 && html`<section class="home-section">
      <${Head} title="기타 예약" count=${others.length} to="/reservations?type=기타" />
      <div class="home-etc">
        ${others.map((r) => {
          const photo = firstPhoto(r);
          return html`<button class="home-etc__card" key=${r.id} onClick=${() => go('/reservations/' + r.id)} aria-label=${r.title + ' 상세 보기'}>
            <span class="home-etc__img">
              ${photo ? html`<img src=${sized(photo, 400)} alt="" loading="lazy" />` : html`<${Icon} name=${OTHER_ICON[r.subType] || 'ticket'} size=${32} />`}
              <span class="home-etc__status"><${StatusLabel} status=${r.status} /></span>
            </span>
            <b class="home-etc__title">${r.title}</b>
            <small class="home-etc__date">${rangeText(r.startAt, r.endAt) || '날짜 미정'}</small>
          </button>`;
        })}
      </div>
    </section>`}`;
}
