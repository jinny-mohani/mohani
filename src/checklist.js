// 체크 리스트 규칙 (기획안 '3. 체크 리스트')
export const GROUPS = ['여행 전 할 일', '짐 꾸리기', '공항에서 할 일'];

/** 완료했나? '각자' 일은 내가 했는지, 아니면 누군가 했는지 */
export function isDone(item, meId) {
  const list = String(item.doneBy || '').split(',').filter(Boolean);
  return item.assignee === '각자' ? list.includes(meId) : list.length > 0;
}

export function byGroup(items, group) {
  return items
    .filter((c) => !c.deleted && c.group === group)
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
}

/** 홈 카드에 보일 항목: 안 한 일을 목록 순서대로 먼저, 부족하면 위쪽 완료 항목으로 채움 */
export function homePick(items, meId, max) {
  const todo = items.filter((c) => !isDone(c, meId));
  const done = items.filter((c) => isDone(c, meId));
  return [...todo, ...done].slice(0, max);
}
