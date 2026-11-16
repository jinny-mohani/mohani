// 07-1 항공권 · 07-2 숙소 · 07-3 기타 — 새로 쓰기와 수정이 같은 화면을 써요 (전체 화면 팝업)
// 07-1-1 추가 정보 펼침 · 07-3-1 종류 직접 입력
import { html, useState } from '../vendor/preact-htm.js';
import { Button, ChipField, Collapsible, Modal, PhotoField, TextArea, TextField } from '../ui/components.js';
import { closeOverlay } from '../overlay.js';
import { getState, uploadPhoto } from '../store.js';
import { saveWithCheck, deleteWithUndo } from '../save.js';
import { back } from '../router.js';
import { datePart, timePart, joinDateTime } from '../date.js';
import { activeMembers } from '../members.js';
import { toast } from '../ui/toast.js';
import { OTHER_KINDS, SEATS, STATUSES, TERMINALS, photoList } from '../reservation-util.js';

function initial(type, row) {
  const r = row || {};
  return {
    title: r.title || '',
    direction: r.direction || '가는 편',
    fromAirport: r.fromAirport || '',
    toAirport: r.toAirport || '',
    date: datePart(r.startAt),
    startTime: timePart(r.startAt),
    endTime: timePart(r.endAt),
    startDate: datePart(r.startAt),
    endDate: datePart(r.endAt),
    bookingNo: r.bookingNo || '',
    status: r.status || '예약 전',
    assignee: r.assignee || (getState().me || ''),
    vendor: r.vendor || '',
    fromTerminal: r.fromTerminal || '',
    seat: r.seat || '',
    memo: r.memo || '',
    mapUrl: r.mapUrl || '',
    address: r.address || '',
    cost: r.cost || '',
    roomType: r.roomType || '',
    roomSize: r.roomSize || '',
    subType: r.subType || (type === '기타' ? '렌터카' : ''),
    people: r.people || '',
    photos: photoList(r), // 문자열(이미 올린 주소) 또는 { dataUrl } (새로 고른 사진)
  };
}

/** 입력값 → 시트 한 줄 */
function toRow(type, f) {
  const base = {
    type,
    bookingNo: f.bookingNo.trim(),
    status: f.status,
    assignee: f.assignee,
    vendor: f.vendor.trim(),
    memo: f.memo.trim(),
    cost: String(f.cost).trim(),
  };
  if (type === '항공권') {
    return {
      ...base,
      title: f.title.trim(),
      direction: f.direction,
      fromAirport: f.fromAirport.trim(),
      toAirport: f.toAirport.trim(),
      startAt: joinDateTime(f.date, f.startTime),
      endAt: f.endTime ? joinDateTime(f.date, f.endTime) : '',
      fromTerminal: f.fromTerminal,
      seat: f.seat,
    };
  }
  if (type === '숙소') {
    return {
      ...base,
      title: f.title.trim(),
      startAt: joinDateTime(f.startDate, f.startTime),
      endAt: joinDateTime(f.endDate, f.endTime),
      checkInTime: f.startTime,
      mapUrl: f.mapUrl.trim(),
      address: f.address.trim(),
      roomType: f.roomType.trim(),
      roomSize: f.roomSize.trim(),
    };
  }
  // 기타: 장소 칸에 지도 링크를 넣으면 지도링크로, 아니면 주소로
  const place = f.address.trim();
  const isLink = /^https?:\/\//.test(place);
  return {
    ...base,
    title: f.title.trim(),
    subType: f.subType.trim(),
    startAt: joinDateTime(f.startDate, f.startTime),
    endAt: joinDateTime(f.endDate, f.endTime),
    address: isLink ? '' : place,
    mapUrl: isLink ? place : f.mapUrl,
    people: String(f.people).trim(),
  };
}

function validate(type, f) {
  if (!f.title.trim()) return type === '항공권' ? '항공편을 입력해 주세요.' : type === '숙소' ? '숙소 이름을 입력해 주세요.' : '예약명을 입력해 주세요.';
  if (type === '기타' && !f.subType.trim()) return '종류를 골라 주세요.';
  return '';
}

/** 날짜 + 시간 한 쌍 */
function DateTime({ label, date, time, onDate, onTime }) {
  return html`<div class="field-pair">
    <input class=${'input' + (date ? '' : ' input--empty')} type="date" aria-label=${label + ' 날짜'} value=${date} onInput=${(e) => onDate(e.currentTarget.value)} />
    <input class=${'input' + (time ? '' : ' input--empty')} type="time" aria-label=${label + ' 시간'} value=${time} onInput=${(e) => onTime(e.currentTarget.value)} style="flex:0 0 112px" />
  </div>`;
}

