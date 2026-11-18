// use_figma에 보낼 코드 파일들 만들기
// node gen.js assets            → calls/asset-N.js
// node gen.js comps             → calls/comps.js  (ASSETS 필요: out/asset-hashes.json)
// node gen.js screens <묶음크기>  → calls/screens-N.js (out/comp-ids.json 필요)
const fs = require('fs'), zlib = require('zlib');
const D = __dirname, O = D + '/out', C = D + '/calls';
fs.mkdirSync(C, { recursive: true });
const PAGE = '8131:8714';
const strip = (s) => s.replace(/^\s*\/\/.*$/gm, '').replace(/\n\s*\n/g, '\n');
const RUNTIME = strip(fs.readFileSync(D + '/runtime.js', 'utf8'));
const INFLATE = strip(fs.readFileSync(D + '/inflate.js', 'utf8'));
const pack = (obj) => zlib.deflateRawSync(Buffer.from(JSON.stringify(obj)), { level: 9 }).toString('base64');
const mode = process.argv[2];
const read = (f) => JSON.parse(fs.readFileSync(O + '/' + f, 'utf8'));

if (mode === 'assets') {
  const al = read('assets-small.json');
  const groups = []; let cur = [], sz = 0;
  for (const a of al) { if (sz + a.b64.length > 40000 && cur.length) { groups.push(cur); cur = []; sz = 0; } cur.push(a); sz += a.b64.length; }
  groups.push(cur);
  groups.forEach((g, i) => {
    const A = Object.fromEntries(g.map((a) => [a.id, a.b64]));
    const code = `const A=${JSON.stringify(A)};
const page=await figma.getNodeByIdAsync('${PAGE}');await figma.setCurrentPageAsync(page);
let h=page.findOne(n=>n.name==='에셋 (이미지)');
if(!h){h=figma.createFrame();h.name='에셋 (이미지)';h.x=-700;h.y=0;h.layoutMode='HORIZONTAL';h.layoutWrap='WRAP';h.resize(420,100);h.primaryAxisSizingMode='FIXED';h.counterAxisSizingMode='AUTO';h.itemSpacing=8;h.counterAxisSpacing=8;h.paddingLeft=h.paddingRight=h.paddingTop=h.paddingBottom=12;}
const out={};
for(const[id,b] of Object.entries(A)){const img=figma.createImage(figma.base64Decode(b));const r=figma.createRectangle();r.name=id;r.resize(96,96);r.fills=[{type:'IMAGE',imageHash:img.hash,scaleMode:'FIT'}];h.appendChild(r);out[id]=img.hash;}
return out;`;
    fs.writeFileSync(`${C}/asset-${i}.js`, code);
    console.log('asset', i, code.length);
  });
}

if (mode === 'comps') {
  const defs = read('defs.json');
  const ASSETS = read('asset-hashes.json');
  const W = read('weights.json');
  const code = `${INFLATE}
${RUNTIME}
const ASSETS=${JSON.stringify(ASSETS)};const COMPS={};
const DEFS=unpack(${JSON.stringify(pack(defs))});
const page=await figma.getNodeByIdAsync('${PAGE}');await figma.setCurrentPageAsync(page);
await loadFonts(${JSON.stringify(W)});
for(const o of page.findAll(n=>n.type==='SECTION'&&n.name==='컴포넌트'))o.remove();
const sec=figma.createSection();sec.name='컴포넌트';sec.x=-2400;sec.y=0;
const byName={};
for(const [key,d] of Object.entries(DEFS)){(byName[d.name]=byName[d.name]||[]).push([key,d]);}
const ids={};let y=60;
for(const [name,list] of Object.entries(byName)){
  const comps=[];
  for(const [key,d] of list){
    const n=d.tree;const c=figma.createComponent();c.name=d.variant;c.resize(Math.max(1,n.w),Math.max(1,n.h));
    styleFrame(c,n);c.clipsContent=!!(n.st&&n.st.clip);
    sec.appendChild(c);
    for(const k of n.kids) draw(c,k,n,true);
    comps.push(c);ids[key]=c;
  }
  const set=figma.combineAsVariants(comps,sec);set.name=name;
  set.layoutMode='HORIZONTAL';set.layoutWrap='WRAP';set.counterAxisSpacing=24;set.itemSpacing=24;
  set.paddingLeft=set.paddingRight=set.paddingTop=set.paddingBottom=24;
  set.primaryAxisSizingMode='FIXED';set.counterAxisSizingMode='AUTO';
  set.resize(Math.min(1900,Math.max(...comps.map(c=>c.width))*Math.min(comps.length,5)+24*(Math.min(comps.length,5)+1)),100);
  set.fills=[{type:'SOLID',color:{r:1,g:1,b:1}}];set.strokes=[{type:'SOLID',color:{r:0.6,g:0.4,b:1}}];set.dashPattern=[6,4];set.cornerRadius=8;
  set.x=60;set.y=y;y+=set.height+60;
}
sec.resizeWithoutConstraints(2100,y);
const out={};for(const k in ids) out[k]=ids[k].id;
return out;`;
  fs.writeFileSync(`${C}/comps.js`, code);
  console.log('comps', code.length);
}

