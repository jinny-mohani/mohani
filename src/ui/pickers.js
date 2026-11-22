// 목록에서 고르기 · 날짜 고르기 (07-1 피드백: 글자 입력 대신 고르기)
import { html, useState, useEffect, useRef } from '../vendor/preact-htm.js';
import { Button, ChipGroup, Icon, Modal, Sheet } from './components.js';
import { openOverlay, closeOverlay } from '../overlay.js';
import { formatDay, parseDate, tripDays, dayDate } from '../date.js';

/** 입력칸처럼 생긴 고르기 버튼 */
export function SelectField({ label, value, placeholder, onClick }) {
  return html`<button type="button" class=${'input select' + (value ? '' : ' input--empty')} aria-label=${label} onClick=${onClick}>
    <span>${value || placeholder}</span><${Icon} name="select-down" size=${18} stroke=${1.87} />
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

/* ───── 시간 고르기 (공통4 피드백: 시계판 대신 시·분 목록) ───── */
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

function hourLabel(h) {
  const n = Number(h);
  return `${n < 12 ? '오전' : '오후'} ${n % 12 === 0 ? 12 : n % 12}시`;
}

/** 시 목록 + 분 목록을 각각 눌러 고르기. 고른 값이 위에 크게 보여요 */
export function TimeSheet({ title = '시간 선택', value, onPick }) {
  const [h0, m0] = (value || '').split(':');
  const [h, setH] = useState(h0 || '');
  // 5분 단위가 아닌 예전 값도 그대로 보이게
  const [m, setM] = useState(m0 || (h0 ? '00' : ''));
  const minutes = m && !MINUTES.includes(m) ? [...MINUTES, m].sort() : MINUTES;
  const listRef = (sel) => (el) => {
    // 고른 칸이 목록 가운데쯤 보이게 (처음 열 때)
    if (el && !el.dataset.done) {
      el.dataset.done = '1';
      const on = el.querySelector('[aria-pressed="true"]');
      if (on) el.scrollTop = on.offsetTop - el.clientHeight / 2 + on.clientHeight / 2;
    }
  };
  const done = (v) => { onPick(v); closeOverlay(); };
  return html`<${Sheet} title=${title} footer=${html`<div class="modal__foot--split">
      <${Button} variant="secondary" onClick=${() => done('')}>지우기<//>
      <${Button} disabled=${!h || !m} onClick=${() => done(`${h}:${m}`)}>선택 완료<//>
    </div>`}>
    <p class="time-preview" aria-live="polite">${h ? hourLabel(h) : '--시'} ${m ? Number(m) + '분' : '--분'}</p>
    <div class="time-cols">
      <div class="time-col" role="listbox" aria-label="시" ref=${listRef('h')}>
        ${HOURS.map((x) => html`<button role="option" aria-selected=${x === h} aria-pressed=${x === h ? 'true' : 'false'} key=${x}
          class="time-opt" onClick=${() => { setH(x); if (!m) setM('00'); }}>${hourLabel(x)}</button>`)}
      </div>
      <div class="time-col" role="listbox" aria-label="분" ref=${listRef('m')}>
        ${minutes.map((x) => html`<button role="option" aria-selected=${x === m} aria-pressed=${x === m ? 'true' : 'false'} key=${x}
          class="time-opt" onClick=${() => setM(x)}>${x}분</button>`)}
      </div>
    </div>
  <//>`;
}

/** 시간 칸: 누르면 시간 시트. 비어 있으면 placeholder */
export function TimeField({ label, value, onChange, placeholder = '시간' }) {
  return html`<${SelectField} label=${label} value=${value ? hourLabel(value.slice(0, 2)) + (value.slice(3) !== '00' ? ' ' + Number(value.slice(3)) + '분' : '') : ''} placeholder=${placeholder}
    onClick=${() => openOverlay(html`<${TimeSheet} title=${label} value=${value} onPick=${onChange} />`)} />`;
}