export function ReservationForm({ type, row }) {
  const isEdit = !!(row && row.id);
  const data = getState().data;
  const members = activeMembers(data);
  const [f, setF] = useState(() => initial(type, row));
  const [more, setMore] = useState(isEdit && type === '숙소'); // 수정 화면(07-2)은 추가 정보가 펼쳐진 상태
  const [customKind, setCustomKind] = useState(type === '기타' && f.subType && !OTHER_KINDS.includes(f.subType));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v && v.currentTarget ? v.currentTarget.value : v }));

  // 예전에 직접 입력한 종류는 다음부터 칩으로 (07-3-1)
  const usedKinds = [...new Set(data.reservations.map((r) => r.subType).filter((k) => k && !OTHER_KINDS.includes(k)))];
  const kindOptions = [...OTHER_KINDS, ...usedKinds, '직접 입력'];

  const save = async () => {
    const msg = validate(type, f);
    if (msg) return setError(msg);
    setBusy(true);
    setError('');
    try {
      // 새로 고른 사진만 올리고, 이미 있던 주소는 그대로
      const urls = [];
      for (const p of f.photos) urls.push(typeof p === 'string' ? p : await uploadPhoto(p.dataUrl, p.mimeType));
      const out = { ...toRow(type, f), photos: urls.join(',') };
      if (isEdit) out.id = row.id;
      const saved = await saveWithCheck('reservations', out, isEdit ? row.updatedAt : undefined);
      closeOverlay();
      if (saved) toast(isEdit ? '저장했어요' : '예약을 추가했어요');
    } catch (err) {
      setError((err.message || '저장 안 됨') + ' · 다시 시도해 주세요');
      setBusy(false);
    }
  };

  const remove = () => {
    closeOverlay(async () => {
      try {
        await deleteWithUndo('reservations', row.id, row.title);
        back('/reservations');
      } catch (e) {
        toast('삭제하지 못했어요 · 다시 시도해 주세요');
      }
    });
  };

  const memberChips = members.map((m) => ({ value: m.id, label: m.name }));
  const status = html`<${ChipField} title="상태" options=${STATUSES} value=${f.status} onChange=${set('status')} />`;
  const assignee = html`<${ChipField} title="담당" options=${memberChips} value=${f.assignee} onChange=${set('assignee')} />`;
  const memo = html`<${TextArea} title="메모" value=${f.memo} onInput=${set('memo')}
    placeholder=${type === '항공권' ? '예) 수하물 15kg 포함\n2시간 전 공항 도착' : '예) 주차 가능\n체크인할 때 신분증 필요'} />`;
  const bookingNo = html`<${TextField} title="예약번호" placeholder=${type === '숙소' ? '예) HT-20381' : '예) AB12CD'} value=${f.bookingNo} onInput=${set('bookingNo')} />`;
  const vendor = html`<${TextField} title="예약처" placeholder="예) 트립닷컴, 네이버 항공" value=${f.vendor} onInput=${set('vendor')} />`;
  const cost = html`<${TextField} title="비용" placeholder="예) 320,000원" value=${f.cost} onInput=${set('cost')} />`;
  const photos = html`<${PhotoField} photos=${f.photos} onChange=${set('photos')} />`;

  let body;
  if (type === '항공권') {
    body = html`
      <${ChipField} title="구분" options=${['가는 편', '오는 편']} value=${f.direction} onChange=${set('direction')} />
      <${TextField} title="항공편" placeholder="예) 제주항공 7C101" value=${f.title} onInput=${set('title')} />
      <div class="field">
        <span class="field__label">출발 · 도착</span>
        <div class="field-pair">
          <input class="input" placeholder="출발 공항" aria-label="출발 공항" value=${f.fromAirport} onInput=${set('fromAirport')} />
          <input class="input" placeholder="도착 공항" aria-label="도착 공항" value=${f.toAirport} onInput=${set('toAirport')} />
        </div>
        <span class="field__help">공항 코드를 앞에 쓰면 크게 보여요 · 예) ICN 인천</span>
      </div>
      <div class="field">
        <span class="field__label">날짜 · 시간</span>
        <div class="field-pair">
          <input class=${'input' + (f.date ? '' : ' input--empty')} type="date" aria-label="날짜" value=${f.date} onInput=${set('date')} />
        </div>
        <div class="field-pair">
          <input class=${'input' + (f.startTime ? '' : ' input--empty')} type="time" aria-label="출발 시간" value=${f.startTime} onInput=${set('startTime')} />
          <span class="field-pair__dash">–</span>
          <input class=${'input' + (f.endTime ? '' : ' input--empty')} type="time" aria-label="도착 시간" value=${f.endTime} onInput=${set('endTime')} />
        </div>
      </div>
      ${bookingNo}${status}${assignee}
      <${Collapsible} title="추가 정보" sub="예약처 · 터미널 · 좌석 · 사진 · 메모" open=${more} onToggle=${() => setMore(!more)}>
        ${vendor}
        <${ChipField} title="터미널" options=${[...TERMINALS.map((t) => ({ value: t, label: t, toggle: true }))]} value=${f.fromTerminal} onChange=${set('fromTerminal')} />
        <${ChipField} title="좌석" options=${SEATS.map((t) => ({ value: t, label: t, toggle: true }))} value=${f.seat} onChange=${set('seat')} />
        ${photos}${memo}
      <//>`;
  } else if (type === '숙소') {
    body = html`
      <${TextField} title="숙소 이름" placeholder="예) 성산 오션뷰 펜션" value=${f.title} onInput=${set('title')} />
      <div class="field">
        <span class="field__label">체크인 · 체크아웃</span>
        <${DateTime} label="체크인" date=${f.startDate} time=${f.startTime} onDate=${set('startDate')} onTime=${set('startTime')} />
        <${DateTime} label="체크아웃" date=${f.endDate} time=${f.endTime} onDate=${set('endDate')} onTime=${set('endTime')} />
      </div>
      <${TextField} title="지도 링크" placeholder="https://maps.app.goo.gl/…" value=${f.mapUrl} onInput=${set('mapUrl')}
        help="구글 지도 앱에서 공유 → 링크 복사로 붙여 넣어요" />
      <${TextField} title="주소" placeholder="예) 제주 서귀포시 성산읍 일출로 00" value=${f.address} onInput=${set('address')} />
      ${bookingNo}${status}${assignee}${photos}
      <${Collapsible} title="추가 정보" sub="예약처 · 비용 · 객실 · 메모" open=${more} onToggle=${() => setMore(!more)}>
        ${vendor}${cost}
        <${TextField} title="객실 형태" placeholder="예) 오션뷰 디럭스 2인실" value=${f.roomType} onInput=${set('roomType')} />
        <${TextField} title="방 크기" placeholder="예) 32㎡" value=${f.roomSize} onInput=${set('roomSize')} />
        ${memo}
      <//>`;
  } else {
    body = html`
      <${ChipField}
        title="종류"
        options=${kindOptions}
        value=${customKind ? '직접 입력' : f.subType}
        onChange=${(v) => {
          if (v === '직접 입력') {
            setCustomKind(true);
            setF((x) => ({ ...x, subType: '' }));
          } else {
            setCustomKind(false);
            setF((x) => ({ ...x, subType: v }));
          }
        }}
      />
      ${customKind && html`<${TextField} title="종류 이름" placeholder="예) 스노클링" value=${f.subType} onInput=${set('subType')}
        help="목록에 없는 종류를 적어요. 다음부터 칩으로 보여요" />`}
      <${TextField} title="예약명" placeholder="예) 렌터카 (4인승 SUV)" value=${f.title} onInput=${set('title')} />
      <div class="field">
        <span class="field__label">날짜 · 시간</span>
        <${DateTime} label="시작" date=${f.startDate} time=${f.startTime} onDate=${set('startDate')} onTime=${set('startTime')} />
        <${DateTime} label="종료" date=${f.endDate} time=${f.endTime} onDate=${set('endDate')} onTime=${set('endTime')} />
        <span class="field__help">투어처럼 하루짜리면 시작만 입력해도 돼요</span>
      </div>
      <${TextField} title="장소" placeholder="구글 지도 링크 또는 주소" value=${f.address || f.mapUrl} onInput=${set('address')} />
      ${bookingNo}${status}${assignee}${photos}
      <${Collapsible} title="추가 정보" sub="예약처 · 비용 · 인원 · 메모" open=${more} onToggle=${() => setMore(!more)}>
        ${vendor}${cost}
        <${TextField} title="인원" placeholder="예) 4명" value=${f.people} onInput=${set('people')} />
        ${memo}
      <//>`;
  }

  const title = (type === '기타' ? '기타 예약' : type) + (isEdit ? ' 수정' : ' 추가');
  const footer = isEdit
    ? html`<div class="modal__foot--split">
        <${Button} variant="secondary" onClick=${remove} disabled=${busy}>삭제<//>
        <${Button} onClick=${save} disabled=${busy}>${busy ? '저장 중…' : '저장하기'}<//>
      </div>`
    : html`<${Button} onClick=${save} disabled=${busy}>${busy ? '저장 중…' : '저장하기'}<//>`;

  return html`<${Modal} title=${title} footer=${footer}>
    <div class="form">
      ${body}
      ${error && html`<p class="form__error" role="alert">${error}</p>`}
    </div>
  <//>`;
}
