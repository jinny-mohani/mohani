// 12 동시 수정 알림 — 같은 항목을 다른 친구가 먼저 저장했을 때
import { html } from '../vendor/preact-htm.js';
import { Button, Icon } from './components.js';
import { openOverlay, closeOverlay } from '../overlay.js';

/** 'theirs'(상대 글로 두기 · 기본) 또는 'mine'(내 글로 바꾸기)을 돌려줘요 */
export function askConflict(name) {
  const who = name || '다른 친구';
  return new Promise((resolve) => {
    let picked = false;
    const pick = (v) => {
      picked = true;
      closeOverlay(() => resolve(v));
    };
    // 뒤로 가기·Esc로 닫혀도 답을 줘요 (기본 = 상대 글로 두기). 답이 없으면 저장이 멈춘 채로 남아요
    const onClose = () => {
      if (!picked) resolve('theirs');
    };
    openOverlay(html`<div>
      <div class="dim"></div>
      <section class="dialog conflict" role="alertdialog" aria-modal="true" aria-labelledby="conflict-title">
        <${Icon} name="circle-alert" size=${28} />
        <h2 id="conflict-title">${who}님이 먼저 수정했어요</h2>
        <p>같은 항목을 ${who}님이 방금 저장했어요.<br />어떤 글을 남길까요?</p>
        <div class="stack-btns">
          <${Button} onClick=${() => pick('theirs')}>${who}님 글로 두기<//>
          <${Button} variant="secondary" onClick=${() => pick('mine')}>내 글로 바꾸기<//>
        </div>
      </section>
    </div>`, { onClose });
  });
}
