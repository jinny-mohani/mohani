// 08 일정 – Day별 코스 · 08-3 시간 없이 목록만 · 08-4 순서 편집 · 08-1 일정 추가/수정 · 08-2 장소 선택
import { html, useRef, useState } from '../vendor/preact-htm.js';
import {
  Button, ChipField, ChipGroup, Empty, Icon, Modal, Sheet, StatusLabel, TextArea, TextField,
  FormError,
  Fab, FieldLabel } from '../ui/components.js';
import { go, replace } from '../router.js';
import { openOverlay, closeOverlay, replaceOverlay } from '../overlay.js';
import { getState, refresh, myName } from '../store.js';
import { api } from '../api.js';
import { saveLater, deleteWithUndo } from '../save.js';
import { tripDays, dayDate, datePart, formatDay, formatTime } from '../date.js';
import { TYPE_ICON, OTHER_ICON, firstPhoto, sized } from '../reservation-util.js';
import { TimeField } from '../ui/pickers.js';
import { toast } from '../ui/toast.js';

const TRANSPORTS = ['도보', '렌터카', '버스', '택시'];
const PLACE_CATEGORIES = ['음식점', '즐길거리', '쇼핑', '디저트'];

const byOrder = (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0);

function placeOf(data, s) {
  return (s.placeId && data.places.find((p) => p.id === s.placeId && !p.deleted)) || null;
}

/** 장소 한 줄 설명: 음식점 · 운영 07:00 – 20:00 (브레이크타임이 있으면 그걸) */
export function placeLine(p) {
  if (!p) return '';
  // 브레이크타임 시간이 있으면 그걸, 아니면 운영시간
  const hours = /\d/.test(p.breakTime || '') ? '브레이크타임 ' + p.breakTime : p.hours ? '운영 ' + p.hours : '';
  return [p.category, hours].filter(Boolean).join(' · ');
}

/** 그날 일정 + 그날 예약을 시간에 맞춰 사이사이에 끼워 넣어요 */
function timeline(data, day) {
  const items = data.schedule.filter((s) => !s.deleted && Number(s.day) === day).sort(byOrder);
  const date = dayDate(data.trip, day);
  const res = data.reservations
    .filter((r) => !r.deleted && r.startAt && datePart(r.startAt) === date)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const rows = items.map((s) => ({ kind: 'item', s }));
  res.forEach((r) => {
    const t = formatTime(r.startAt);
    const at = t ? rows.findIndex((x) => x.kind === 'item' && x.s.time && x.s.time > t) : -1;
    const row = { kind: 'res', r };
    if (at < 0) rows.push(row);
    else rows.splice(at, 0, row);
  });
  return { rows, items };
}

