// 09 장소 목록(전체: 카테고리별 가로 스와이프) · 09-2 카테고리 탭(2열) · 10 장소 상세 · 09-1 장소 등록/수정
import { html, useState } from '../vendor/preact-htm.js';
import {
  Avatar, Button, ChipField, ChipGroup, Empty, Icon, Modal, PhotoField, Sheet, TextArea, TextField,
  FormError,
  Fab,
} from '../ui/components.js';
import { go, replace, back } from '../router.js';
import { openOverlay, closeOverlay, replaceOverlay } from '../overlay.js';
import { getState, uploadPhoto } from '../store.js';
import { saveLater, deleteWithUndo } from '../save.js';
import { activeMembers } from '../members.js';
import { photoList, firstPhoto, sized } from '../reservation-util.js';
import { copyText } from '../share.js';
import { syncText } from '../date.js';
import { toast } from '../ui/toast.js';
import { PhotoViewer } from '../ui/viewer.js';
import { TimeField } from '../ui/pickers.js';

export const CATEGORIES = ['음식점', '즐길거리', '쇼핑', '디저트'];

const sortPlaces = (list) => [...list].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

/** 사진 카드: 사진 위에 이름 · 메모 1줄 · 운영시간 · 지도 */
export function PlaceCard({ p }) {
  const photo = firstPhoto(p);
  return html`<div class="place-card">
    <button class="place-card__open" onClick=${() => go('/places/' + p.id)} aria-label=${p.name + ' 상세 보기'}>
      ${photo ? html`<img src=${sized(photo, 600)} alt="" loading="lazy" />` : html`<span class="place-card__empty"><${Icon} name="image" size=${28} /></span>`}
      <span class="place-card__shade"></span>
      <span class="place-card__text">
        <b>${p.name}</b>
        ${p.memo && html`<span class="place-card__memo">${p.memo.split('\n')[0]}</span>`}
        <small>${p.hours || ' '}</small>
      </span>
    </button>
    ${p.mapUrl && html`<a class="place-card__map" href=${p.mapUrl} target="_blank" rel="noopener" aria-label=${p.name + ' 구글 지도에서 보기'}>
      <${Icon} name="map-pin" size=${18} />
    </a>`}
  </div>`;
}

export function Places({ data, query }) {
  const cat = CATEGORIES.includes(query.category) ? query.category : '전체';
  const all = sortPlaces(data.places.filter((p) => !p.deleted));
  const add = () => openOverlay(html`<${PlaceForm} category=${cat === '전체' ? '' : cat} />`);
  const groups = CATEGORIES.map((c) => ({ c, list: all.filter((p) => p.category === c) })).filter((g) => g.list.length);
  const list = cat === '전체' ? all : all.filter((p) => p.category === cat);

  return html`<main class="screen screen--tint">
    <header class="big-title"><h1>장소</h1></header>
    <${Fab} label="장소 등록" onClick=${add} />
    <div class="page">
      <${ChipGroup}
        label="카테고리"
        value=${cat}
        options=${['전체', ...CATEGORIES].map((v) => ({ value: v, label: v }))}
        onChange=${(v) => replace(v === '전체' ? '/places' : '/places?category=' + v)}
      />
      ${!list.length
        ? html`<${Empty} icon="map-pin" title=${cat === '전체' ? '아직 장소가 없어요' : `아직 ${cat}이 없어요`}
            text="가고 싶은 곳을 모아 두면 일정에 바로 넣을 수 있어요." action=${html`<${Button} onClick=${add}>장소 등록<//>`} />`
        : cat === '전체'
          ? groups.map(({ c, list: l }) => html`<section class="place-group" key=${c}>
              <button class="place-group__head" onClick=${() => replace('/places?category=' + c)}>
                <h2>${c}<small>${l.length}</small></h2><${Icon} name="chevron-right" size=${20} />
              </button>
              <div class="place-row">${l.slice(0, 5).map((p) => html`<${PlaceCard} key=${p.id} p=${p} />`)}</div>
            </section>`)
          : html`<p class="list-summary">${list.length}곳</p>
            <div class="place-grid">${list.map((p) => html`<${PlaceCard} key=${p.id} p=${p} />`)}</div>`}
    </div>
  </main>`;
}

