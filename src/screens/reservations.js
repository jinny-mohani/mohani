// 05 예약 목록(전체) · 05-1 항공권 · 05-2 숙소 · 05-3 기타 · 05-4~6 상세 · 07-0 종류 선택
import { html } from '../vendor/preact-htm.js';
import { Button, ChipGroup, Fab, Empty, Icon, Row, Sheet, StatusLabel, SubHeader } from '../ui/components.js';
import { go, replace, back } from '../router.js';
import { openOverlay, replaceOverlay, closeOverlay } from '../overlay.js';
import { formatDay, rangeText, nightsBetween, durationText, formatTime, syncText } from '../date.js';
import { memberName } from '../members.js';
import { copyText } from '../share.js';
import { toast } from '../ui/toast.js';
import { saveLater, deleteWithUndo } from '../save.js';
import {
  TYPES, TYPE_ICON, STATUSES, STATUS_ICON, OTHER_ICON,
  parseAirport, parseFlight, firstPhoto, flightBg, photoList, summary, sortReservations, sized,
} from '../reservation-util.js';
import { ReservationForm } from './reservation-form.js';
import { openPhotos } from '../ui/viewer.js';

const openForm = (type, row) => openOverlay(html`<${ReservationForm} type=${type} row=${row} />`);

/** StatusLabel을 누르면 상태 선택 메뉴 (피그마 컴포넌트 설명) */
function pickStatus(r) {
  openOverlay(html`<${Sheet} title="예약 상태">
    <ul>
      ${STATUSES.map((s) => html`<li key=${s}>
        <button class="menu-row" aria-pressed=${r.status === s ? 'true' : 'false'}
          onClick=${() => closeOverlay(() => {
            if (r.status === s) return;
            saveLater('reservations', { id: r.id, status: s }, r.updatedAt);
          })}>
          <${Icon} name=${STATUS_ICON[s]} size=${20} /><span>${s}</span>
          ${r.status === s && html`<${Icon} name="check" size=${20} stroke=${2} />`}
        </button>
      </li>`)}
    </ul>
  <//>`);
}

/* ───── 카드 ───── */

/** 05-1 항공권 카드: 정사각형 사진 위에 흰 정보 패널 */
function FlightCard({ r }) {
  const from = parseAirport(r.fromAirport);
  const to = parseAirport(r.toAirport);
  const { flightNo } = parseFlight(r.title);
  const photo = flightBg(r);
  const cells = [flightNo || r.title, r.aircraft, r.seat].filter(Boolean);
  return html`<div class="res-item">
    <button class="photo-card" onClick=${() => go('/reservations/' + r.id)} aria-label=${r.title + ' 상세 보기'}>
      ${photo ? html`<img src=${sized(photo, 800)} alt="" loading="lazy" />` : html`<span class="photo-card__empty"><${Icon} name="plane" size=${40} /></span>`}
      <span class="photo-card__top">
        <span class="status status--done">${r.direction || '항공권'}${r.startAt ? ' · ' + formatDay(r.startAt) : ''}</span>
        <${StatusLabel} status=${r.status} onClick=${() => pickStatus(r)} />
      </span>
      <span class="flight-panel">
        <span class="flight-panel__route">
          <span class="flight-panel__end">
            <small>${formatTime(r.startAt)}</small>
            <b>${from.code || from.name || '출발'}</b>
            <small>${[from.code && from.name, r.fromTerminal].filter(Boolean).join(' · ')}</small>
          </span>
          <span class="flight-panel__mid">
            <span class="flight-panel__plane"><${Icon} name="plane" size=${14} stroke=${1.75} /></span>
            <small>${durationText(r.startAt, r.endAt)}</small>
          </span>
          <span class="flight-panel__end flight-panel__end--to">
            <small>${formatTime(r.endAt)}</small>
            <b>${to.code || to.name || '도착'}</b>
            <small>${[to.code && to.name, r.toTerminal].filter(Boolean).join(' · ')}</small>
          </span>
        </span>
        ${cells.length > 0 && html`<span class="flight-panel__cells">${cells.map((c) => html`<span>${c}</span>`)}</span>`}
      </span>
    </button>
    ${r.memo && html`<p class="res-item__memo">${r.memo}</p>`}
  </div>`;
}