/* ───── 운영시간 고르기: 여는 시간 | 닫는 시간을 한 팝업에서 (30분 단위) ───── */
const HALF_HOURS = HOURS.flatMap((h) => [`${h}:00`, `${h}:30`]);
export function timeText(v) {
  if (!v) return '';
  const [h, m] = v.split(':');
  return hourLabel(h) + (m && m !== '00' ? ` ${Number(m)}분` : '');
}
/** 여는 시간을 누르고 닫는 시간을 누르면 바로 저장하고 닫혀요 (탭 3번) */
export function HoursSheet({ title = '운영시간', open, close, onPick, labels = ['여는 시간', '닫는 시간'] }) {
  const [a, setA] = useState(open || '');
  const [b, setB] = useState(close || '');
  const list = (cur) => (cur && !HALF_HOURS.includes(cur) ? [...HALF_HOURS, cur].sort() : HALF_HOURS);
  // 처음 열 때 고른 칸(없으면 오전 9시 / 오후 9시)이 가운데쯤 보이게
  const centerOn = (fallback) => (el) => {
    if (!el || el.dataset.done) return;
    el.dataset.done = '1';
    requestAnimationFrame(() => { // 화면에 그려진 뒤에 위치 계산
      const on = el.querySelector('[aria-pressed="true"]') || el.querySelector(`[data-v="${fallback}"]`);
      if (on) el.scrollTop = on.offsetTop - el.offsetTop - el.clientHeight / 2 + on.clientHeight / 2;
    });
  };
  const done = (x, y) => { onPick(x, y); closeOverlay(); };
  // 여는 시간 → 닫는 시간 순서로 누르면 닫는 시간을 누를 때 저장. 여는 시간만 바꿀 때는 '선택 완료'
  const pickA = (v) => setA(v);
  const pickB = (v) => { setB(v); if (a) done(a, v); };
  const col = (label, cur, pick, fallback) => html`<div class="hours-col">
    <span class="hours-col__label">${label}</span>
    <div class="time-col" role="listbox" aria-label=${label} ref=${centerOn(fallback)}>
      ${list(cur).map((v) => html`<button role="option" key=${v} data-v=${v} aria-selected=${v === cur} aria-pressed=${v === cur ? 'true' : 'false'}
        class="time-opt" onClick=${() => pick(v)}>${timeText(v)}</button>`)}
    </div>
  </div>`;
  return html`<${Sheet} title=${title} footer=${html`<div class="modal__foot--split">
      <${Button} variant="secondary" onClick=${() => done('', '')}>지우기<//>
      <${Button} disabled=${!a || !b} onClick=${() => done(a, b)}>선택 완료<//>
    </div>`}>
    <p class="time-preview" aria-live="polite">${a ? timeText(a) : labels[0]} – ${b ? timeText(b) : labels[1]}</p>
    <div class="time-cols">
      ${col(labels[0], a, pickA, '09:00')}
      ${col(labels[1], b, pickB, '21:00')}
    </div>
  <//>`;
}
/** 운영시간 칸 하나: 누르면 HoursSheet */
export function HoursField({ label = '운영시간', open, close, onChange, placeholder = '여는 시간 – 닫는 시간', labels }) {
  const value = open || close ? `${timeText(open) || '?'} – ${timeText(close) || '?'}` : '';
  return html`<${SelectField} label=${label} value=${value} placeholder=${placeholder}
    onClick=${() => openOverlay(html`<${HoursSheet} title=${label} open=${open} close=${close} labels=${labels} onPick=${onChange} />`)} />`;
}

/* ───── 예약 시간 고르기: 시작 ~ 끝 날짜·시간을 한 팝업에서 (07-3, 11.22) ─────
 * 날짜는 여행 기간의 Day 칩만 (달력 없음), 시간은 30분 단위.
 * 시작 시간을 누르면 '끝'으로 넘어가고, 끝 시간을 누르면 바로 저장·닫힘 → 탭 4번 안팎 */
