// 팝업(전체 화면 팝업·바텀시트) 관리 — 여러 겹으로 쌓을 수 있어요 (예: 새 여행 만들기 위에 멤버 추가 시트).
// 한 겹 열 때마다 뒤로 가기 기록을 하나 쌓아서, 안드로이드 뒤로 가기·아이폰 쓸어넘기기로 맨 위 한 겹씩 닫혀요.
import { html, useEffect, useState } from './vendor/preact-htm.js';

let stack = []; // [{ id, node }]
let seq = 0;
let afterClose = null;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());

/** 새 겹 열기 */
export function openOverlay(node) {
  stack = [...stack, { id: ++seq, node }];
  history.pushState({ hgOverlay: stack.length }, '');
  emit();
}

/** 맨 위 겹을 다른 화면으로 바꾸기 (예: 종류 선택 시트 → 항공권 추가 팝업) */
export function replaceOverlay(node) {
  if (!stack.length) return openOverlay(node);
  stack = [...stack.slice(0, -1), { id: ++seq, node }];
  emit();
}

/** 맨 위 겹 닫기. then이 있으면 닫힌 뒤에 실행 (닫고 다른 화면으로 이동할 때) */
export function closeOverlay(then) {
  if (!stack.length) {
    if (then) then();
    return;
  }
  stack = stack.slice(0, -1);
  emit();
  if (history.state && history.state.hgOverlay) {
    afterClose = then || null;
    history.back();
  } else if (then) {
    then();
  }
}

/** 모든 겹 닫기 */
export function closeAllOverlays(then) {
  const n = stack.length;
  if (!n) {
    if (then) then();
    return;
  }
  stack = [];
  emit();
  afterClose = then || null;
  history.go(-n);
}

export function hasOverlay() {
  return stack.length > 0;
}

window.addEventListener('popstate', (e) => {
  const depth = (e.state && e.state.hgOverlay) || 0;
  if (stack.length > depth) {
    stack = stack.slice(0, depth);
    emit();
  }
  if (afterClose) {
    const fn = afterClose;
    afterClose = null;
    setTimeout(fn, 0);
  }
});

export function OverlayHost() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  useEffect(() => {
    // 팝업이 떠 있는 동안 뒤 화면이 스크롤되지 않게
    document.body.style.overflow = stack.length ? 'hidden' : '';
  });
  return html`${stack.map((l) => html`<div class="layer" key=${l.id}>${l.node}</div>`)}`;
}