/** 05-2 숙소 카드: 정사각형 사진 위에 이름·날짜·라벨 */
function StayCard({ r }) {
  const photo = firstPhoto(r);
  const nights = nightsBetween(r.startAt, r.endAt);
  const tags = [r.roomType, r.roomSize, r.checkInTime || formatTime(r.startAt) ? '체크인 ' + (r.checkInTime || formatTime(r.startAt)) : ''].filter(Boolean);
  return html`<div class="res-item">
    <button class="photo-card photo-card--dark" onClick=${() => go('/reservations/' + r.id)} aria-label=${r.title + ' 상세 보기'}>
      ${photo ? html`<img src=${sized(photo, 800)} alt="" loading="lazy" />` : html`<span class="photo-card__empty"><${Icon} name="bed-double" size=${40} /></span>`}
      <span class="photo-card__shade"></span>
      <span class="photo-card__top"><${StatusLabel} status=${r.status} onClick=${() => pickStatus(r)} /></span>
      <span class="stay-info">
        <b>${r.title}</b>
        <span>${[formatDay(r.startAt) && `${formatDay(r.startAt)} – ${formatDay(r.endAt)}`, nights && nights + '박'].filter(Boolean).join(' · ')}</span>
        ${tags.length > 0 && html`<span class="stay-info__tags">${tags.map((t) => html`<span>${t}</span>`)}</span>`}
      </span>
    </button>
    ${r.memo && html`<p class="res-item__memo res-item__memo--2">${r.memo}</p>`}
  </div>`;
}

/** 05-3 기타 카드 */
function OtherCard({ data, r }) {
  const photo = firstPhoto(r);
  const who = memberName(data, r.assignee);
  const tags = [r.address, who && '담당 ' + who, r.bookingNo && '예약번호 ' + r.bookingNo].filter(Boolean);
  return html`<div class="res-item">
    <button class="photo-card photo-card--dark" onClick=${() => go('/reservations/' + r.id)} aria-label=${r.title + ' 상세 보기'}>
      ${photo ? html`<img src=${sized(photo, 800)} alt="" loading="lazy" />` : html`<span class="photo-card__empty"><${Icon} name=${OTHER_ICON[r.subType] || 'ticket'} size=${40} /></span>`}
      <span class="photo-card__shade"></span>
      <span class="photo-card__top">
        <span class="status status--done">${r.subType || '기타'}</span>
        <${StatusLabel} status=${r.status} onClick=${() => pickStatus(r)} />
      </span>
      <span class="stay-info">
        <b>${r.title}</b>
        <span>${rangeText(r.startAt, r.endAt) || '날짜 미정'}</span>
        ${tags.length > 0 && html`<span class="stay-info__tags">${tags.map((t) => html`<span>${t}</span>`)}</span>`}
      </span>
    </button>
    ${r.memo && html`<p class="res-item__memo res-item__memo--2">${r.memo}</p>`}
  </div>`;
}

/** 05 전체 탭 카드 (시안 B): 왼쪽 72px 사진 + 종류·제목·날짜, 상태는 제목 아래 (제목이 잘리지 않게) */
function AllRow({ data, r }) {
  const nights = nightsBetween(r.startAt, r.endAt);
  const when = r.type === '숙소'
    ? rangeText(r.startAt, r.endAt) + (nights ? ' · ' + nights + '박' : '')
    : rangeText(r.startAt, r.type === '항공권' ? '' : r.endAt);
  const who = memberName(data, r.assignee);
  // 항공권은 사진이 없어도 하늘 사진, 나머지는 사진이 없으면 회색 + 종류 아이콘
  const photo = r.type === '항공권' ? flightBg(r) : firstPhoto(r);
  const icon = r.type === '기타' ? OTHER_ICON[r.subType] || 'ticket' : TYPE_ICON[r.type] || 'ticket';
  return html`<div class="all-row">
    <button class="all-row__main" onClick=${() => go('/reservations/' + r.id)} aria-label=${r.title + ' 상세 보기'}>
      <span class="all-row__thumb">${photo ? html`<img src=${sized(photo, 200)} alt="" loading="lazy" />` : html`<${Icon} name=${icon} size=${28} />`}</span>
      <span class="all-row__text">
        <span class="all-row__type"><${Icon} name=${TYPE_ICON[r.type] || 'ticket'} size=${14} />${r.type === '기타' ? r.subType || '기타' : r.type}</span>
        <span class="all-row__title">${r.title}</span>
        <span class="all-row__meta">${[when, who && '담당 ' + who].filter(Boolean).join(' · ') || '날짜 미정'}</span>
      </span>
    </button>
    <span class="all-row__status"><${StatusLabel} status=${r.status} onClick=${() => pickStatus(r)} /></span>
  </div>`;
}

