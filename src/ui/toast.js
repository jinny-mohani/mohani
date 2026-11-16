// 화면 아래 잠깐 뜨는 알림 ('링크를 복사했어요', '삭제했어요 · 되돌리기')
import { html, useEffect, useState } from '../vendor/preact-htm.js';

let current = null;
let timer = null;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());

/** toast('링크를 복사했어요') 또는 toast('삭제했어요', { action: '되돌리기', onAction }) */
export function toast(text, opts = {}) {
  current = { text, ...opts, key: Date.now() };
  emit();
  clearTimeout(timer);
  timer = setTimeout(() => {
    current = null;
    emit();
  }, opts.duration || 3000);
}

export function ToastHost() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  if (!current) return null;
  const t = current;
  return html`<div class="toast" role="status" key=${t.key}>
    <span>${t.text}</span>
    ${t.action &&
    html`<button
      class="toast__action"
      onClick=${() => {
        current = null;
        emit();
        t.onAction && t.onAction();
      }}
    >
      ${t.action}
    </button>`}
  </div>`;
}
