// 03-7 홈 › 최근 삭제 — 지운 항목은 누구나 되살릴 수 있어요
import { html } from '../vendor/preact-htm.js';
import { Empty, Icon, SubHeader } from '../ui/components.js';
import { restoreRow } from '../store.js';
import { toast } from '../ui/toast.js';
import { syncText } from '../date.js';
import { josa } from '../members.js';

const KINDS = [
  { table: 'checklist', label: '체크 리스트', icon: 'list-checks', name: (r) => r.title },
  { table: 'reservations', label: '예약', icon: 'ticket', name: (r) => r.title || r.type },
  { table: 'places', label: '장소', icon: 'map-pin', name: (r) => r.name },
  { table: 'schedule', label: '일정', icon: 'calendar-days', name: (r, d) => {
    const p = r.placeId && d.places.find((x) => x.id === r.placeId);
    return (p && p.name) || r.placeName || '일정';
  } },
  { table: 'members', label: '멤버', icon: 'user', name: (r) => r.name },
];

export function DeletedList({ data }) {
  const items = KINDS.flatMap((k) =>
    data[k.table].filter((r) => r.deleted).map((r) => ({ kind: k, row: r }))
  ).sort((a, b) => String(b.row.deletedAt).localeCompare(String(a.row.deletedAt)));

  const restore = (kind, row) =>
    restoreRow(kind.table, row.id)
      .then(() => toast(`'${kind.name(row, data)}' 되살렸어요`))
      .catch(() => toast('되살리지 못했어요 · 다시 시도해 주세요'));

  return html`<main class="screen screen--sub">
    <${SubHeader} title="최근 삭제" fallback="/home" />
    <div class="page">
      <p class="notice-box"><${Icon} name="trash-2" size=${16} />지운 항목은 누구나 되살릴 수 있어요</p>
      ${items.length
        ? html`<ul style="margin-top:12px">
            ${items.map(({ kind, row }) => html`<li class="deleted-row" key=${kind.table + row.id}>
              <span class="row__icon"><${Icon} name=${kind.icon} size=${20} /></span>
              <span class="row__body">
                <span class="row__title" style="display:block">${kind.name(row, data)}</span>
                <span class="row__sub" style="display:block">
                  ${kind.label} · ${row.deletedBy ? josa(row.deletedBy, '이', '가') + ' 삭제' : '삭제됨'}${row.deletedAt ? ' · ' + syncText(Date.parse(row.deletedAt)) : ''}
                </span>
              </span>
              <button class="pill-btn" onClick=${() => restore(kind, row)}>
                <${Icon} name="rotate-ccw" size=${16} />되살리기
              </button>
            </li>`)}
          </ul>`
        : html`<${Empty} icon="trash-2" title="지운 항목이 없어요" />`}
    </div>
  </main>`;
}