export function PeriodSheet({ title = '날짜 시간', trip, start, end, onPick, labels = ['시작', '끝'] }) {
  const days = trip && trip.startDate ? tripDays(trip) : 0;
  const dayList = Array.from({ length: days }, (_, i) => dayDate(trip, i + 1));
  const [tab, setTab] = useState(0);
  const [v, setV] = useState([{ ...start }, { ...end }]); // [{date,time},{date,time}]
  const cur = v[tab];
  const set = (i, patch) => setV((x) => x.map((o, k) => (k === i ? { ...o, ...patch } : o)));
  const extra = [v[0].date, v[1].date].filter((d) => d && !dayList.includes(d)); // 여행 기간 밖 예전 값
  const dates = [...dayList, ...extra.filter((d, i, a) => a.indexOf(d) === i)];
  const times = cur.time && !HALF_HOURS.includes(cur.time) ? [...HALF_HOURS, cur.time].sort() : HALF_HOURS;
  const done = (x) => { onPick(x[0], x[1]); closeOverlay(); };
  const pickTime = (t) => {
    const next = v.map((o, k) => (k === tab ? { ...o, time: t } : o));
    if (tab === 0) {
      if (!next[0].date && dates[0]) next[0].date = dates[0];
      if (!next[1].date) next[1].date = next[0].date; // 끝 날짜는 시작과 같은 날로 미리
      setV(next); setTab(1);
    } else {
      if (!next[1].date) next[1].date = next[0].date;
      done(next);
    }
  };
  const label = (o) => (o.date ? formatDay(o.date) : '') + (o.time ? ' ' + timeText(o.time) : '');
  const centerOn = (el) => {
    if (!el || el.dataset.tab === String(tab)) return;
    el.dataset.tab = String(tab);
    requestAnimationFrame(() => {
      const on = el.querySelector('[aria-pressed="true"]') || el.querySelector('[data-v="09:00"]');
      if (on) el.scrollTop = on.offsetTop - el.offsetTop - el.clientHeight / 2 + on.clientHeight / 2;
    });
  };
  return html`<${Sheet} title=${title} footer=${html`<div class="modal__foot--split">
      <${Button} variant="secondary" onClick=${() => done([{ date: '', time: '' }, { date: '', time: '' }])}>지우기<//>
      <${Button} disabled=${!v[0].date} onClick=${() => done(v)}>선택 완료<//>
    </div>`}>
    <div class="period-tabs" role="tablist">
      ${labels.map((l, i) => html`<button role="tab" aria-selected=${tab === i} class=${'period-tab' + (tab === i ? ' period-tab--on' : '')} onClick=${() => setTab(i)}>
        <small>${l}${i === 1 ? ' (선택)' : ''}</small><b>${label(v[i]) || '고르기'}</b></button>`)}
    </div>
    ${dates.length > 0 && html`<div class="date-days">
      ${dates.map((d) => {
        const n = dayList.indexOf(d);
        return html`<button class="chip" key=${d} aria-pressed=${cur.date === d ? 'true' : 'false'} onClick=${() => set(tab, { date: d })}>
          ${n >= 0 ? html`Day ${n + 1} ` : ''}<small>${formatDay(d)}</small></button>`;
      })}
    </div>`}
    <div class="time-col period-times" role="listbox" aria-label=${labels[tab] + ' 시간'} ref=${centerOn}>
      ${times.map((t) => html`<button role="option" key=${t} data-v=${t} aria-selected=${t === cur.time} aria-pressed=${t === cur.time ? 'true' : 'false'}
        class="time-opt" onClick=${() => pickTime(t)}>${timeText(t)}</button>`)}
    </div>
    <p class="field__help" style="margin-top:8px">하루짜리면 시작만 고르고 '선택 완료'를 눌러요</p>
  <//>`;
}
/** 시작 ~ 끝 칸 하나: 누르면 PeriodSheet */
export function PeriodField({ label = '날짜 시간', trip, start, end, onChange, placeholder = '시작 – 끝 고르기' }) {
  const txt = (o) => [o.date ? formatDay(o.date) : '', o.time ? timeText(o.time) : ''].filter(Boolean).join(' ');
  const a = txt(start), b = txt(end);
  const sameDay = start.date && end.date === start.date;
  const value = a ? a + (b ? ' – ' + (sameDay && end.time ? timeText(end.time) : b) : '') : '';
  return html`<${SelectField} label=${label} value=${value} placeholder=${placeholder}
    onClick=${() => openOverlay(html`<${PeriodSheet} title=${label} trip=${trip} start=${start} end=${end} onPick=${onChange} />`)} />`;
}

