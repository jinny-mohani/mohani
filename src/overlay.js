// 팝업(전체 화면 팝업·바텀시트) 관리 — 여러 겹으로 쌓을 수 있어요 (예: 새 여행 만들기 위에 멤버 추가 시트).
// 한 겹 열 때마다 뒤로 가기 기록을 하나 쌓아서, 안드로이드 뒤로 가기·아이폰 쓸어넘기기로 맨 위 한 겹씩 닫혀요.
//
// 접근성 (Impeccable 점검 P2):
// - 열리면 포커스를 팝업 안으로 옮기고, 뒤 화면은 inert(누를 수도 읽을 수도 없음)로
// - 닫히면 포커스를 팝업을 연 버튼으로 돌려줘요
// - Esc로 맨 위 한 겹 닫기, Tab은 맨 위 팝업 안에서만 돌아요
import { html, useEffect, useState } from './vendor/preact-htm.js';

let stack = []; // [{ id, node, opener, onClose }]
let seq = 0;
let afterClose = null;
let restoreTo = null; // 닫힌 뒤 포커스를 돌려줄 요소
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());

/** 겹을 걷어낼 때: 닫힘 알림(onClose)을 부르고, 가장 아래 걷힌 겹을 연 버튼으로 포커스를 돌려줄 준비 */
function dropTo(depth) {
  const removed = stack.slice(depth);
  stack = stack.slice(0, depth);
  if (removed.length) restoreTo = removed[0].opener;
  removed.reverse().forEach((l) => l.onClose && l.onClose());
}

/**
 * 새 겹 열기.
 * opts.onClose: 어떤 방법으로 닫히든(✕, 바깥 누르기, 뒤로 가기, Esc) 한 번 불려요
 */
export function openOverlay(node, opts = {}) {
  stack = [...stack, { id: ++seq, node, opener: document.activeElement, onClose: opts.onClose }];
  history.pushState({ hgOverlay: stack.length }, '');
  emit();
}

/** 맨 위 겹을 다른 화면으로 바꾸기 (예: 종류 선택 시트 → 항공권 추가 팝업). 연 버튼은 처음 것을 기억해요 */
export function replaceOverlay(node, opts = {}) {
  if (!stack.length) return openOverlay(node, opts);
  const top = stack[stack.length - 1];
  if (top.onClose) top.onClose();
  stack = [...stack.slice(0, -1), { id: ++seq, node, opener: top.opener, onClose: opts.onClose }];
  emit();
}

/** 맨 위 겹 닫기. then이 있으면 닫힌 뒤에 실행 (닫고 다른 화면으로 이동할 때) */
export function closeOverlay(then) {
  if (!stack.length) {
    if (then) then();
    return;
  }
  dropTo(stack.length - 1);
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
  dropTo(0);
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
    dropTo(depth);
    emit();
  }
  if (afterClose) {
    const fn = afterClose;
    afterClose = null;
    setTimeout(fn, 0);
  }
});

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function topLayerEl() {
  const layers = document.querySelectorAll('#app > .layer');
  return layers[layers.length - 1] || null;
}

window.addEventListener('keydown', (e) => {
  if (!stack.length) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    closeOverlay();
    return;
  }
  if (e.key !== 'Tab') return;
  // Tab은 맨 위 팝업 안에서만
  const layer = topLayerEl();
  if (!layer) return;
  const items = Array.from(layer.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (!layer.contains(document.activeElement)) {
    e.preventDefault();
    first.focus();
  } else if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});

const focusedIds = new Set(); // 이미 한 번 포커스를 준 겹 (다시 드러날 때는 팝업 전체가 아니라 연 버튼으로)

export function OverlayHost() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  useEffect(() => {
    // 팝업이 떠 있는 동안 뒤 화면이 스크롤되지 않게
    document.getElementById('app').style.overflow = stack.length ? 'hidden' : '';

    // 뒤 화면과 아래 겹은 inert: 누를 수도, 화면 읽기로 읽을 수도 없게 (알림 토스트는 그대로)
    const app = document.getElementById('app');
    const layers = Array.from(app.querySelectorAll(':scope > .layer'));
    Array.from(app.children).forEach((el) => {
      if (el.classList.contains('toast')) return;
      const isLayer = el.classList.contains('layer');
      el.inert = stack.length > 0 && (!isLayer || el !== layers[layers.length - 1]);
    });

    const top = stack[stack.length - 1];
    if (top && !focusedIds.has(top.id)) {
      // 새 겹: 팝업 자체로 포커스 (화면 읽기가 팝업 이름부터 읽어요)
      const layer = layers[layers.length - 1];
      const dialog = layer && (layer.querySelector('[role="dialog"], [role="alertdialog"]') || layer.firstElementChild);
      if (dialog) {
        focusedIds.add(top.id);
        if (!dialog.hasAttribute('tabindex')) dialog.setAttribute('tabindex', '-1');
        dialog.focus({ preventScroll: true });
      } else {
        // 팝업이 아직 화면에 안 붙었으면 다음 프레임에 다시
        requestAnimationFrame(emit);
      }
    } else if (!top) {
      focusedIds.clear();
    }
    if (restoreTo && (!top || !topLayerEl() || !topLayerEl().contains(document.activeElement))) {
      // 닫힘: 연 버튼으로 포커스를 돌려줘요 (그 버튼이 아직 화면에 있을 때만)
      const el = restoreTo;
      restoreTo = null;
      if (top) {
        // 아래 겹이 남아 있으면 그 안에 있을 때만
        if (topLayerEl() && topLayerEl().contains(el) && el.focus) el.focus({ preventScroll: true });
      } else if (el && el.isConnected && el.focus && !el.closest('[inert]')) {
        el.focus({ preventScroll: true });
      }
    }
  });
  return html`${stack.map((l) => html`<div class="layer" key=${l.id}>${l.node}</div>`)}`;
}
