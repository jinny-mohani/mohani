// 03-3 홈 › 체크 리스트 · 03-3-1 삭제 되돌리기 · 03-6 추가 · 03-6-1 수정 (바텀시트)
import { html, useEffect, useState } from '../vendor/preact-htm.js';
import { Button, ChipField, Fab, Icon, Sheet, SubHeader, TextField, CheckRow , FormError } from '../ui/components.js';
import { openOverlay, closeOverlay } from '../overlay.js';
import { getState, toggleDone, failed } from '../store.js';
import { saveLater, deleteWithUndo } from '../save.js';
import { activeMembers, memberName } from '../members.js';
import { GROUPS, byGroup, isDone } from '../checklist.js';
import { formatDay } from '../date.js';
import { toast } from '../ui/toast.js';

function dueText(d) {
  return d ? formatDay(d).replace(/ \(.\)$/, '') + '까지' : '';
}

/** 03-6 추가 · 03-6-1 수정 (같은 시트) */
export function ChecklistSheet({ row, group }) {
  const isEdit = !!(row && row.id);
  const { data, me } = getState();
  const members = activeMembers(data);
  const [f, setF] = useState({
    group: (row && row.group) || group || GROUPS[0],
    title: (row && row.title) || '',
    assignee: row ? row.assignee : me,
    dueDate: (row && row.dueDate) || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v && v.currentTarget ? v.currentTarget.value : v }));

  const save = async () => {
    if (!f.title.trim()) return setError('할 일을 입력해 주세요.');
    const out = { group: f.group, title: f.title.trim(), assignee: f.assignee };
    if (isEdit) out.id = row.id;
    saveLater('checklist', out, isEdit ? row.updatedAt : undefined);
    closeOverlay();
  };
  const remove = () =>
    closeOverlay(() => deleteWithUndo('checklist', row.id, row.title).catch(() => toast('삭제하지 못했어요 · 다시 시도해 주세요')));

  const footer = isEdit
    ? html`<div class="modal__foot--split">
        <${Button} variant="secondary" onClick=${remove} disabled=${busy}>삭제<//>
        <${Button} onClick=${save} disabled=${busy}>${busy ? '저장 중…' : '저장하기'}<//>
      </div>`
    : html`<${Button} onClick=${save} disabled=${busy}>${busy ? '저장 중…' : '저장하기'}<//>`;
  return html`<${Sheet} title=${isEdit ? '체크 리스트 수정' : '체크 리스트 추가'} footer=${footer}>
    <div class="form">
      <${ChipField} title="구분" options=${GROUPS} value=${f.group} onChange=${set('group')} />
      <${TextField} title="할 일" placeholder="예) 환전하기" value=${f.title} maxLength="40" onInput=${set('title')} />
      <${ChipField} title="담당" value=${f.assignee} onChange=${set('assignee')}
        options=${[{ value: '각자', label: '각자' }, ...members.map((m) => ({ value: m.id, label: m.name }))]}
        help="각자: 멤버 모두가 해야 하는 일 (각자 체크해요)" />
      <${FormError} error=${error} />
    </div>
  <//>`;
}

/** 03-3 체크 리스트 전체 */
export function Checklist({ data, me, query }) {
  const all = data.checklist.filter((c) => !c.deleted);
  const done = all.filter((c) => isDone(c, me)).length;

  // 홈에서 묶음을 눌러 들어오면 그 묶음으로 스크롤
  useEffect(() => {
    const el = query.group != null && document.getElementById('group-' + query.group);
    if (el) el.scrollIntoView({ block: 'start' });
  }, []);

  const toggle = (c) => toggleDone(c, !isDone(c, me)).catch(() => failNotice(c));
  const failNotice = (c) => toast('연결이 불안정해 저장하지 못했어요', { action: '다시 시도', duration: 6000, onAction: () => retry(c) });
  const retry = (c) => failed[c.id] && failed[c.id]().catch(() => failNotice(c));
  const edit = (c) => openOverlay(html`<${ChecklistSheet} row=${c} />`);

  return html`<main class="screen screen--sub">
    <${SubHeader} title="체크 리스트" fallback="/home" />
    <${Fab} sub=${true} label="체크 리스트 추가" onClick=${() => openOverlay(html`<${ChecklistSheet} />`)} />
    <div class="page">
      <p class="muted" style="font-size:var(--fs-small)">${all.length}개 중 ${done}개 완료 · 이름을 누르면 수정해요</p>
      ${GROUPS.map((g, gi) => {
        const items = byGroup(all, g);
        return html`<section class="cl-group" id=${'group-' + gi} key=${g}>
          <div class="cl-group__head">
            <h2>${g}</h2>
            <span>${items.filter((c) => isDone(c, me)).length} / ${items.length}</span>
          </div>
          ${items.map((c) => {
            const d = isDone(c, me);
            const who = c.assignee === '각자' ? '각자' : memberName(data, c.assignee);
            return html`<div class="cl-row" key=${c.id}>
              <button class="cl-row__check" role="checkbox" aria-checked=${d ? 'true' : 'false'} aria-label=${c.title + (d ? ' 완료 취소' : ' 완료')} onClick=${() => toggle(c)}>
                <span class="checkbox" aria-hidden="true">${d && html`<${Icon} name="check" size=${16} stroke=${2.5} />`}</span>
              </button>
              <button class=${'cl-row__body' + (d ? ' cl-row__body--done' : '')} onClick=${() => edit(c)}>
                <span class="cl-row__title">${c.title}
                  ${failed[c.id] && html`<span class="save-fail" onClick=${(e) => { e.stopPropagation(); retry(c); }}>
                    <${Icon} name="circle-alert" size=${14} />저장 안 됨 · <u>다시 시도</u></span>`}
                </span>
                <span class="cl-row__meta">${who}${c.dueDate ? html`<br /><small>${dueText(c.dueDate)}</small>` : ''}</span>
              </button>
            </div>`;
          })}
          ${!items.length && html`<button class="cl-empty" onClick=${() => openOverlay(html`<${ChecklistSheet} group=${g} />`)}>+ ${g} 추가</button>`}
        </section>`;
      })}
    </div>
  </main>`;
}
