// 목록에서 고르기 · 날짜 고르기 (07-1 피드백: 글자 입력 대신 고르기)
import { html, useState } from '../vendor/preact-htm.js';
import { Button, ChipGroup, Icon, Sheet } from './components.js';
import { openOverlay, closeOverlay } from '../overlay.js';
import { formatDay, parseDate, tripDays, dayDate } from '../date.js';

/** 입력칸처럼 생긴 고르기 버튼 */
export function SelectField({ label, value, placeholder, onClick }) {
  return html`<button type="button" class=${'input select' + (value ? '' : ' input--empty')} aria-label=${label} onClick=${onClick}>
    <span>${value || placeholder}</span><${Icon} name="chevron-down" size=${18} />
  </button>`;
}

/** 목록에서 하나 고르기 (검색 + 직접 입력) */
export function OptionSheet({ title, options, value, onPick, searchable = true, groups, customLabel = '직접 입력' }) {
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('전체');
  const t = q.trim().toLowerCase();
  const list = options
    .filter((o) => group === '전체' || o.group === group)
    .filter((o) => !t || o.label.toLowerCase().includes(t) || String(o.sub || '').toLowerCase().includes(t));
  const pick = (v) => { onPick(v); closeOverlay(); };
  return html`<${Sheet} title=${title}>
    ${searchable && html`<div class="search">
      <${Icon} name="search" size=${18} />
      <input placeholder="이름이나 코드로 검색" aria-label="검색" value=${q} onInput=${(e) => setQ(e.currentTarget.value)} />
    </div>`}
    ${groups && html`<div style="margin-top:12px"><${ChipGroup} label="지역" value=${group} onChange=${setGroup}
      options=${['전체', ...groups].map((g) => ({ value: g, label: g }))} /></div>`}
    <ul class="opt-list">
      ${list.map((o) => html`<li key=${o.value}>
        <button class="opt" aria-pressed=${o.value === value ? 'true' : 'false'} onClick=${() => pick(o.value)}>
          ${o.sub && html`<b class="opt__code">${o.sub}</b>`}<span>${o.label}</span>
          ${o.value === value && html`<${Icon} name="check" size=${20} stroke=${2} />`}
        </button>
      </li>`)}
      ${t && html`<li><button class="opt" onClick=${() => pick(q.trim())}><${Icon} name="pencil" size=${18} /><span>${customLabel}: <b>${q.trim()}</b></span></button></li>`}
    </ul>
    ${!list.length && !t && html`<p class="muted" style="padding:12px 0">목록이 없어요</p>`}
    ${!t && html`<p class="field__help" style="margin-top:8px">목록에 없으면 검색창에 적고 '${customLabel}'을 눌러요</p>`}
  <//>`;
}

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** 달력 시트 — 여행 날짜(Day 1·2·3)를 위에 먼저 보여줘요 */
export function DateSheet({ title = '날짜 선택', value, onPick, trip, min }) {
  const base = parseDate(value) || parseDate(trip && trip.startDate) || new Date();
  const [month, setMonth] = useState(new Date(base.getFullYear(), base.getMonth(), 1));
  const [sel, setSel] = useState(value || '');
  const days = trip && trip.startDate ? tripDays(trip) : 0;
  const tripStart = trip && trip.startDate;
  const tripEnd = trip && trip.endDate;

  const first = month.getDay();
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  const move = (d) => setMonth(new Date(month.getFullYear(), month.getMonth() + d, 1));
  const done = (v) => { onPick(v); closeOverlay(); };

  return html`<${Sheet} title=${title} footer=${html`<${Button} disabled=${!sel} onClick=${() => done(sel)}>선택 완료<//>`}>
    ${days > 0 && html`<div class="date-days">
      ${Array.from({ length: days }, (_, i) => {
        const d = dayDate(trip, i + 1);
        return html`<button class="chip" aria-pressed=${sel === d ? 'true' : 'false'} onClick=${() => setSel(d)}>
          Day ${i + 1} <small>${formatDay(d)}</small></button>`;
      })}
    </div>`}
    <div class="cal">
      <div class="cal__head">
        <button class="icon-btn" aria-label="이전 달" onClick=${() => move(-1)}><${Icon} name="chevron-left" /></button>
        <b>${month.getFullYear()}년 ${month.getMonth() + 1}월</b>
        <button class="icon-btn" aria-label="다음 달" onClick=${() => move(1)}><${Icon} name="chevron-right" /></button>
      </div>
      <div class="cal__grid" role="grid">
        ${WEEK.map((w) => html`<span class="cal__w">${w}</span>`)}
        ${cells.map((d, i) => {
          if (!d) return html`<span key=${'e' + i}></span>`;
          const v = ymd(d);
          const inTrip = tripStart && v >= tripStart && v <= tripEnd;
          const off = min && v < min;
          return html`<button key=${v} disabled=${off}
            class=${'cal__d' + (inTrip ? ' cal__d--trip' : '') + (sel === v ? ' cal__d--on' : '') + (v === ymd(new Date()) ? ' cal__d--today' : '')}
            aria-pressed=${sel === v ? 'true' : 'false'} aria-label=${formatDay(v)} onClick=${() => setSel(v)}>${d.getDate()}</button>`;
        })}
      </div>
      ${tripStart && html`<p class="field__help" style="margin-top:8px">회색 바탕은 여행 기간이에요</p>`}
    </div>
  <//>`;
}

/** 날짜 칸: 누르면 달력 시트 */
export function DateField({ label, value, onChange, trip, min, placeholder = '날짜 선택' }) {
  return html`<${SelectField} label=${label} value=${value ? formatDay(value) : ''} placeholder=${placeholder}
    onClick=${() => openOverlay(html`<${DateSheet} title=${label} value=${value} trip=${trip} min=${min} onPick=${onChange} />`)} />`;
}
