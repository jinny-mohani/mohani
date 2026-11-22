// 03-3 홈 › 체크 리스트 · 03-3-1 삭제 되돌리기 · 03-6 추가 · 03-6-1 수정 (바텀시트)
// 11.22: 공통(친구 모두) / 개인(나만 — 내 짐 · 내 할 일) 두 탭으로 다시 정리
import { html, useEffect, useState } from '../vendor/preact-htm.js';
import { Button, ChipField, ChipGroup, Fab, Icon, Sheet, SubHeader, TextField, FormError } from '../ui/components.js';
import { openOverlay, closeOverlay } from '../overlay.js';
import { replace } from '../router.js';
import { getState, toggleDone, failed } from '../store.js';
import { saveLater, deleteWithUndo } from '../save.js';
import { activeMembers, memberName } from '../members.js';
import { COMMON, MY_PACK, MY_TODO, LABEL, byGroup, groupOf, isDone, isPersonal, visibleItems } from '../checklist.js';
import { toast } from '../ui/toast.js';

/** 03-6 추가 · 03-6-1 수정 (같은 시트) */
export function ChecklistSheet({ row, group }) {
  const isEdit = !!(row && row.id);
  const { data, me } = getState();
  const members = activeMembers(data);
  const startGroup = row ? groupOf(row) : group || COMMON;
  const [f, setF] = useState({
    kind: startGroup === COMMON ? COMMON : '개인',
    mine: startGroup === COMMON ? MY_PACK : startGroup,
    title: (row && row.title) || '',
    assignee: row && !isPersonal(row) ? row.assignee : me,
  });
  const [error, setError] = useState('');
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v && v.currentTarget ? v.currentTarget.value : v }));
  const personal = f.kind === '개인';

  const save = () => {
    if (!f.title.trim()) return setError('할 일을 입력해 주세요.');
    // 개인 항목은 담당 = 나 (내 화면에만 보여요)
    const out = { group: personal ? f.mine : COMMON, title: f.title.trim(), assignee: personal ? me : f.assignee || me };
    if (isEdit) out.id = row.id;
    if (isEdit && (row.assignee === '각자') !== (out.assignee === '각자')) out.doneBy = ''; // 체크 방식이 바뀌면 완료 표시 새로
    saveLater('checklist', out, isEdit ? row.updatedAt : undefined);
    closeOverlay();
  };
  const remove = () =>
    closeOverlay(() => deleteWithUndo('checklist', row.id, row.title).catch(() => toast('삭제하지 못했어요 · 다시 시도해 주세요')));

  const footer = isEdit
    ? html`<div class="modal__foot--split">
        <${Button} variant="secondary" onClick=${remove}>삭제<//>
        <${Button} onClick=${save}>저장하기<//>
      </div>`
    : html`<${Button} onClick=${save}>저장하기<//>`;
  return html`<${Sheet} title=${isEdit ? '체크 리스트 수정' : '체크 리스트 추가'} footer=${footer}>
    <div class="form">
      <${ChipField} title="구분" options=${[COMMON, '개인']} value=${f.kind} onChange=${set('kind')}
        help=${personal ? '개인 항목은 친구들 화면에 안 보여요' : '공통 항목은 친구 모두에게 보여요'} />
      ${personal && html`<${ChipField} title="종류" value=${f.mine} onChange=${set('mine')}
        options=${[{ value: MY_PACK, label: '짐' }, { value: MY_TODO, label: '할 일' }]} />`}
      <${TextField} title="할 일" placeholder=${personal ? (f.mine === MY_PACK ? '예) 원피스 3벌, 고데기' : '예) 유심 사기') : '예) 버스투어 예약'}
        value=${f.title} maxLength="40" onInput=${set('title')} />
      ${!personal && html`<${ChipField} title="담당" value=${f.assignee} onChange=${set('assignee')}
        options=${[{ value: '각자', label: '각자' }, ...members.map((m) => ({ value: m.id, label: m.name }))]}
        help="각자: 멤버 모두가 해야 하는 일 (각자 체크해요)" />`}
      <${FormError} error=${error} />
    </div>
  <//>`;
}

