// 00 시작 화면 · 불러오는 중 · 불러오기 실패 · 여행을 찾지 못함
import { html } from '../vendor/preact-htm.js';
import { Button, Empty, Icon } from '../ui/components.js';
import { openOverlay } from '../overlay.js';
import { NewTripModal } from './newtrip.js';

/** 00 시작 화면 (첫 접속 · 저장된 여행 없음) */
export function Start() {
  return html`<main class="full start">
    <div class="full__spacer"></div>
    <div class="start__hero">
      <${Icon} name="plane" size=${28} />
      <h1>함께 가요!</h1>
      <p>친구와 함께 쓰는 여행 노트<br />예약·준비물·일정을 한곳에서 같이 정리해요</p>
    </div>
    <div class="full__spacer" style="flex:2"></div>
    <${Button} onClick=${() => openOverlay(html`<${NewTripModal} />`)}>새 여행 만들기<//>
    <p class="start__hint">초대받았다면 받은 링크를 눌러 주세요</p>
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

export function TripNotFound({ onList }) {
  return html`<main class="screen screen--sub">
    <${Empty}
      icon="link"
      title="여행을 찾을 수 없어요"
      text="초대 링크가 바뀌었을 수 있어요. 여행을 만든 친구에게 링크를 다시 받아 주세요."
      action=${onList && html`<${Button} variant="secondary" onClick=${onList}>내 여행 목록<//>`}
    />
  </main>`;
}
