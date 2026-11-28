// 03 홈 — 체크 리스트 (11.28 확정: 프로토타입 '홈 체크 리스트 시안')
// 공통 · 내 짐 · 내 할 일 카드를 옆으로 넘겨요. 항목은 상세 화면과 같은 순서 그대로 (체크해도 순서가 안 바뀜).
// 처음 5개 → '더 보기'로 10개까지, 10개가 넘으면 카드 안에서 스크롤. 카드 키는 가장 긴 카드(최대 5줄)에 맞추고, 빈 카드는 숨겨요.
import { html, useState } from '../vendor/preact-htm.js';
import { CheckRow, Icon } from '../ui/components.js';
import { go } from '../router.js';
import { openOverlay } from '../overlay.js';
import { toggleDone } from '../store.js';
import { memberName } from '../members.js';
import { COMMON, MY_PACK, MY_TODO, LABEL, byGroup, isDone, isPersonal, visibleItems } from '../checklist.js';
import { toast } from '../ui/toast.js';
import { ChecklistSheet } from './checklist.js';

const FIRST = 5;
const OPEN = 10;
const ROW_H = 44;

export function HomeChecklist({ data, me }) {
  const [open, setOpen] = useState({});
  const [at, setAt] = useState(0);
  const all = visibleItems(data.checklist.filter((c) => !c.deleted), me); // 개인 항목은 쓴 사람만
  const groups = [COMMON, MY_PACK, MY_TODO].map((g) => ({ g, items: byGroup(all, g) })).filter((x) => x.items.length);

  const toggle = (item) =>
    toggleDone(item, !isDone(item, me)).catch(() =>
      toast('연결이 불안정해 저장하지 못했어요', { action: '다시 시도', duration: 6000, onAction: () => toggle(item) }));
  const assignee = (c) => (isPersonal(c) || c.assignee === '각자' ? '' : memberName(data, c.assignee)); // 각자·개인 할 일은 이름 없이

  const rows = Math.max(1, ...groups.map((x) => Math.min(x.items.length, FIRST)));
  const anyMore = groups.some((x) => x.items.length > FIRST);
  const onScroll = (e) => {
    const row = e.currentTarget;
    const w = row.firstElementChild ? row.firstElementChild.getBoundingClientRect().width + 12 : 1;
    setAt(Math.round(row.scrollLeft / w));
  };

  return html`<section class="home-section">
    <button class="home-section__head" onClick=${() => go('/home/checklist')}>
      <h2>체크 리스트</h2>
      <${Icon} name="select-right" size=${18} stroke=${1.4} label="전체 보기" />
    </button>
    ${!groups.length
      ? html`<button class="home-add" onClick=${() => openOverlay(html`<${ChecklistSheet} group=${COMMON} />`)}><${Icon} name="plus" size=${18} />할 일을 추가해 보세요</button>`
      : html`
        ${groups.length > 1 && html`<div class="tk-dots hc-dots" aria-hidden="true">${groups.map((_, k) => html`<i class=${k === at ? 'on' : ''}></i>`)}</div>`}
        <div class=${'hc-row' + (groups.length === 1 ? ' hc-row--one' : '')} onScroll=${onScroll}>
          ${groups.map(({ g, items }) => {
            const done = items.filter((c) => isDone(c, me)).length;
            const pct = Math.round((done / items.length) * 100);
            const mine = g !== COMMON;
            const isOpen = !!open[g];
            const list = isOpen ? (items.length > OPEN ? items : items.slice(0, OPEN)) : items.slice(0, FIRST);
            const detail = () => go(mine ? '/home/checklist?tab=mine&group=' + g.replace(/ /g, '') : '/home/checklist');
            return html`<div class="hc-card" key=${g}>
              <button class="hc-card__head" onClick=${detail} aria-label=${LABEL[g] + ' ' + done + '개 완료, 전체 ' + items.length + '개'}>
                <h3>${LABEL[g]}${mine && html`<${Icon} name="lock" size=${14} label="나만 보기" />`}</h3>
                <span class="hc-count" aria-hidden="true"><b>${done}</b><i>/</i>${items.length}</span>
              </button>
              <div class="hc-bar" role="progressbar" aria-label=${LABEL[g] + ' 진행'} aria-valuemin="0" aria-valuemax="100" aria-valuenow=${pct}><i style=${'width:' + pct + '%'}></i></div>
              <div class=${'hc-list' + (isOpen && items.length > OPEN ? ' hc-list--scroll' : '')} style=${'min-height:' + rows * ROW_H + 'px'}>
                ${list.map((c) => html`<${CheckRow} key=${c.id} checked=${isDone(c, me)} label=${c.title} meta=${assignee(c)} onToggle=${() => toggle(c)} />`)}
              </div>
              ${items.length > FIRST
                ? html`<button class="hc-more" aria-expanded=${isOpen ? 'true' : 'false'} onClick=${() => setOpen({ ...open, [g]: !isOpen })}>
                    ${isOpen ? '접기' : `더 보기 (${items.length - FIRST})`}<${Icon} name="chevron-down" size=${16} />
                  </button>`
                : anyMore ? html`<div class="hc-more-space"></div>` : html`<div class="hc-end"></div>`}
            </div>`;
          })}
        </div>`}
  </section>`;
}