/** 03-3 체크 리스트 전체: [공통] [개인] 탭 */
export function Checklist({ data, me, query }) {
  const all = visibleItems(data.checklist.filter((c) => !c.deleted), me);
  const tab = query.tab === 'mine' ? 'mine' : 'common';
  const groups = tab === 'mine' ? [MY_PACK, MY_TODO] : [COMMON];

  // 홈에서 묶음을 눌러 들어오면 그 묶음으로 스크롤
  useEffect(() => {
    const el = query.group && document.getElementById('group-' + query.group);
    if (el) el.scrollIntoView({ block: 'start' });
  }, []);

  const toggle = (c) => toggleDone(c, !isDone(c, me)).catch(() => failNotice(c));
  const failNotice = (c) => toast('연결이 불안정해 저장하지 못했어요', { action: '다시 시도', duration: 6000, onAction: () => retry(c) });
  const retry = (c) => failed[c.id] && failed[c.id]().catch(() => failNotice(c));
  const edit = (c) => openOverlay(html`<${ChecklistSheet} row=${c} />`);
  const add = (g) => openOverlay(html`<${ChecklistSheet} group=${g} />`);

  return html`<main class="screen screen--sub">
    <${SubHeader} title="체크 리스트" fallback="/home" />
    <${Fab} sub=${true} label="체크 리스트 추가" onClick=${() => add(tab === 'mine' ? MY_PACK : COMMON)} />
    <div class="page cl-page">
      <${ChipGroup} label="체크 리스트 구분" value=${tab}
        options=${[{ value: 'common', label: '공통' }, { value: 'mine', label: '개인' }]}
        onChange=${(v) => replace(v === 'mine' ? '/home/checklist?tab=mine' : '/home/checklist')} />
      <p class="cl-note"><${Icon} name=${tab === 'mine' ? 'lock' : 'users'} size=${16} />
        ${tab === 'mine' ? '나만 보는 목록이에요 · 친구들 화면에는 안 보여요' : '친구 모두가 함께 보는 목록이에요'}</p>
      ${groups.map((g) => {
        const items = byGroup(all, g);
        const done = items.filter((c) => isDone(c, me)).length;
        return html`<section class="cl-group" id=${'group-' + g.replace(/ /g, '')} key=${g}>
          <div class="cl-group__head">
            <h2>${tab === 'mine' ? LABEL[g] : '함께 할 일'}</h2>
            <span class="cl-count" aria-label=${`${items.length}개 중 ${done}개 완료`}><b>${done}</b><i>/</i>${items.length}</span>
          </div>
          <div class="cl-card">
          ${items.map((c) => {
            const d = isDone(c, me);
            const who = isPersonal(c) || c.assignee === '각자' ? '' : memberName(data, c.assignee); // 각자·개인 할 일은 이름 없이
            return html`<div class="cl-row" key=${c.id}>
              <button class="cl-row__check" role="checkbox" aria-checked=${d ? 'true' : 'false'} aria-label=${c.title + (d ? ' 완료 취소' : ' 완료')} onClick=${() => toggle(c)}>
                <span class="checkbox" aria-hidden="true">${d && html`<${Icon} name="check" size=${16} stroke=${2.5} />`}</span>
              </button>
              <button class=${'cl-row__body' + (d ? ' cl-row__body--done' : '')} onClick=${() => edit(c)}>
                <span class="cl-row__title">${c.title}
                  ${failed[c.id] && html`<span class="save-fail" onClick=${(e) => { e.stopPropagation(); retry(c); }}>
                    <${Icon} name="circle-alert" size=${14} />저장 안 됨 · <u>다시 시도</u></span>`}
                </span>
                ${who && html`<span class="cl-row__meta">${who}</span>`}
              </button>
            </div>`;
          })}
          ${!items.length && html`<button class="cl-empty" onClick=${() => add(g)}>+ ${tab === 'mine' ? LABEL[g] : '함께 할 일'} 추가</button>`}
          </div>
        </section>`;
      })}
    </div>
  </main>`;
}