/** 10 장소 상세: 사진이 위를 채우고 흰 시트가 겹쳐 올라와요 */
export function PlaceDetail({ data, id }) {
  const p = data.places.find((x) => x.id === id);
  if (!p || p.deleted) {
    return html`<main class="screen screen--sub">
      <header class="sub-header"><button class="icon-btn" aria-label="뒤로" onClick=${() => back('/places')}><${Icon} name="chevron-left" /></button></header>
      <${Empty} icon="map-pin" title="지워졌거나 없는 장소예요" text="지운 장소는 홈 › 여행 설정 › 최근 삭제에서 되살릴 수 있어요." />
    </main>`;
  }
  const photos = photoList(p);
  const author = activeMembers(data).find((m) => m.name === p.updatedBy);
  const addToSchedule = async () => {
    const { ScheduleForm } = await import('./schedule.js');
    openOverlay(html`<${ScheduleForm} day=${1} placeId=${p.id} />`);
  };
  const more = () => openOverlay(html`<${Sheet} title=${p.name}>
    <ul>
      <li><button class="menu-row" onClick=${() => closeOverlay(addToSchedule)}><${Icon} name="calendar-days" size=${20} /><span>일정에 추가</span></button></li>
      <li><button class="menu-row" onClick=${() => replaceOverlay(html`<${PlaceForm} row=${p} />`)}><${Icon} name="pencil" size=${20} /><span>수정</span></button></li>
      <li><button class="menu-row" onClick=${() => closeOverlay(() => {
        deleteWithUndo('places', p.id, p.name).catch(() => toast('삭제하지 못했어요'));
        back('/places');
      })}><${Icon} name="trash-2" size=${20} /><span>삭제</span></button></li>
    </ul>
  <//>`);

  return html`<main class="screen screen--sub place-detail">
    <div class="place-detail__hero">
      ${photos[0]
        ? html`<button class="place-detail__heroimg" aria-label="사진 크게 보기" onClick=${() => openOverlay(html`<${PhotoViewer} photos=${photos} index=${0} />`)}><img src=${sized(photos[0], 1000)} alt="" /></button>`
        : html`<span class="place-detail__ph"><${Icon} name="image" size=${32} /></span>`}
      <button class="round-float round-float--left" aria-label="뒤로" onClick=${() => back('/places')}><${Icon} name="chevron-left" /></button>
      <button class="round-float round-float--right" aria-label="더 보기" onClick=${more}><${Icon} name="ellipsis" /></button>
    </div>
    <div class="place-detail__sheet">
      ${author && html`<span class="place-detail__author" title=${author.name + '님이 등록'}><${Avatar} member=${author} size=${56} /></span>`}
      <h1 class="place-detail__title">${p.name}${p.category && html`<span class="kind-chip">${p.category}</span>`}</h1>
      ${(p.address || p.mapUrl) && html`<div class="place-detail__addr">
        <${Icon} name="map-pin" size=${18} /><span>${p.address || '주소 미입력'}</span>
        ${p.mapUrl && html`<a class="round-btn" href=${p.mapUrl} target="_blank" rel="noopener" aria-label="구글 지도에서 보기" title="구글 지도에서 보기"><${Icon} name="map" size=${20} /></a>`}
        ${p.address && html`<button class="round-btn" aria-label="주소 복사" title="주소 복사" onClick=${() => copyText(p.address, '주소를 복사했어요')}><${Icon} name="copy" size=${20} /></button>`}
      </div>`}
      <div class="info-cells">
        <span><small>운영시간</small>${p.hours || '-'}</span>
        <span><small>브레이크타임</small>${p.breakTime || '-'}</span>
        <span><small>웨이팅</small>${p.waiting || '-'}</span>
      </div>
      ${p.memo && html`<p class="memo-box">${p.memo}</p>`}
      ${photos.length > 0 && html`<section class="place-detail__photos">
        <h2>사진 <small>${photos.length}</small></h2>
        <div>${photos.map((src, i) => html`<button aria-label=${'사진 ' + (i + 1) + ' 크게 보기'} onClick=${() => openOverlay(html`<${PhotoViewer} photos=${photos} index=${i} />`)}><img src=${sized(src, 400)} alt="" loading="lazy" /></button>`)}</div>
      </section>`}
      ${p.updatedBy && html`<p class="detail__edited">마지막 수정 · ${p.updatedBy}${p.updatedAt ? ' · ' + syncText(Date.parse(p.updatedAt)) : ''}</p>`}
    </div>
  </main>`;
}

function splitRange(s) {
  const m = String(s || '').match(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/);
  return m ? [m[1].padStart(5, '0'), m[2].padStart(5, '0')] : ['', ''];
}

