// 00 시작 화면 · 불러오는 중 · 여행을 찾지 못함
import { html } from '../vendor/preact-htm.js';
import { Button, Empty } from '../ui/components.js';

/** 00 시작 화면 (저장된 여행 없음) — 초기 버전은 초대 링크로만 입장 */
export function Start() {
  return html`<main class="screen screen--sub">
    <${Empty}
      icon="link"
      title="함께 가요!"
      text="받았던 초대 링크를 다시 눌러 주세요. 링크가 없다면 여행을 만든 친구에게 받아 주세요."
    />
  </main>`;
}

export function Loading() {
  return html`<main class="screen screen--sub" aria-busy="true">
    <${Empty} icon="refresh-cw" title="여행을 불러오고 있어요" />
  </main>`;
}

export function LoadError({ message, onRetry }) {
  return html`<main class="screen screen--sub">
    <${Empty}
      icon="wifi-off"
      title="불러오지 못했어요"
      text=${message}
      action=${html`<${Button} onClick=${onRetry}>다시 시도<//>`}
    />
  </main>`;
}

export function TripNotFound() {
  return html`<main class="screen screen--sub">
    <${Empty}
      icon="link"
      title="여행을 찾을 수 없어요"
      text="초대 링크가 바뀌었을 수 있어요. 여행을 만든 친구에게 링크를 다시 받아 주세요."
    />
  </main>`;
}
