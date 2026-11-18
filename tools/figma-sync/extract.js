// 브라우저 안에서 실행: 화면(#app)을 피그마로 다시 그릴 수 있는 상자 트리(JSON)로 읽어요.
// 반복되는 부분은 COMP 규칙으로 표시해서, 피그마에서 컴포넌트·인스턴스로 만들어요.
(function () {
  const root = document.getElementById('app');
  const R = root.getBoundingClientRect();
  const px = (v) => parseFloat(v) || 0;
  const col = (c) => {
    if (!c) return null;
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    const a = p.length > 3 ? p[3] : 1;
    if (a === 0) return null;
    return [p[0] / 255, p[1] / 255, p[2] / 255, a];
  };
  const txt = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim();

  // 컴포넌트 규칙: 선택자 → [이름, 변형 속성]
  const COMP = [
    ['.tabbar', 'TabBar', (el) => ({ 탭: txt(el.querySelector('[aria-current="page"]') || el) })],
    ['.chip', 'Chip', (el) => ({ 선택: el.getAttribute('aria-pressed') === 'true' ? '켜짐' : '꺼짐' })],
    ['.btn', 'Button', (el) => ({ 종류: el.classList.contains('btn--secondary') ? '보조' : '주요', 상태: el.disabled ? '비활성' : '기본' })],
    ['.fab', 'FAB', (el) => ({ 모양: el.classList.contains('fab--small') ? '동그라미' : '알약' })],
    ['.status', 'StatusLabel', (el) => ({ 상태: el.classList.contains('status--done') && !/예약|보류/.test(txt(el)) ? '종류' : txt(el) })],
    ['.label-dday', 'LabelDday', (el) => ({ 지남: el.classList.contains('label-dday--past') ? '예' : '아니오' })],
    ['.input', 'Input', (el) => ({ 종류: el.tagName === 'BUTTON' ? '고르기' : el.tagName === 'TEXTAREA' ? '여러 줄' : '입력칸', 상태: (el.value || (el.tagName === 'BUTTON' && !el.classList.contains('input--empty'))) ? '입력됨' : '비어 있음' })],
    ['.sub-header', 'SubHeader', () => ({})],
    ['.modal__head', 'ModalHeader', () => ({})],
    ['.sheet__head', 'SheetHeader', () => ({})],
    ['.toast', 'Toast', (el) => ({ 버튼: el.querySelector('.toast__action') ? '있음' : '없음' })],
    ['.check-row', 'CheckRow', (el) => ({ 체크: el.getAttribute('aria-checked') === 'true' ? '켜짐' : '꺼짐' })],
    ['.cl-row', 'ChecklistRow', (el) => ({ 완료: el.querySelector('[aria-checked="true"]') ? '켜짐' : '꺼짐' })],
    ['.icon-btn', 'IconButton', () => ({})],
    ['.round-btn', 'RoundButton', () => ({})],
    ['.share-icon', 'ShareIcon', (el) => ({ 강조: el.querySelector('.share-icon__circle--point') ? '예' : '아니오' })],
    ['.kind-chip', 'KindChip', () => ({})],
  ];
  const compOf = (el) => {
    for (const [sel, name, props] of COMP) if (el.matches(sel)) return { name, props: props(el) };
    return null;
  };
  // 구조 지문 (글자 제외): 같은 지문끼리만 인스턴스로 묶어요
  const sig = (el) => {
    const parts = [];
    const walk = (e, d) => {
      if (d > 6) return;
      for (const c of e.childNodes) {
        if (c.nodeType === 3) { if (c.textContent.trim()) parts.push('T'); continue; }
        if (c.nodeType !== 1) continue;
        const cs = getComputedStyle(c);
        if (cs.display === 'none') continue;
        if (c.tagName.toLowerCase() === 'svg') { parts.push('S' + (c.innerHTML.length)); continue; }
        parts.push('<' + c.tagName + '.' + (c.getAttribute('class') || '').split(' ')[0]);
        walk(c, d + 1);
        parts.push('>');
      }
    };
    walk(el, 0);
    return parts.join('');
  };

  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left - R.left, y: r.top - R.top, w: r.width, h: r.height };
  };
  const grad = (bgi) => {
    // linear-gradient(180deg, rgba(..) 35%, rgba(..) 100%) 정도만
    const out = [];
    const re = /linear-gradient\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g;
    let m;
    while ((m = re.exec(bgi))) {
      const body = m[1];
      const ang = (body.match(/^\s*(-?[\d.]+)deg/) || [0, 180])[1];
      const stops = [];
      const sre = /(rgba?\([^)]+\))\s*([\d.]+%)?/g;
      let s;
      while ((s = sre.exec(body))) stops.push([col(s[1]) || [0, 0, 0, 0], s[2] ? parseFloat(s[2]) / 100 : null]);
      stops.forEach((st, i) => { if (st[1] == null) st[1] = stops.length === 1 ? 0 : i / (stops.length - 1); });
      out.push({ ang: +ang, stops });
    }
    return out;
  };
  const shadow = (v) => {
    if (!v || v === 'none') return [];
    return v.split(/,(?![^()]*\))/).map((s) => {
      const c = col((s.match(/rgba?\([^)]+\)/) || [''])[0]);
      const n = s.replace(/rgba?\([^)]+\)/, '').trim().split(/\s+/).map(px);
      return c ? { c, x: n[0], y: n[1], b: n[2] || 0, s: n[3] || 0, inset: /inset/.test(s) } : null;
    }).filter(Boolean);
  };

  function textItems(el, cs, only) {
    // 이 요소의 직접 글자들 (only가 있으면 그 글자 노드 하나만)
    const out = [];
    for (const c of (only ? [only] : el.childNodes)) {
      if (c.nodeType !== 3) continue;
      const raw = c.textContent;
      const pre = /pre/.test(cs.whiteSpace);
      const s = pre ? raw : raw.replace(/\s+/g, ' ');
      if (!s.trim()) continue;
      const rg = document.createRange(); rg.selectNodeContents(c);
      const rects = Array.from(rg.getClientRects()).filter((r) => r.width > 0);
      if (!rects.length) continue;
      const x1 = Math.min(...rects.map((r) => r.left)), y1 = Math.min(...rects.map((r) => r.top));
      const x2 = Math.max(...rects.map((r) => r.right)), y2 = Math.max(...rects.map((r) => r.bottom));
      const lines = new Set(rects.map((r) => Math.round(r.top))).size;
      out.push({
        t: 'text', s: pre ? s : s.trim(), x: x1 - R.left, y: y1 - R.top, w: x2 - x1, h: y2 - y1, lines,
        fs: px(cs.fontSize), fw: +cs.fontWeight, col: col(cs.color) || [0, 0, 0, 1],
        lh: cs.lineHeight === 'normal' ? null : px(cs.lineHeight), ls: cs.letterSpacing === 'normal' ? 0 : px(cs.letterSpacing),
        ta: cs.textAlign, deco: cs.textDecorationLine, op: +cs.opacity,
        clampW: lines > 1 ? (el.getBoundingClientRect().width - px(cs.paddingLeft) - px(cs.paddingRight)) : null,
        ell: cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1,
      });
    }
    return out;
  }

  function walk(el, inComp) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return null;
    const tag = el.tagName.toLowerCase();
    const b = box(el);
    if (b.w === 0 && b.h === 0 && cs.overflow === 'visible' && tag !== 'svg') {
      // 크기 없는 감싸개도 자식은 볼 수 있어요
    }
    if (tag === 'svg') {
      const clone = el.cloneNode(true);
      const color = cs.color;
      clone.setAttribute('width', b.w); clone.setAttribute('height', b.h);
      let mk = clone.outerHTML.replace(/currentColor/g, color);
      if (!/xmlns=/.test(mk)) mk = mk.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      // 선 색이 부모 color를 따르는 lucide
      if (!/stroke="/.test(mk.split('>')[0])) mk = mk.replace('<svg', `<svg stroke="${color}"`);
      return { t: 'svg', ...b, mk, op: +cs.opacity };
    }
    if (tag === 'img') {
      return { t: 'img', ...b, src: el.getAttribute('src'), fit: cs.objectFit, br: [px(cs.borderTopLeftRadius), px(cs.borderTopRightRadius), px(cs.borderBottomRightRadius), px(cs.borderBottomLeftRadius)], op: +cs.opacity };
    }
    const n = { t: 'el', tag, cls: (el.getAttribute('class') || '').split(' ')[0], ...b, kids: [] };
    const st = {};
    const bg = col(cs.backgroundColor); if (bg) st.bg = bg;
    if (cs.backgroundImage && cs.backgroundImage !== 'none') { const g = grad(cs.backgroundImage); if (g.length) st.grad = g; }
    const br = [px(cs.borderTopLeftRadius), px(cs.borderTopRightRadius), px(cs.borderBottomRightRadius), px(cs.borderBottomLeftRadius)];
    if (br.some((v) => v)) st.br = br.map((v) => Math.min(v, Math.min(b.w, b.h) / 2));
    const bw = ['Top', 'Right', 'Bottom', 'Left'].map((s) => (cs['border' + s + 'Style'] !== 'none' ? px(cs['border' + s + 'Width']) : 0));
    if (bw.some((v) => v)) {
      const bc = col(cs.borderTopColor) || col(cs.borderBottomColor) || col(cs.borderLeftColor);
      if (bc) { st.bw = bw; st.bc = bc; st.bstyle = cs.borderTopStyle; }
    }
    const sh = shadow(cs.boxShadow); if (sh.length) st.sh = sh;
    if (+cs.opacity < 1) st.op = +cs.opacity;
    if (cs.overflow !== 'visible' || cs.overflowX !== 'visible') st.clip = true;
    // 자동 배치(컴포넌트 안에서만 사용)
    st.disp = cs.display; st.dir = cs.flexDirection; st.gap = px(cs.columnGap) || px(cs.gap); st.rgap = px(cs.rowGap);
    st.pad = [px(cs.paddingTop), px(cs.paddingRight), px(cs.paddingBottom), px(cs.paddingLeft)];
    st.jc = cs.justifyContent; st.ai = cs.alignItems; st.ta = cs.textAlign; st.pos = cs.position;
    st.wrap = cs.flexWrap;
    n.st = st;
    const c = !inComp && compOf(el);
    if (c) { n.comp = c; n.sig = sig(el); }
    // 입력칸: 값 또는 안내 문구를 글자로
    if (tag === 'input' || tag === 'textarea') {
      const v = el.value || el.getAttribute('value') || el.textContent;
      const ph = el.getAttribute('placeholder') || '';
      const s = v || ph;
      if (s) {
        const pcs = v ? cs : getComputedStyle(el, '::placeholder');
        const cx = b.x + px(cs.paddingLeft) + px(cs.borderLeftWidth);
        const cw = b.w - px(cs.paddingLeft) - px(cs.paddingRight) - px(cs.borderLeftWidth) * 2;
        const lh = cs.lineHeight === 'normal' ? px(cs.fontSize) * 1.5 : px(cs.lineHeight);
        const multi = tag === 'textarea';
        n.kids.push({
          t: 'text', s, x: cx, y: multi ? b.y + px(cs.paddingTop) + px(cs.borderTopWidth) : b.y + (b.h - lh) / 2, w: cw, h: lh, lines: multi ? 2 : 1,
          fs: px(cs.fontSize), fw: +cs.fontWeight, col: col(pcs.color) || [0.6, 0.6, 0.6, 1], lh, ls: 0, ta: 'left', deco: 'none', op: 1, clampW: multi ? cw : null, ell: !multi,
        });
      }
      return n;
    }
    // 자식: 글자 + 요소 (DOM 순서)
    const items = [];
    for (const ch of el.childNodes) {
      if (ch.nodeType === 3) { items.push(...textItems(el, cs, ch)); continue; }
      if (ch.nodeType !== 1) continue;
      const k = walk(ch, inComp || !!c);
      if (k) items.push(k);
    }
    n.kids = items;
    // 위에 그려질 순서: z-index·절대 위치는 대략 DOM 순서 유지 (텍스트 먼저 → 실제로는 섞여 있지만 겹치는 일은 드묾)
    return n;
  }

  const out = walk(root, false);
  return JSON.stringify(out);
})();