export function Schedule({ data, query }) {
  const days = tripDays(data.trip);
  const day = Math.min(Math.max(Number(query.day) || 1, 1), days);
  const [editing, setEditing] = useState(false);
  const { rows, items } = timeline(data, day);
  const timed = items.some((s) => s.time); // 시간이 하나도 없으면 순서 번호로 (08-3)

  const add = () => openOverlay(html`<${ScheduleForm} day=${day} />`);

  return html`<main class="screen">
    <header class="big-title"><h1>일정</h1></header>
    ${!editing && html`<${Fab} label="일정 추가" onClick=${add} />`}
    <div class="page">
      <div class="day-bar">
        <${ChipGroup}
          label="Day"
          value=${day}
          options=${Array.from({ length: days }, (_, i) => ({ value: i + 1, label: 'Day ' + (i + 1) }))}
          onChange=${(v) => { setEditing(false); replace('/schedule?day=' + v); }}
        />
        ${items.length > 1 &&
        (editing
          ? html`<button class="day-bar__act day-bar__act--done" onClick=${() => setEditing(false)}>완료</button>`
          : html`<button class="day-bar__act" onClick=${() => setEditing(true)}><${Icon} name="arrow-up-down" size=${20} />순서 편집</button>`)}
      </div>
      ${editing
        ? html`<${ReorderList} data=${data} day=${day} items=${items} onDone=${() => setEditing(false)} />`
        : rows.length
          ? html`<ol class="timeline">
              ${rows.map((row, i) => {
                const last = i === rows.length - 1;
                if (row.kind === 'res') {
                  const r = row.r;
                  return html`<li class="tl tl--res" key=${'r' + r.id}>
                    <span class="tl__time">${timed ? formatTime(r.startAt) : i + 1}</span>
                    <span class=${'tl__rail' + (last ? ' tl__rail--last' : '')}><i></i></span>
                    <button class="tl__res" onClick=${() => go('/reservations/' + r.id)}>
                      <span class="tl__res-title">
                        <${Icon} name=${r.type === '기타' ? OTHER_ICON[r.subType] || 'ticket' : TYPE_ICON[r.type]} size=${16} />
                        <b>${r.title}</b><${StatusLabel} status=${r.status} />
                      </span>
                      <span class="tl__sub">예약 정보에서 가져왔어요</span>
                    </button>
                  </li>`;
                }
                const s = row.s;
                const p = placeOf(data, s);
                const sub = p ? placeLine(p) : [s.transport, s.memo && s.memo.split('\n')[0]].filter(Boolean).join(' · ');
                return html`<li class="tl" key=${s.id}>
                  <span class="tl__time">${timed ? s.time || '' : i + 1}</span>
                  <span class=${'tl__rail' + (last ? ' tl__rail--last' : '')}><i></i></span>
                  <div class="tl__body">
                    <button class="tl__edit" aria-label=${p ? p.name + ' 장소 보기' : (s.placeName || '일정') + ' 수정'}
                      onClick=${() => (p ? go('/places/' + p.id) : openOverlay(html`<${ScheduleForm} day=${day} row=${s} />`))}></button>
                    <span class="tl__title">${p ? p.name : s.placeName || '일정'}</span>
                    ${sub && html`<span class="tl__sub">${sub}</span>`}
                  </div>
                  <button class="icon-btn tl__pencil" aria-label=${(p ? p.name : s.placeName || '일정') + ' 일정 수정'}
                    onClick=${() => openOverlay(html`<${ScheduleForm} day=${day} row=${s} />`)}><${Icon} name="pencil" size=${18} /></button>
                </li>`;
              })}
            </ol>`
          : html`<${Empty} icon="calendar-days" title=${`Day ${day} 일정이 없어요`} text="가고 싶은 곳을 순서대로 넣어 봐요. 시간은 비워도 돼요."
              action=${html`<${Button} onClick=${add}>일정 추가<//>`} />`}
    </div>
  </main>`;
}

/** 08-4 순서 편집: 오른쪽 손잡이를 길게 눌러 끌면 순서가 바뀌어요 */
function ReorderList({ data, day, items, onDone }) {
  const [list, setList] = useState(items);
  const [dragId, setDragId] = useState(null);
  const listRef = useRef(null);
  const latest = useRef(list); // 끌기가 끝날 때 최신 순서를 쓰려고
  latest.current = list;
  const dragging = useRef(false);

  const start = (id) => (e) => {
    e.preventDefault();
    dragging.current = true;
    setDragId(id);
    e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    if (!dragId || !listRef.current) return;
    const rows = Array.from(listRef.current.children);
    const y = e.clientY;
    const from = list.findIndex((x) => x.id === dragId);
    let to = rows.findIndex((el) => {
      const r = el.getBoundingClientRect();
      return y < r.top + r.height / 2;
    });
    if (to < 0) to = rows.length - 1;
    if (to !== from) {
      const next = [...list];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      setList(next);
    }
  };
  const end = async () => {
    if (!dragging.current) return;
    dragging.current = false;
    setDragId(null);
    const ids = latest.current.map((x) => x.id);
    if (ids.join() === items.map((x) => x.id).join()) return; // 바뀐 게 없음
    try {
      await api.reorder({ code: getState().current, table: 'schedule', ids, day, by: myName() });
      refresh();
    } catch (err) {
      toast('순서를 저장하지 못했어요 · 다시 시도해 주세요');
    }
  };

  return html`<div>
    <p class="muted" style="margin:8px 0 12px">오른쪽 손잡이를 끌면 순서가 바뀌어요</p>
    <ol class="reorder" ref=${listRef} onPointerMove=${move} onPointerUp=${end} onPointerCancel=${end}>
      ${list.map((s, i) => {
        const p = placeOf(data, s);
        return html`<li class=${'reorder__row' + (dragId === s.id ? ' reorder__row--drag' : '')} key=${s.id}>
          <span class="tl__time">${i + 1}</span>
          <span class="reorder__body">
            <b>${p ? p.name : s.placeName || '일정'}</b>
            <small>${p ? placeLine(p) : s.transport}</small>
          </span>
          <button class="reorder__handle" aria-label=${(p ? p.name : s.placeName) + ' 순서 바꾸기'} onPointerDown=${start(s.id)}
            onKeyDown=${(e) => {
              // 키보드: 위/아래 화살표로 한 칸씩
              const k = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
              if (!k) return;
              e.preventDefault();
              const j = i + k;
              if (j < 0 || j >= list.length) return;
              const next = [...list];
              [next[i], next[j]] = [next[j], next[i]];
              setList(next);
              latest.current = next;
              dragging.current = true;
              end();
            }}>
            <${Icon} name="grip-vertical" size=${20} />
          </button>
        </li>`;
      })}
    </ol>
  </div>`;
}

