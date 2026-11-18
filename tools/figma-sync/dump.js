// 브라우저 안에서 실행: 지금 화면을 그대로 담은 독립 HTML을 만들어 돌려줘요.
// - CSS는 <style>로, 이미지는 data URI로, 스크립트는 뺌
// - 팝업이 없으면 스크롤 전체 길이, 팝업이 있으면 360×760 한 화면
async function dumpScreen(name) {
  const app = document.getElementById('app');
  const hasLayer = !!app.querySelector(':scope > .layer');
  const scrollTop = app.scrollTop;
  const css = [];
  for (const sh of document.styleSheets) {
    try { for (const r of sh.cssRules) css.push(r.cssText); } catch (e) {}
  }
  const toData = async (src) => {
    try {
      const b = await (await fetch(src)).blob();
      return await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); });
    } catch (e) { return ''; }
  };
  const fixedEls = Array.from(app.querySelectorAll('*')).filter((el) => getComputedStyle(el).position === 'fixed');
  fixedEls.forEach((el) => el.setAttribute('data-was-fixed', '1'));
  const clone = app.cloneNode(true);
  fixedEls.forEach((el) => el.removeAttribute('data-was-fixed'));
  // 버튼·링크 안의 버튼/링크는 HTML로 다시 읽을 때 밖으로 튀어나가요 → span으로 바꿔 구조 유지
  clone.querySelectorAll('button button, button a, a button, a a').forEach((el) => {
    const sp = document.createElement('span');
    for (const at of el.attributes) sp.setAttribute(at.name, at.value);
    sp.style.display = sp.style.display || getComputedStyle(app.querySelector('[class="' + (el.getAttribute('class') || '') + '"]') || el).display;
    while (el.firstChild) sp.appendChild(el.firstChild);
    el.replaceWith(sp);
  });
  // 입력값 옮기기
  const srcInputs = app.querySelectorAll('input, textarea');
  const dstInputs = clone.querySelectorAll('input, textarea');
  srcInputs.forEach((el, i) => {
    const d = dstInputs[i];
    if (el.type === 'file') { d.remove(); return; }
    if (el.tagName === 'TEXTAREA') d.textContent = el.value; else d.setAttribute('value', el.value);
  });
  // 이미지 → data URI (화면에 보이는 크기 그대로)
  const imgs = clone.querySelectorAll('img');
  const srcImgs = app.querySelectorAll('img');
  for (let i = 0; i < imgs.length; i++) {
    const s = srcImgs[i] && srcImgs[i].currentSrc;
    if (s) imgs[i].setAttribute('src', await toData(s));
    imgs[i].removeAttribute('loading');
  }
  // 고정 위치 요소 → 절대 위치 (프레임 안에 담기도록)
  // 화면 이름표 (레이어 이름에 쓰이길 기대)
  clone.querySelectorAll('[class]').forEach((el) => el.setAttribute('data-name', el.getAttribute('class').split(' ')[0]));
  // 전체 화면 팝업(modal)은 내용 전체 길이로
  const layers = app.querySelectorAll(':scope > .layer');
  const top = layers[layers.length - 1];
  const modal = top && top.querySelector('.modal');
  const mb = modal && modal.querySelector('.modal__body');
  let modalH = 0;
  if (modal && !top.querySelector('.sheet')) {
    const head = modal.querySelector('.modal__head'), foot = modal.querySelector('.modal__foot');
    modalH = (head ? head.offsetHeight : 0) + (mb ? mb.scrollHeight : modal.scrollHeight) + (foot ? foot.offsetHeight : 0);
  }
  const H = hasLayer ? Math.max(760, modalH) : Math.max(760, app.scrollHeight);
  const extra = `
    html, body { width: 360px; height: ${H}px !important; overflow: hidden !important; margin: 0; background: #fff; }
    #app { position: relative !important; width: 360px !important; max-width: 360px !important; height: ${H}px !important; overflow: hidden !important; margin: 0 !important; }
    [data-was-fixed] { position: absolute !important; }
    .layer { position: static !important; }
    #app { display: flow-root !important; }
    html { background: transparent !important; }
    .screen { min-height: ${H}px !important; }
    *, *::before, *::after { transition: none !important; animation: none !important; }
  `;
  if (hasLayer && scrollTop) {
    const scr = clone.querySelector(':scope > main, :scope > .screen');
    if (scr) scr.style.marginTop = -scrollTop + 'px';
  }
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=360"><title>${name}</title>
<style>${css.join('\n')}</style><style>${extra}</style></head><body>${clone.outerHTML}</body></html>`;
}