/* ───── 05 목록 ───── */
export function Reservations({ data, query }) {
  const filter = TYPES.includes(query.type) ? query.type : '전체';
  const all = data.reservations.filter((r) => !r.deleted);
  const list = sortReservations(filter === '전체' ? all : all.filter((r) => r.type === filter));

  const add = () => {
    if (filter === '전체') openOverlay(html`<${TypeSheet} />`);
    else openForm(filter);
  };

  return html`<main class="screen screen--tint">
    <header class="big-title"><h1>예약</h1></header>
    <${Fab} label="예약 추가" onClick=${add} />
    <div class="page">
      <${ChipGroup}
        label="예약 종류"
        value=${filter}
        options=${['전체', ...TYPES].map((v) => ({ value: v, label: v }))}
        onChange=${(v) => replace(v === '전체' ? '/reservations' : '/reservations?type=' + v)}
      />
      ${list.length
        ? html`<p class="list-summary">${summary(list, filter)}</p>
          <ul class=${'res-list res-list--' + (filter === '전체' ? 'all' : filter)}>
            ${list.map((r) => html`<li key=${r.id}>
              ${filter === '항공권' ? html`<${FlightCard} r=${r} />`
                : filter === '숙소' ? html`<${StayCard} r=${r} />`
                : filter === '기타' ? html`<${OtherCard} data=${data} r=${r} />`
                : html`<${AllRow} data=${data} r=${r} />`}
            </li>`)}
          </ul>`
        : html`<${Empty}
            icon=${filter === '전체' ? 'ticket' : TYPE_ICON[filter]}
            title=${filter === '전체' ? '아직 예약이 없어요' : `아직 ${filter} 예약이 없어요`}
            text="항공권, 숙소 예약을 추가해 친구들과 같이 봐요."
            action=${html`<${Button} onClick=${add}>예약 추가<//>`}
          />`}
    </div>
  </main>`;
}

/** 07-0 종류 선택 (바텀시트) */
function TypeSheet() {
  const subs = { 항공권: '가는 편 · 오는 편', 숙소: '체크인 · 체크아웃', 기타: '렌터카 · 투어 · 체험 · 입장권' };
  const icons = { 항공권: 'plane', 숙소: 'bed-double', 기타: 'ticket' };
  return html`<${Sheet} title="어떤 예약을 추가할까요?">
    <ul>
      ${TYPES.map((t) => html`<li key=${t}>
        <${Row} icon=${icons[t]} title=${t} sub=${subs[t]}
          onClick=${() => replaceOverlay(html`<${ReservationForm} type=${t} />`)} />
      </li>`)}
    </ul>
  <//>`;
}