/* ───── 기간 고르기 (11.22 피그마 '체크인 · 체크아웃': 전체 화면, 달을 위아래로 이어서 스크롤) ───── */
const monthsBetween = (a, b) => (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth();

export function DateRangeSheet({ title = '날짜 선택', start, end, onPick, labels = ['출발', '도착'] }) {
  const [s, setS] = useState(start || '');
  const [e, setE] = useState(end || '');
  const today = ymd(new Date());
  // 보여줄 달: (시작일·오늘 중 이른 달) ~ 그 뒤 12달
  const [months] = useState(() => {
    const t = new Date();
    const st = parseDate(start);
    const from = st && st < t ? new Date(st.getFullYear(), st.getMonth(), 1) : new Date(t.getFullYear(), t.getMonth(), 1);
    return Array.from({ length: 13 }, (_, i) => new Date(from.getFullYear(), from.getMonth() + i, 1));
  });
  const listRef = useRef(null);
  // 처음 열면 고른 시작일이 있는 달로 스크롤
  useEffect(() => {
    const st = parseDate(start);
    if (!st || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-m="${monthsBetween(months[0], st)}"]`);
    const box = listRef.current.closest('.modal__body');
    if (el && box) box.scrollTop = el.offsetTop - listRef.current.offsetTop;
  }, []);
  // 처음 누르면 시작, 두 번째로 누르면 끝. 다 고른 뒤 다시 누르면 새로 시작
  const tap = (v) => {
    if (!s || (s && e)) { setS(v); setE(''); }
    else if (v < s) { setS(v); }
    else { setE(v); }
  };
  return html`<${Modal} title=${title} className="modal--cal"
    footer=${html`<${Button} disabled=${!s || !e} onClick=${() => { onPick(s, e); closeOverlay(); }}>선택 완료<//>`}>
    <div class="rcal__sum" aria-live="polite">
      <span class="rcal__sumicon"><${Icon} name="calendar" size=${20} bold /></span>
      ${s ? html`<b>${formatDay(s)}</b><span class="rcal__dash">-</span>${e && html`<b>${formatDay(e)}</b>`}`
        : html`<span class="rcal__hint">${labels[0]} 날짜를 골라 주세요</span>`}
    </div>
    <div class="rcal__week" aria-hidden="true">${WEEK.map((w) => html`<span>${w}</span>`)}</div>
    <div class="rcal__list" ref=${listRef}>
      ${months.map((m, mi) => {
        const count = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
        const cells = [...Array(m.getDay()).fill(null), ...Array.from({ length: count }, (_, i) => new Date(m.getFullYear(), m.getMonth(), i + 1))];
        return html`<section class="rcal__month" data-m=${mi} key=${mi}>
          <h2>${m.getFullYear()}년 ${m.getMonth() + 1}월</h2>
          <div class="rcal__grid" role="grid">
            ${cells.map((d, i) => {
              if (!d) return html`<span key=${'e' + i}></span>`;
              const v = ymd(d);
              const edge = v === s || v === e;
              const band = s && e && s !== e && v >= s && v <= e;
              const cls = 'rcal__d' + (band ? ' rcal__d--band' : '') + (band && v === s ? ' rcal__d--from' : '') + (band && v === e ? ' rcal__d--to' : '') + (edge ? ' rcal__d--on' : '');
              return html`<button key=${v} class=${cls} aria-pressed=${edge ? 'true' : 'false'}
                aria-label=${formatDay(v) + (v === today ? ' 오늘' : '')} onClick=${() => tap(v)}>
                <span class="rcal__n">${d.getDate()}</span>${v === today && html`<small class="rcal__today">오늘</small>`}</button>`;
            })}
          </div>
        </section>`;
      })}
    </div>
  <//>`;
}

/** 기간 칸: '12.19 (토) – 12.21 (월)' 하나로, 누르면 기간 달력 */
export function DateRangeField({ label, start, end, onChange, placeholder = '날짜 선택', labels }) {
  const text = start && end ? `${formatDay(start)} – ${formatDay(end)}` : start ? `${formatDay(start)} – ` : '';
  return html`<${SelectField} label=${label} value=${text} placeholder=${placeholder}
    onClick=${() => openOverlay(html`<${DateRangeSheet} title=${label} start=${start} end=${end} labels=${labels} onPick=${onChange} />`)} />`;
}