/** 08-1 일정 추가 · 수정 (전체 화면 팝업) */
export function ScheduleForm({ day, row, placeId }) {
  const isEdit = !!(row && row.id);
  const { data } = getState();
  const days = tripDays(data.trip);
  const knownTransports = [...new Set([...TRANSPORTS, ...data.schedule.map((s) => s.transport).filter(Boolean)])];
  const [f, setF] = useState({
    day: Number(row ? row.day : day) || 1,
    time: (row && row.time) || '',
    placeId: (row && row.placeId) || placeId || '',
    placeName: (row && row.placeName) || '',
    transport: (row && row.transport) || '',
    memo: (row && row.memo) || '',
  });
  const [customTr, setCustomTr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v && v.currentTarget ? v.currentTarget.value : v }));
  const place = f.placeId && data.places.find((p) => p.id === f.placeId);

  const pickPlace = () =>
    openOverlay(html`<${PlacePicker} selected=${f.placeId} onPick=${(id) => setF((x) => ({ ...x, placeId: id, placeName: '' }))} />`);

  const save = async () => {
    if (!f.placeId && !f.placeName.trim()) return setError('장소를 고르거나 직접 입력해 주세요.');
    {
      const out = { ...f, placeName: f.placeId ? '' : f.placeName.trim(), memo: f.memo.trim() };
      if (isEdit) out.id = row.id;
      // 다른 Day로 옮기면 그 Day 맨 아래로
      if (!isEdit || Number(row.day) !== f.day) {
        out.order = data.schedule.filter((s) => !s.deleted && Number(s.day) === f.day).reduce((m, s) => Math.max(m, Number(s.order) || 0), 0) + 1;
      }
      saveLater('schedule', out, isEdit ? row.updatedAt : undefined);
      closeOverlay();
      if (!isEdit) toast(`Day ${f.day}에 추가했어요`);
    }
  };
  const remove = () =>
    closeOverlay(() => deleteWithUndo('schedule', row.id, place ? place.name : row.placeName).catch(() => toast('삭제하지 못했어요')));

  const footer = isEdit
    ? html`<div class="modal__foot--split">
        <${Button} variant="secondary" onClick=${remove} disabled=${busy}>삭제<//>
        <${Button} onClick=${save} disabled=${busy}>${busy ? '저장 중…' : '저장하기'}<//>
      </div>`
    : html`<${Button} onClick=${save} disabled=${busy}>${busy ? '저장 중…' : '저장하기'}<//>`;

  return html`<${Modal} title=${isEdit ? '일정 수정' : '일정 추가'} footer=${footer}>
    <div class="form">
      <${ChipField} title="날짜" value=${f.day} onChange=${set('day')}
        options=${Array.from({ length: days }, (_, i) => ({ value: i + 1, label: 'Day ' + (i + 1) }))}
        help=${formatDay(dayDate(data.trip, f.day))} />
      <div class="field">
        <${FieldLabel}>시간 (선택)<//>
        <${TimeField} label="시간" value=${f.time} onChange=${set('time')} placeholder="시간 고르기" />
        <span class="field__help">비워 두면 순서 번호로 보여요</span>
      </div>
      <div class="field">
        <${FieldLabel}>장소<//>
        ${place
          ? html`<div class="place-pick">
              <span class="place-pick__img">${firstPhoto(place) ? html`<img src=${sized(firstPhoto(place), 200)} alt="" />` : html`<${Icon} name="image" size=${18} />`}</span>
              <span class="place-pick__text"><b>${place.name}</b><small>${placeLine(place)}</small></span>
              <button class="place-pick__change" onClick=${pickPlace}>변경</button>
            </div>`
          : html`<button class="btn-outline" style="min-height:52px;font-size:var(--fs-body)" onClick=${pickPlace}>
              <${Icon} name="map-pin" size=${18} />장소 목록에서 고르기
            </button>`}
        <div class="or-line"><span>또는</span></div>
        <input class="input" placeholder="직접 입력  예) 숙소 출발, 휴식" aria-label="장소 직접 입력" value=${f.placeId ? '' : f.placeName}
          onInput=${(e) => setF((x) => ({ ...x, placeName: e.currentTarget.value, placeId: '' }))} />
        <span class="field__help">장소 목록에 없는 일정(이동, 휴식 등)은 직접 입력해요</span>
      </div>
      <${ChipField} title="이동수단" value=${customTr ? '__custom' : f.transport}
        options=${[...knownTransports.map((t) => ({ value: t, label: t, toggle: true })), { value: '__custom', label: '+ 직접 입력' }]}
        onChange=${(v) => { if (v === '__custom') { setCustomTr(true); setF((x) => ({ ...x, transport: '' })); } else { setCustomTr(false); set('transport')(v); } }}
        help="선택 · 이전 일정에서 여기까지" />
      ${customTr && html`<${TextField} title="이동수단 이름" placeholder="예) 페리" value=${f.transport} onInput=${set('transport')} />`}
      <${TextArea} title="메모" placeholder=${'예) 일출 보려면 6시 출발\n입장료 5,000원'} value=${f.memo} onInput=${set('memo')} />
      <${FormError} error=${error} />
    </div>
  <//>`;
}