/** 09-1 장소 등록 (새로 쓰기 · 수정 공용) — 모든 카테고리가 같은 화면 */
export function PlaceForm({ row, category }) {
  const isEdit = !!(row && row.id);
  const r = row || {};
  const [open1, close1] = splitRange(r.hours);
  const [bs, be] = splitRange(r.breakTime);
  const [f, setF] = useState({
    category: r.category || category || CATEGORIES[0],
    name: r.name || '',
    photos: photoList(r),
    mapUrl: r.mapUrl || '',
    address: r.address || '',
    open: open1, close: close1,
    hasBreak: r.breakTime ? r.breakTime !== '없음' : null,
    breakStart: bs, breakEnd: be,
    waiting: r.waiting || '',
    memo: r.memo || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v && v.currentTarget ? v.currentTarget.value : v }));

  const save = async () => {
    if (!f.name.trim()) return setError('장소 이름을 입력해 주세요.');
    setBusy(true);
    try {
      const out = {
        category: f.category,
        name: f.name.trim(),
        mapUrl: f.mapUrl.trim(),
        address: f.address.trim(),
        hours: f.open || f.close ? `${f.open} – ${f.close}` : '',
        // 시간 입력은 다음 버전. 예전에 시간이 들어간 값은 그대로 둬요
        breakTime: f.hasBreak === false ? '없음' : f.hasBreak ? (r.breakTime && r.breakTime !== '없음' ? r.breakTime : '있음') : '',
        waiting: f.waiting,
        memo: f.memo.trim(),
      };
      if (isEdit) out.id = row.id;
      saveLater('places', out, isEdit ? row.updatedAt : undefined, f.photos);
      closeOverlay();
      if (!isEdit) toast(`'${out.name}' 등록했어요`);
    } catch (e) {
      setError((e.message || '저장 안 됨') + ' · 다시 시도해 주세요');
      setBusy(false);
    }
  };
  const remove = () => closeOverlay(async () => {
    try { await deleteWithUndo('places', row.id, row.name); back('/places'); } catch (e) { toast('삭제하지 못했어요'); }
  });

  const footer = isEdit
    ? html`<div class="modal__foot--split">
        <${Button} variant="secondary" onClick=${remove} disabled=${busy}>삭제<//>
        <${Button} onClick=${save} disabled=${busy}>${busy ? '저장 중…' : '저장하기'}<//>
      </div>`
    : html`<${Button} onClick=${save} disabled=${busy}>${busy ? '저장 중…' : '저장하기'}<//>`;

  const timePair = (a, b, la, lb) => html`<div class="field-pair">
    <${TimeField} label=${la} value=${f[a]} onChange=${set(a)} placeholder=${la.includes('여는') ? '여는 시간' : '시작'} />
    <span class="field-pair__dash">–</span>
    <${TimeField} label=${lb} value=${f[b]} onChange=${set(b)} placeholder=${lb.includes('닫는') ? '닫는 시간' : '끝'} />
  </div>`;

  return html`<${Modal} title=${isEdit ? '장소 수정' : '장소 등록'} footer=${footer}>
    <div class="form">
      <${ChipField} title="카테고리" options=${CATEGORIES} value=${f.category} onChange=${set('category')} />
      <${TextField} title="장소 이름" placeholder="예) 자매국수" value=${f.name} maxLength="40" onInput=${set('name')} />
      <div>
        <${PhotoField} photos=${f.photos} onChange=${set('photos')} max=${3} />
        <span class="field__help" style="display:block;margin-top:8px">최대 3장 · 가로 6:5 비율로 보여요</span>
      </div>
      <${TextField} title="구글 지도 링크" placeholder="구글 지도 링크 붙여넣기" value=${f.mapUrl} onInput=${set('mapUrl')}
        help="구글 지도 앱 → 공유 → 링크 복사" />
      <${TextField} title="정확한 주소" placeholder="예) 제주시 탑동로 00, 1층" value=${f.address} onInput=${set('address')}
        help="건물 이름, 층, 근처 랜드마크까지 적으면 찾기 쉬워요" />
      <div class="field">
        <span class="field__label">운영시간</span>
        ${timePair('open', 'close', '여는 시간', '닫는 시간')}
      </div>
      <div class="field">
        <span class="field__label">브레이크타임</span>
        <div class="chips chips--wrap">
          <button class="chip" aria-pressed=${f.hasBreak === true ? 'true' : 'false'} onClick=${() => set('hasBreak')(f.hasBreak === true ? null : true)}>있음</button>
          <button class="chip" aria-pressed=${f.hasBreak === false ? 'true' : 'false'} onClick=${() => set('hasBreak')(f.hasBreak === false ? null : false)}>없음</button>
        </div>

      </div>
      <${ChipField} title="웨이팅" value=${f.waiting} onChange=${set('waiting')}
        options=${['있음', '없음'].map((v) => ({ value: v, label: v, toggle: true }))} help="선택" />
      <${TextArea} title="메모" placeholder=${'예) 웨이팅 있음\n오픈 시간에 맞춰 가기'} value=${f.memo} onInput=${set('memo')} />
      <${FormError} error=${error} />
    </div>
  <//>`;
}
