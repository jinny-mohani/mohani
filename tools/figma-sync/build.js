// 화면 트리(JSON)들을 정리해서: 에셋 목록, 컴포넌트 정의, 화면별 데이터로 나눠요.
// node build.js <json폴더> <출력폴더> 화면이름...
const fs = require('fs');
const crypto = require('crypto');
const [, , JD, OUT, ...NAMES] = process.argv;
fs.mkdirSync(OUT + '/assets', { recursive: true });

const r1 = (v) => Math.round(v * 10) / 10;
const assets = {}; // id → {src, maxW, maxH}
const defs = {};   // key → {name, variant, tree}
const sigIndex = {}; // name|props → [sig...]
const WEIGHTS = new Set();

function propStr(p) { return Object.entries(p).map(([k, v]) => `${k}=${v}`).join(', '); }

function prep(n, inComp) {
  for (const k of ['x', 'y', 'w', 'h']) n[k] = r1(n[k]);
  if (n.t === 'text') {
    WEIGHTS.add(Math.round((n.fw || 400) / 100) * 100);
    n.col = n.col.map((v) => Math.round(v * 1000) / 1000);
    if (n.clampW) n.clampW = r1(n.clampW);
    if (n.lh) n.lh = r1(n.lh);
    if (n.op === 1) delete n.op;
    if (!n.ls) delete n.ls;
    if (n.deco === 'none') delete n.deco;
    if (!n.ell) delete n.ell;
    if (!n.clampW) delete n.clampW;
    return n;
  }
  if (n.t === 'svg') { if (n.op === 1) delete n.op; return n; }
  if (n.t === 'img') {
    const id = crypto.createHash('sha1').update(n.src || '').digest('hex').slice(0, 12);
    if (!assets[id]) assets[id] = { src: n.src, maxW: 0, maxH: 0 };
    assets[id].maxW = Math.max(assets[id].maxW, n.w); assets[id].maxH = Math.max(assets[id].maxH, n.h);
    n.src = id;
    if (n.op === 1) delete n.op;
    if (!(n.br || []).some((v) => v)) delete n.br;
    return n;
  }
  // 요소
  const s = n.st || {};
  const st = {};
  for (const k of ['bg', 'grad', 'br', 'bw', 'bc', 'bstyle', 'sh', 'op', 'clip']) if (s[k] != null) st[k] = s[k];
  if (st.bg) st.bg = st.bg.map((v) => Math.round(v * 1000) / 1000);
  if (st.bstyle === 'solid') delete st.bstyle;
  const visual = st.bg || st.grad || st.bw || st.sh || st.op != null || st.clip;
  if (!visual) delete st.br;
  n.st = st;
  n.kids = (n.kids || []).map((k) => prep(k, inComp || !!n.comp)).filter(Boolean);
  if (!visual && !n.comp && !n.kids.length) return null;
  if (!visual && !n.comp) n.flat = 1;
  delete n.tag;
  if (n.comp) {
    const name = n.comp.name;
    const pk = name + '|' + propStr(n.comp.props);
    sigIndex[pk] = sigIndex[pk] || [];
    let idx = sigIndex[pk].indexOf(n.sig);
    if (idx < 0) { sigIndex[pk].push(n.sig); idx = sigIndex[pk].length - 1; }
    let variant = propStr(n.comp.props);
    if (idx > 0 || !variant) variant = (variant ? variant + ', ' : '') + '구성=' + (idx + 1);
    const key = name + '/' + variant;
    const texts = [];
    const collect = (x) => { if (x.t === 'text') texts.push(x.s); for (const k of x.kids || []) collect(k); };
    collect(n);
    if (!defs[key]) {
      const tree = JSON.parse(JSON.stringify(n));
      delete tree.comp; delete tree.sig; delete tree.flat;
      defs[key] = { name, variant, tree };
    }
    return { t: 'inst', key, x: n.x, y: n.y, w: n.w, h: n.h, texts };
  }
  return n;
}

const screens = {};
for (const nm of NAMES) {
  const tree = JSON.parse(fs.readFileSync(`${JD}/${nm}.json`, 'utf8'));
  screens[nm] = prep(tree, false);
}
// 같은 이름 안에서 '구성'이 있는 변형이 있으면, 없는 변형에 구성=1을 붙여 속성을 맞춰요
const byName = {};
for (const d of Object.values(defs)) (byName[d.name] = byName[d.name] || []).push(d);
for (const list of Object.values(byName)) {
  if (list.some((d) => /구성=/.test(d.variant))) for (const d of list) if (!/구성=/.test(d.variant)) d.variant += ', 구성=1';
}
// 에셋 원본 저장 (파이썬이 줄여요)
const alist = [];
for (const [id, a] of Object.entries(assets)) {
  const m = (a.src || '').match(/^data:(image\/[\w+]+);base64,(.*)$/);
  if (!m) continue;
  const ext = m[1].includes('png') ? 'png' : m[1].includes('svg') ? 'svg' : 'jpg';
  fs.writeFileSync(`${OUT}/assets/${id}.${ext}`, Buffer.from(m[2], 'base64'));
  alist.push({ id, ext, maxW: a.maxW, maxH: a.maxH });
}
fs.writeFileSync(`${OUT}/assets.json`, JSON.stringify(alist));
fs.writeFileSync(`${OUT}/defs.json`, JSON.stringify(defs));
fs.writeFileSync(`${OUT}/screens.json`, JSON.stringify(screens));
fs.writeFileSync(`${OUT}/weights.json`, JSON.stringify([...WEIGHTS]));
console.log('assets', alist.length, 'defs', Object.keys(defs).length, 'weights', [...WEIGHTS]);
for (const [k, s] of Object.entries(screens)) console.log(k, Math.round(JSON.stringify(s).length / 1024) + 'KB');
console.log(Object.keys(defs).join('\n'));
