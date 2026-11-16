// S-2 홈 화면 추가 안내 (첫 진입 1회)
import { html, useState } from '../vendor/preact-htm.js';
import { Button, ChipGroup, Icon, Sheet } from '../ui/components.js';
import { openOverlay, closeOverlay } from '../overlay.js';

const KEY = 'hg.installGuide';
const STEPS = {
  아이폰: [
    ['사파리 아래쪽 공유 버튼 누르기', 'share'],
    ["'홈 화면에 추가' 누르기", 'square-plus'],
    ["오른쪽 위 '추가' 누르면 끝!", null],
  ],
  안드로이드: [
    ['크롬 오른쪽 위 ⋮ 메뉴 누르기', 'ellipsis'],
    ["'홈 화면에 추가' 또는 '앱 설치' 누르기", 'square-plus'],
    ["'추가' 누르면 끝!", null],
  ],
};

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

/** 홈 화면에서 연 게 아니고, 아직 안내한 적 없으면 한 번 띄워요 */
export function maybeShowInstallGuide() {
  try {
    if (isStandalone() || localStorage.getItem(KEY)) return;
    localStorage.setItem(KEY, '1');
  } catch (e) {
    return;
  }
  setTimeout(() => openOverlay(html`<${InstallGuide} />`), 600);
}

function InstallGuide() {
  const [os, setOs] = useState(/android/i.test(navigator.userAgent) ? '안드로이드' : '아이폰');
  return html`<${Sheet} title="">
    <h2 class="guide-title">홈 화면에 추가하면<br />앱처럼 바로 열 수 있어요</h2>
    <p class="lead" style="margin-top:8px">다음부터 링크를 찾지 않아도 돼요</p>
    <div style="margin:16px 0 8px">
      <${ChipGroup} label="휴대폰 종류" value=${os} onChange=${setOs} options=${['아이폰', '안드로이드'].map((v) => ({ value: v, label: v }))} />
    </div>
    <ol class="guide-steps">
      ${STEPS[os].map(([t, icon], i) => html`<li key=${os + i}>
        <span class="guide-steps__n">${i + 1}</span><span>${t}</span>${icon && html`<${Icon} name=${icon} size=${20} />`}
      </li>`)}
    </ol>
    ${os === '아이폰' && html`<p class="field__help" style="margin-bottom:12px">카톡에서 열었다면 오른쪽 아래 ⋯ → '다른 브라우저로 열기'로 사파리에서 열어 주세요</p>`}
    <div class="stack-btns">
      <${Button} onClick=${() => closeOverlay()}>확인했어요<//>
      <button class="link-center" style="text-decoration:none" onClick=${() => closeOverlay()}>다음에 할게요</button>
    </div>
  <//>`;
}
