// 사진 전체 화면 미리보기 (팝업)
import { html, useState } from '../vendor/preact-htm.js';
import { Icon } from './components.js';
import { closeOverlay, openOverlay } from '../overlay.js';

export function openPhotos(photos, index = 0) {
  openOverlay(html`<${PhotoViewer} photos=${photos} index=${index} />`);
}

/** 사진 전체 화면 미리보기 (팝업) — 좌우로 밀어 넘기기, ✕로 닫기 */
export function PhotoViewer({ photos, index = 0 }) {
  const [i, setI] = useState(index);
  let x0 = null;
  const go2 = (d) => setI((n) => Math.min(photos.length - 1, Math.max(0, n + d)));
  return html`<div class="viewer" role="dialog" aria-modal="true" aria-label="사진 크게 보기"
    onTouchStart=${(e) => { x0 = e.touches[0].clientX; }}
    onTouchEnd=${(e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) go2(dx < 0 ? 1 : -1); x0 = null; }}>
    <img src=${photos[i]} alt=${'사진 ' + (i + 1)} />
    <button class="viewer__close" aria-label="닫기" onClick=${() => closeOverlay()}><${Icon} name="x" size=${28} stroke=${2} /></button>
    ${photos.length > 1 && html`<span class="viewer__count">${i + 1} / ${photos.length}</span>
      ${i > 0 && html`<button class="viewer__nav viewer__nav--prev" aria-label="이전 사진" onClick=${() => go2(-1)}><${Icon} name="chevron-left" size=${28} /></button>`}
      ${i < photos.length - 1 && html`<button class="viewer__nav viewer__nav--next" aria-label="다음 사진" onClick=${() => go2(1)}><${Icon} name="chevron-right" size=${28} /></button>`}`}
  </div>`;
}