/* ───── 05-4~6 상세 ───── */
export function ReservationDetail({ data, id }) {
  const r = data.reservations.find((x) => x.id === id);
  if (!r || r.deleted) {
    return html`<main class="screen screen--sub">
      <${SubHeader} title="예약" fallback="/reservations" />
      <${Empty} icon="ticket" title="지워졌거나 없는 예약이에요" text="지운 예약은 홈 › 여행 설정 › 최근 삭제에서 되살릴 수 있어요." />
    </main>`;
  }
  const title = { 항공권: '항공권 상세', 숙소: '숙소 상세', 기타: '기타 예약 상세' }[r.type] || '예약 상세';
  const photos = photoList(r);
  const nights = nightsBetween(r.startAt, r.endAt);
  const flight = parseFlight(r.title);
  const from = parseAirport(r.fromAirport);
  const to = parseAirport(r.toAirport);
  const who = memberName(data, r.assignee);

  const more = () => openOverlay(html`<${Sheet} title=${r.title}>
    <ul>
      <li><button class="menu-row" onClick=${() => replaceOverlay(html`<${ReservationForm} type=${r.type} row=${r} />`)}>
        <${Icon} name="pencil" size=${20} /><span>수정</span></button></li>
      <li><button class="menu-row" onClick=${() => closeOverlay(() => {
        deleteWithUndo('reservations', r.id, r.title).catch(() => toast('삭제하지 못했어요 · 다시 시도해 주세요'));
        back('/reservations?type=' + r.type);
      })}><${Icon} name="trash-2" size=${20} /><span>삭제</span></button></li>
    </ul>
  <//>`);

  const tags = r.type === '항공권'
    ? [r.vendor && '예약처 · ' + r.vendor, r.fromTerminal && '터미널 · ' + r.fromTerminal]
    : r.type === '숙소'
      ? [r.vendor && '예약처 ' + r.vendor, r.cost && '비용 ' + r.cost, r.roomType && '객실 ' + r.roomType, r.roomSize && '방 ' + r.roomSize]
      : [r.vendor && '예약처 ' + r.vendor, r.cost && '비용 ' + r.cost, r.people && '인원 ' + r.people];
  const tagList = tags.filter(Boolean);

  return html`<main class="screen screen--sub detail">
    <${SubHeader} title=${title} fallback=${'/reservations?type=' + r.type}>
      <button class="icon-btn" aria-label="더 보기" onClick=${more}><${Icon} name="ellipsis" /></button>
    <//>
    <div class="page">
      ${r.type === '항공권'
        ? html`<div class="flight-detail">
            <span class="photo-card__top">
              <span class="status status--done">${r.direction || '항공권'}${r.startAt ? ' · ' + formatDay(r.startAt) : ''}</span>
              <${StatusLabel} status=${r.status} onClick=${() => pickStatus(r)} />
            </span>
            <img class="flight-detail__img" src=${flightBg(r)} alt="" />
            <span class="flight-panel">
              <span class="flight-panel__route">
                <span class="flight-panel__end"><small>${formatTime(r.startAt)}</small><b>${from.code || from.name}</b><small>${[from.code && from.name, r.fromTerminal].filter(Boolean).join(' · ')}</small></span>
                <span class="flight-panel__mid">
                  <small>${flight.airline}</small>
                  <span class="flight-panel__plane"><${Icon} name="plane" size=${14} stroke=${1.75} /></span>
                  <small>${durationText(r.startAt, r.endAt)}</small>
                </span>
                <span class="flight-panel__end flight-panel__end--to"><small>${formatTime(r.endAt)}</small><b>${to.code || to.name}</b><small>${[to.code && to.name, r.toTerminal].filter(Boolean).join(' · ')}</small></span>
              </span>
              <span class="flight-panel__cells flight-panel__cells--labeled">
                <span><small>항공편</small>${flight.flightNo || '-'}</span>
                <span><small>기종</small>${r.aircraft || '-'}</span>
                <span><small>좌석</small>${r.seat || '-'}</span>
              </span>
            </span>
          </div>`
        : html`${photos[0]
            ? html`<button class="detail__imgbtn" aria-label="사진 크게 보기" onClick=${() => openPhotos(photos, 0)}><img class="detail__img" src=${sized(photos[0], 1000)} alt="" /></button>`
            : html`<span class="detail__img detail__img--ph"><${Icon} name="image" size=${28} /></span>`}
          <div class="detail__labels">
            <span class="kind-chip">${r.type === '기타' ? r.subType || '기타' : r.type}</span>
            <${StatusLabel} status=${r.status} onClick=${() => pickStatus(r)} />
          </div>
          <h2 class="detail__title">${r.title}</h2>`}

      <ul class="detail__rows">
        ${r.type !== '항공권' && r.startAt && html`<li><${Icon} name="calendar-days" size=${20} />
          <span>${rangeText(r.startAt, r.endAt)}${r.type === '숙소' && nights ? ' · ' + nights + '박' : ''}</span></li>`}
        ${(r.address || r.mapUrl) && html`<li><${Icon} name="map-pin" size=${20} /><span>${r.address || '지도에서 보기'}</span>
          ${r.mapUrl && html`<a class="detail__act" href=${r.mapUrl} target="_blank" rel="noopener">지도 <${Icon} name="external-link" size=${14} /></a>`}</li>`}
        <li><${Icon} name="hash" size=${20} /><span>${r.bookingNo ? '예약번호 ' + r.bookingNo : '예약번호 아직 없음'}</span>
          ${r.bookingNo && html`<button class="detail__act" onClick=${() => copyText(r.bookingNo, '예약번호를 복사했어요')}>복사 <${Icon} name="copy" size=${14} /></button>`}</li>
        ${who && html`<li><${Icon} name="user" size=${20} /><span>담당 ${who}</span></li>`}
      </ul>

      ${tagList.length > 0 && html`<div class="detail__more">
        <h2>추가 정보</h2>
        <div class="detail__tags">${tagList.map((t) => html`<span class="kind-chip">${t}</span>`)}</div>
      </div>`}
      ${r.memo && html`<p class="memo-box"><${Icon} name="file-text" size=${16} /><span>${r.memo}</span></p>`}
      ${photos.length > 1 && html`<div class="detail__photos">${photos.slice(1).map((p, i) => html`<button aria-label=${'사진 ' + (i + 2) + ' 크게 보기'} onClick=${() => openPhotos(photos, i + 1)}><img src=${sized(p, 500)} alt="" loading="lazy" /></button>`)}</div>`}
      ${r.updatedBy && html`<p class="detail__edited">마지막 수정 · ${r.updatedBy}${r.updatedAt ? ' · ' + syncText(Date.parse(r.updatedAt)) : ''}</p>`}
    </div>
  </main>`;
}
