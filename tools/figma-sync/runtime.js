// 피그마 플러그인 안에서 실행되는 그리기 함수들 (각 use_figma 호출 앞에 붙여 써요)
const W = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };
const fontOf = (w) => ({ family: 'Noto Sans KR', style: W[Math.round((w || 400) / 100) * 100] || 'Regular' });
async function loadFonts(ws) { for (const w of ws) await figma.loadFontAsync(fontOf(w)); }
const rgb = (c) => ({ r: c[0], g: c[1], b: c[2] });
const solid = (c) => ({ type: 'SOLID', color: rgb(c), opacity: c[3] });
function gradPaint(g) {
  // CSS 각도: 180deg = 위→아래. 피그마 변환 행렬로
  const a = ((g.ang - 90) * Math.PI) / 180;
  const cos = Math.cos(a), sin = Math.sin(a);
  const t = [[cos, sin, 0.5 - cos / 2 - sin / 2], [-sin, cos, 0.5 + sin / 2 - cos / 2]];
  return { type: 'GRADIENT_LINEAR', gradientTransform: t, gradientStops: g.stops.map(([c, p]) => ({ color: { ...rgb(c), a: c[3] }, position: p })) };
}
function styleFrame(f, n) {
  const s = n.st || {};
  const fills = [];
  if (s.bg) fills.push(solid(s.bg));
  if (s.grad) for (const g of s.grad.slice().reverse()) fills.push(gradPaint(g));
  f.fills = fills;
  if (s.br) { f.topLeftRadius = s.br[0]; f.topRightRadius = s.br[1]; f.bottomRightRadius = s.br[2]; f.bottomLeftRadius = s.br[3]; }
  if (s.bw) {
    f.strokes = [solid(s.bc)]; f.strokeAlign = 'INSIDE';
    const [t, r, b, l] = s.bw;
    if (t === r && r === b && b === l) f.strokeWeight = t;
    else { f.strokeTopWeight = t; f.strokeRightWeight = r; f.strokeBottomWeight = b; f.strokeLeftWeight = l; }
    if (s.bstyle === 'dashed') f.dashPattern = [4, 4];
  }
  if (s.sh) f.effects = s.sh.filter((e) => !e.inset).map((e) => ({ type: 'DROP_SHADOW', color: { ...rgb(e.c), a: e.c[3] }, offset: { x: e.x, y: e.y }, radius: e.b, spread: e.s, visible: true, blendMode: 'NORMAL' }));
  if (s.op != null) f.opacity = s.op;
  f.clipsContent = !!s.clip;
}
function mkText(n, ox, oy, box) {
  const t = figma.createText();
  t.fontName = fontOf(n.fw);
  t.characters = n.s;
  t.fontSize = n.fs;
  if (n.lh) t.lineHeight = { unit: 'PIXELS', value: n.lh };
  if (n.ls) t.letterSpacing = { unit: 'PIXELS', value: n.ls };
  t.fills = [solid(n.col)];
  if (n.deco && /line-through/.test(n.deco)) t.textDecoration = 'STRIKETHROUGH';
  else if (n.deco && /underline/.test(n.deco)) t.textDecoration = 'UNDERLINE';
  const al = n.ta === 'center' ? 'CENTER' : n.ta === 'right' || n.ta === 'end' ? 'RIGHT' : 'LEFT';
  t.textAlignHorizontal = al;
  // 피그마 글자 폭이 조금 달라도 줄이 바뀌지 않게 여유를 둬요
  const slack = 6;
  let x = n.x - ox, w = (n.clampW && n.lines > 1 ? n.clampW : n.w) + slack;
  if (n.clampW && n.lines > 1) x = n.x - ox;
  else if (al === 'CENTER') x -= slack / 2;
  else if (al === 'RIGHT') x -= slack;
  t.textAutoResize = 'HEIGHT';
  t.resize(Math.max(1, w), Math.max(1, n.h));
  if (n.ell) { t.textAutoResize = 'NONE'; t.resize(Math.max(1, n.w + 1), Math.max(1, n.h)); t.textTruncation = 'ENDING'; }
  t.x = x; t.y = n.y - oy;
  if (n.op != null && n.op < 1) t.opacity = n.op;
  return t;
}
function mkSvg(n, ox, oy) {
  let v;
  try { v = figma.createNodeFromSvg(n.mk); } catch (e) { v = figma.createFrame(); v.fills = []; }
  v.name = 'icon';
  v.x = n.x - ox; v.y = n.y - oy;
  if (n.op != null && n.op < 1) v.opacity = n.op;
  return v;
}
function mkImg(n, ox, oy) {
  const r = figma.createRectangle();
  r.name = 'image';
  r.resize(Math.max(1, n.w), Math.max(1, n.h));
  r.x = n.x - ox; r.y = n.y - oy;
  const hash = ASSETS[n.src];
  r.fills = hash ? [{ type: 'IMAGE', imageHash: hash, scaleMode: n.fit === 'contain' ? 'FIT' : 'FILL' }] : [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
  if (n.br) { r.topLeftRadius = n.br[0]; r.topRightRadius = n.br[1]; r.bottomRightRadius = n.br[2]; r.bottomLeftRadius = n.br[3]; }
  return r;
}
// 제약: 컴포넌트를 늘리고 줄일 때 자식이 어디에 붙을지
function constrain(c, n, P) {
  if (!('constraints' in c)) return;
  const L = n.x - P.x, Rr = P.x + P.w - (n.x + n.w), T = n.y - P.y, B = P.y + P.h - (n.y + n.h);
  let h = 'MIN', v = 'MIN';
  if (n.t === 'text') h = 'STRETCH';
  else if (n.w >= P.w * 0.6 && L < P.w * 0.2 && Rr < P.w * 0.2) h = 'STRETCH';
  else if (Math.abs(L - Rr) < 2) h = 'CENTER';
  else if (Rr < L && Rr < P.w * 0.25) h = 'MAX';
  if (n.h >= P.h * 0.8 && n.t !== 'text') v = 'STRETCH';
  else if (Math.abs(T - B) < 3) v = 'CENTER';
  else if (B < T && B < P.h * 0.25) v = 'MAX';
  c.constraints = { horizontal: h, vertical: v };
}
const INST = []; // [인스턴스, 글자들]
// n을 부모 frame(px,py 기준)에 그리기
function draw(parent, n, P, inComp) {
  if (n.t === 'text') { const t = mkText(n, P.x, P.y); parent.appendChild(t); if (inComp) constrain(t, n, P); return; }
  if (n.t === 'svg') { const v = mkSvg(n, P.x, P.y); parent.appendChild(v); if (inComp) constrain(v, n, P); return; }
  if (n.t === 'img') { const r = mkImg(n, P.x, P.y); parent.appendChild(r); if (inComp) constrain(r, n, P); return; }
  if (n.t === 'inst') {
    const comp = COMPS[n.key];
    if (!comp) return;
    const i = comp.createInstance();
    parent.appendChild(i);
    i.x = n.x - P.x; i.y = n.y - P.y;
    if (Math.abs(i.width - n.w) > 0.5 || Math.abs(i.height - n.h) > 0.5) i.resize(Math.max(1, n.w), Math.max(1, n.h));
    INST.push([i, n.texts]);
    return;
  }
  if (n.flat) { for (const k of n.kids) draw(parent, k, P, inComp); return; }
  const f = figma.createFrame();
  f.name = n.cls || 'box';
  f.resize(Math.max(0.01, n.w), Math.max(0.01, n.h));
  f.x = n.x - P.x; f.y = n.y - P.y;
  styleFrame(f, n);
  parent.appendChild(f);
  if (inComp) constrain(f, n, P);
  for (const k of n.kids) draw(f, k, n, inComp);
}
function overrideTexts() {
  for (const [i, texts] of INST) {
    if (!texts) continue;
    const ts = i.findAll((x) => x.type === 'TEXT');
    ts.forEach((t, k) => { if (texts[k] != null && t.characters !== texts[k]) t.characters = texts[k]; });
  }
}
