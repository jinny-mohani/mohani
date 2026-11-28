// 체크 리스트 규칙 (기획안 '3. 체크 리스트', 11.22 공통/개인으로 다시 정리)
// 공통: 친구 모두에게 보임 · 담당(멤버 1명 또는 '각자'). 개인: 쓴 사람만 보임 · '내 짐' / '내 할 일'
export const COMMON = '공통';
export const MY_PACK = '개인 짐';
export const MY_TODO = '개인 할 일';
export const PERSONAL = [MY_PACK, MY_TODO];
export const LABEL = { [COMMON]: '공통', [MY_PACK]: '내 짐', [MY_TODO]: '내 할 일' };

/** 개인 항목인가? (예전 구분 '여행 전 할 일·짐 꾸리기·공항에서 할 일'은 모두 공통으로 봐요) */
export const isPersonal = (item) => PERSONAL.includes(item.group);
/** 시트에 적힌 구분을 새 구분으로 */
export const groupOf = (item) => (isPersonal(item) ? item.group : COMMON);

/**
 * 내 화면에 보일 항목: 공통 전부 + 내가 쓴 개인 항목.
 * 개인 항목은 앱 화면에서만 숨겨요 (시트에는 저장돼요 — 사용자 결정 A, 11.22)
 */
export function visibleItems(items, meId) {
  return items.filter((c) => !isPersonal(c) || c.assignee === meId);
}

/** 완료했나? '각자' 일은 내가 했는지, 아니면 누군가 했는지 */
export function isDone(item, meId) {
  const list = String(item.doneBy || '').split(',').filter(Boolean);
  return item.assignee === '각자' ? list.includes(meId) : list.length > 0;
}

export function byGroup(items, group) {
  return items
    .filter((c) => !c.deleted && groupOf(c) === group)
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
}
