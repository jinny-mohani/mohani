// 팝업(전체 화면 팝업·바텀시트) 관리.
// 열 때 뒤로 가기 기록을 하나 쌓아서, 안드로이드 뒤로 가기·아이폰 쓸어넘기기로도 닫혀요.
import { html, useEffect, useState } from './vendor/preact-htm.js';

let current = null; // 지금 떠 있는 팝업 (한 번에 하나)
let afterClose = null;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());

/** 팝업 열기. 이미 떠 있으면 그 자리에서 바꿔요 (예: 종류 선택 시트 → 항공권 추가 팝업) */
export function openOverlay(node) {
  if (!current) history.pushState({ hgOverlay: true }, '');
  current = node;
  emit();
}

/** 팝업 닫기. then이 있으면 닫힌 뒤에 실행 (닫고 다른 화면으로 이동할 때) */
export function closeOverlay(then) {
  if (!current) {
    if (then) then();
    return;
  }
  current = null;
  emit();
  if (history.state && history.state.hgOverlay) {
    afterClose = then || null;
    history.back();
  } else if (then) {
    then();
  }
}

window.addEventListener('popstate', () => {
  if (current) {
    current = null;
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
    document.body.style.overflow = current ? 'hidden' : '';
  });
  return current ? html`${current}` : null;
}