/** 08-2 장소 선택 (바텀시트) */
function PlacePicker({ selected, onPick }) {
  const { data } = getState();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('전체');
  const [pick, setPick] = useState(selected || '');
  const list = data.places
    .filter((p) => !p.deleted)
    .filter((p) => cat === '전체' || p.category === cat)
    .filter((p) => !q.trim() || String(p.name).includes(q.trim()));

  const newPlace = async () => {
    const { PlaceForm } = await import('./places.js');
    replaceOverlay(html`<${PlaceForm} />`);
  };

  return html`<${Sheet} title="장소 선택" footer=${html`<${Button} disabled=${!pick} onClick=${() => { onPick(pick); closeOverlay(); }}>선택 완료<//>`}>
    <div class="search">
      <${Icon} name="search" size=${18} />
      <input placeholder="장소 이름 검색" aria-label="장소 이름 검색" value=${q} onInput=${(e) => setQ(e.currentTarget.value)} />
    </div>
    <div style="margin:12px 0">
      <${ChipGroup} label="카테고리" value=${cat} onChange=${setCat} options=${['전체', ...PLACE_CATEGORIES].map((v) => ({ value: v, label: v }))} />
    </div>
    <button class="pick-row" onClick=${newPlace}>
      <span class="pick-row__img pick-row__img--new"><${Icon} name="plus" size=${20} /></span>
      <span class="pick-row__text"><b>새 장소 등록하기</b></span>
    </button>
    <ul>
      ${list.map((p) => html`<li key=${p.id}>
        <button class=${'pick-row' + (pick === p.id ? ' pick-row--on' : '')} aria-pressed=${pick === p.id ? 'true' : 'false'} onClick=${() => setPick(pick === p.id ? '' : p.id)}>
          <span class="pick-row__img">${firstPhoto(p) ? html`<img src=${sized(firstPhoto(p), 200)} alt="" />` : html`<${Icon} name="image" size=${16} />`}</span>
          <span class="pick-row__text"><b>${p.name}</b><small>${placeLine(p)}</small></span>
          ${pick === p.id && html`<span class="pick-row__check"><${Icon} name="check" size=${14} stroke=${2.5} /></span>`}
        </button>
      </li>`)}
    </ul>
    ${!list.length && html`<p class="muted" style="padding:12px 0">${q ? '찾는 장소가 없어요' : '아직 등록한 장소가 없어요'}</p>`}
  <//>`;
}
