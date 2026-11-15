// 05 예약 목록 · 05-4~6 상세 · 07-0 종류 선택 · 07-1~3 작성
// 2단계: 화면 패턴(칩 걸러 보기, 서브 페이지, 바텀시트, 전체 화면 팝업)을 연결해 둔 상태
import { html } from '../vendor/preact-htm.js';
import {
  Button, ChipGroup, Empty, Icon, Modal, Row, Sheet, SubHeader, TextField, Todo, TopTitle,
} from '../ui/components.js';
import { go, replace } from '../router.js';
import { openOverlay, closeOverlay } from '../overlay.js';
import { formatDay, formatTime } from '../date.js';

const TYPES = [
  { type: '항공권', icon: 'plane', sub: '가는 편 · 오는 편' },
  { type: '숙소', icon: 'bed-double', sub: '체크인 · 체크아웃' },
  { type: '기타', icon: 'ticket', sub: '렌터카 · 투어 · 체험 · 입장권' },
];
const iconOf = (type) => (TYPES.find((t) => t.type === type) || TYPES[2]).icon;

function when(r) {
  const start = [formatDay(r.startAt), formatTime(r.startAt)].filter(Boolean).join(' ');
  return start || '날짜 미정';
}

export function Reservations({ data, query }) {
  const filter = query.type || '전체';
  const all = data.reservations.filter((r) => !r.deleted);
  const list = filter === '전체' ? all : all.filter((r) => r.type === filter);

  const add = () => {
    if (filter === '전체') openOverlay(html`<${TypeSheet} />`);
    else openOverlay(html`<${EditModal} type=${filter} />`);
  };

  return html`<main class="screen">
    <${TopTitle} title="예약정보">
      <button class="icon-btn" aria-label="예약 추가" onClick=${add}><${Icon} name="plus" /></button>
    <//>
    <div class="page">
      <${ChipGroup}
        label="예약 종류"
        value=${filter}
        options=${['전체', '항공권', '숙소', '기타'].map((v) => ({ value: v, label: v }))}
        onChange=${(v) => replace(v === '전체' ? '/reservations' : '/reservations?type=' + v)}
      />
      ${list.length
        ? html`<ul style="margin-top:12px">
            ${list.map(
              (r) => html`<li>
                <${Row}
                  icon=${iconOf(r.type)}
                  title=${r.title || r.type}
                  sub=${when(r) + (r.status ? ' · ' + r.status : '')}
                  onClick=${() => go('/reservations/' + r.id)}
                />
              </li>`
            )}
          </ul>`
        : html`<${Empty}
            icon="ticket"
            title="아직 예약이 없어요"
            text="항공권, 숙소 예약을 추가해 친구들과 같이 봐요."
            action=${html`<${Button} onClick=${add}>예약 추가<//>`}
          />`}
      <${Todo}>예약 카드 디자인(05~05-3)은 3단계에서 피그마대로 만들어요.<//>
    </div>
  </main>`;
}

/** 05-4~6 상세 (서브 페이지) */
export function ReservationDetail({ data, id }) {
  const r = data.reservations.find((x) => x.id === id);
  if (!r) {
    return html`<main class="screen screen--sub">
      <${SubHeader} title="예약" fallback="/reservations" />
      <${Empty} icon="ticket" title="지워졌거나 없는 예약이에요" />
    </main>`;
  }
  return html`<main class="screen screen--sub">
    <${SubHeader} title=${r.type + ' 상세'} fallback="/reservations">
      <button class="icon-btn" aria-label="더 보기"><${Icon} name="ellipsis" /></button>
    <//>
    <div class="page">
      <h2 style="font-size:var(--fs-display);font-weight:700;margin:16px 0">${r.title}</h2>
      <p>${when(r)}</p>
      ${r.address && html`<p class="muted">${r.address}</p>`}
      ${r.updatedBy && html`<p class="muted" style="margin-top:24px">마지막 수정 · ${r.updatedBy}</p>`}
      <div style="margin-top:24px">
        <${Button} onClick=${() => openOverlay(html`<${EditModal} type=${r.type} row=${r} />`)}>수정<//>
      </div>
      <${Todo}>상세 화면(05-4~05-6)은 3단계에서 피그마대로 만들어요.<//>
    </div>
  </main>`;
}

/** 07-0 종류 선택 (바텀시트) */
function TypeSheet() {
  return html`<${Sheet} title="어떤 예약을 추가할까요?">
    <ul>
      ${TYPES.map(
        (t) => html`<li>
          <${Row}
            icon=${t.icon}
            title=${t.type}
            sub=${t.sub}
            onClick=${() => openOverlay(html`<${EditModal} type=${t.type} />`)}
          />
        </li>`
      )}
    </ul>
  <//>`;
}

/** 07-1~3 작성·수정 (전체 화면 팝업) — 저장은 4단계에서 연결 */
function EditModal({ type, row }) {
  return html`<${Modal}
    title=${type + (row ? ' 수정' : ' 추가')}
    footer=${html`<${Button} onClick=${() => closeOverlay()}>저장하기<//>`}
  >
    <div style="display:flex;flex-direction:column;gap:24px">
      <${TextField} title="예약명" placeholder="예) 제주항공 7C101" value=${row ? row.title : ''} />
      <${Todo}>입력 항목(07-1~07-3)과 저장은 3·4단계에서 만들어요. 지금 저장하기를 누르면 닫히기만 해요.<//>
    </div>
  <//>`;
}