if (mode === 'screens') {
  const per = +process.argv[3] || 12;
  const scr = read('screens.json');
  const ASSETS = read('asset-hashes.json');
  const CIDS = read('comp-ids.json');
  const W = read('weights.json');
  const labels = JSON.parse(fs.readFileSync(D + '/labels.json', 'utf8'));
  const names = Object.keys(scr);
  // 배치: 한 줄에 8화면, 줄 높이는 그 줄의 가장 긴 화면
  const pos = {}; let x = 80, y = 120, rowH = 0;
  names.forEach((n, i) => {
    if (i && i % 8 === 0) { x = 80; y += rowH + 160; rowH = 0; }
    pos[n] = [x, y]; x += 360 + 80; rowH = Math.max(rowH, scr[n].h);
  });
  const totalH = y + rowH + 120;
  for (let i = 0; i < names.length; i += per) {
    const part = names.slice(i, i + per);
    const data = Object.fromEntries(part.map((n) => [n, { lab: labels[n] || n, pos: pos[n], tree: scr[n] }]));
    const used = new Set();
    const scan = (t) => { if (t.t === 'inst') used.add(t.key); for (const k of t.kids || []) scan(k); };
    part.forEach((n) => scan(scr[n]));
    const cmap = Object.fromEntries([...used].map((k) => [k, CIDS[k]]));
    const code = `${INFLATE}
${RUNTIME}
const ASSETS=${JSON.stringify(ASSETS)};
const CIDS=${JSON.stringify(cmap)};const COMPS={};
for(const k in CIDS){COMPS[k]=await figma.getNodeByIdAsync(CIDS[k]);}
const S=unpack(${JSON.stringify(pack(data))});
const page=await figma.getNodeByIdAsync('${PAGE}');await figma.setCurrentPageAsync(page);
await loadFonts(${JSON.stringify(W)});
const sec=await figma.getNodeByIdAsync('8131:8715');
sec.resizeWithoutConstraints(80+8*440,${totalH});
const made=[];
for(const [n,s] of Object.entries(S)){
  const old=sec.findChild(c=>c.name===s.lab);if(old)old.remove();
  const t=s.tree;const f=figma.createFrame();f.name=s.lab;f.resize(360,t.h);f.x=s.pos[0];f.y=s.pos[1];
  const mb=(t.kids.find(k=>k.st&&k.st.bg&&k.y<=24)||{st:{bg:[1,1,1,1]}}).st.bg;f.fills=[solid(mb)];f.clipsContent=true;sec.appendChild(f);
  for(const k of t.kids) draw(f,k,{x:0,y:0,w:360,h:t.h},false);
  made.push(f.id);
}
overrideTexts();
return made;`;
    fs.writeFileSync(`${C}/screens-${i / per}.js`, code);
    console.log('screens', i / per, part.length, code.length);
  }
}
