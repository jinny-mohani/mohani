import stickersJson from "./stickers.json";
import { supabase } from "./supabase.js";

const STICKERS = stickersJson;
const CELL = {nov:"/assets/nov_cell.webp", dec:"/assets/dec_cell.webp"};
const DAYBG = {nov:"/assets/nov_daily.webp", dec:"/assets/dec_daily.webp"};
const RECBG = ["/assets/rec1.webp", "/assets/rec2.webp", "/assets/rec3.webp"];
const CATS = [["pos","긍정"],["neg","부정"],["mix","복합"]];
const BY_ID = {}; for (const c in STICKERS) for (const s of STICKERS[c]) BY_ID[s.id] = s;
// 피그마 원본 SVG 그대로, 몸통 중심을 기준으로 정중앙 정렬
// 피그마 '감정' 원본 컴포넌트를 그대로 렌더한 이미지 — 몸통 중심을 칸 정중앙에
function svgOf(id){ const s = BY_ID[id]; return `<span class="sv"><img src="${s.src}" alt="" draggable="false" style="left:${s.l}%;top:${s.t}%;width:${s.w}%;height:${s.h}%"></span>`; }

// ---- 저장 (아이패드 브라우저 안에 저장) ----
const KEY = "emodiary.v1";
let data = {};
try { data = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { data = {}; }
for (const k in data) if (!BY_ID[data[k]]) delete data[k];   // 없는 스티커 번호는 버려요
function save(){ try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }

// ---- 화면 크기 맞춤: 가운데 정렬 + 비율 유지 ----
const stage = document.getElementById("stage");
function fit(){
  const vw = innerWidth, vh = innerHeight;
  const s = Math.min(vw / 1024, vh / 680);
  stage.style.transform = `translate(${-512*s}px, ${-340*s}px) scale(${s})`;
  document.body.style.setProperty("--sh", (680 * s) + "px");
  document.body.style.setProperty("--sy", (vh / 2 - 340 * s) + "px");
}
addEventListener("resize", fit); addEventListener("orientationchange", () => setTimeout(fit, 200)); fit();

// ---- 달력 ----
const grid = document.getElementById("grid");
const WD = ["일","월","화","수","목","금","토"];
let cur = "2026-11";
const pad = n => String(n).padStart(2, "0");
function rot(key){ let h = 0; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) | 0; return ((Math.abs(h) % 11) - 5); }

function render(){
  const [y, m] = cur.split("-").map(Number);
  const th = m === 11 ? "nov" : "dec";
  document.body.className = th;
  document.querySelectorAll(".layer").forEach(l => l.classList.toggle("on", l.dataset.th === th));
  const first = new Date(y, m - 1, 1);
  const lead = (first.getDay() + 6) % 7;           // 월요일 시작
  const days = new Date(y, m, 0).getDate();
  const rows = Math.ceil((lead + days) / 7);
  const step = rows === 5 ? 97 : (460 - 72) / (rows - 1);
  const t = new Date(); const todayKey = `${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())}`;
  grid.innerHTML = "";
  for (let i = 0; i < rows * 7; i++){
    const d = new Date(y, m - 1, 1 - lead + i);
    const inMonth = d.getMonth() === m - 1;
    const key = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    const b = document.createElement("button");
    b.className = "day" + (inMonth ? "" : " out") + (key === todayKey ? " today" : "");
    b.style.left = (9 + (i % 7) * 102) + "px";
    b.style.top = (Math.floor(i / 7) * step) + "px";
    b.dataset.key = key;
    b.setAttribute("aria-label", `${d.getMonth()+1}월 ${d.getDate()}일`);
    b.innerHTML = `<img class="cell" src="${CELL[th]}" alt=""><span class="num">${d.getDate()}</span>`;
    if (inMonth && data[key] && BY_ID[data[key]]) addSticker(b, data[key], key);
    if (inMonth && hasDiary(key)) b.insertAdjacentHTML("beforeend", '<i class="dot"></i>');
    b.onclick = () => openSheet(key);
    grid.appendChild(b);
  }
}
function addSticker(btn, id, key){
  const w = document.createElement("span");
  w.className = "stk"; w.innerHTML = svgOf(id); w.setAttribute("aria-label", BY_ID[id].name);
  btn.appendChild(w);
}

// ---- 일기 데이터 (글: localStorage, 손글씨: IndexedDB) ----
const DKEY = "emodiary.days";
let days = {};
try { days = JSON.parse(localStorage.getItem(DKEY) || "{}") || {}; } catch (e) {}
function dayOf(k){ return days[k] || (days[k] = {tags:["","",""], feel:"", tmr:"", minis:[], ink:false, t:0}); }
function hasDiary(k){ const d = days[k]; return !!d && (d.ink || d.feel || d.tmr || d.tags.some(Boolean) || d.minis.some(Boolean)); }
const pushTimers = {};
function saveDay(k){
  const d = dayOf(k); d.t = Date.now();
  try { localStorage.setItem(DKEY, JSON.stringify(days)); } catch (e) {}
  clearTimeout(pushTimers[k]); pushTimers[k] = setTimeout(() => pushDay(k), 1200);
}
let idb = null;
const idbReady = new Promise(res => {
  try { const r = indexedDB.open("emodiary", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("ink");
    r.onsuccess = () => { idb = r.result; res(); }; r.onerror = () => res();
  } catch (e) { res(); }
});
async function inkGet(k){ await idbReady; if (!idb) return null;
  return new Promise(res => { try { const q = idb.transaction("ink").objectStore("ink").get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); } catch (e) { res(null); } }); }
async function inkPut(k, v){ await idbReady; if (!idb) return;
  try { const tx = idb.transaction("ink", "readwrite"); v ? tx.objectStore("ink").put(v, k) : tx.objectStore("ink").delete(k); } catch (e) {} }
// 클라우드 저장 자리 (4단계에서 Supabase로 바꿔요). 지금은 연결이 없어 로컬에만 저장돼요.
let cloudCol = null;
async function pushDay(k){
  if (!cloudCol) return;
  const d = dayOf(k); const ink = d.ink ? await inkGet(k) : null;
  try { await cloudCol.doc("day-" + k).set({ tags: d.tags, feel: d.feel, tmr: d.tmr, minis: d.minis, ink: ink || "", t: d.t }); } catch (e) {}
}
async function pullDay(k){
  if (!cloudCol) return false;
  try {
    const snap = await cloudCol.doc("day-" + k).get();
    const v = snap && (typeof snap.data === "function" ? snap.data() : (snap.data ?? snap));
    if (!v || !v.t || v.t <= (days[k]?.t || 0)) return false;
    days[k] = { tags: v.tags || ["","",""], feel: v.feel || "", tmr: v.tmr || "", minis: v.minis || [], ink: !!v.ink, t: v.t };
    await inkPut(k, v.ink || null);
    try { localStorage.setItem(DKEY, JSON.stringify(days)); } catch (e) {}
    return true;
  } catch (e) { return false; }
}

// ---- 팝업 (월간 날짜 / 일간 대표 감정 / 작은 감정 칸 공용) ----
const dim = document.getElementById("dim"), tabs = document.getElementById("tabs"), stks = document.getElementById("stks");
const rm = document.getElementById("rm"), hint = document.getElementById("hint"), goDay = document.getElementById("goDay");
let target = null, cat = "pos";
CATS.forEach(([c, label]) => {
  const t = document.createElement("button");
  t.className = "tab"; t.dataset.c = c;
  t.innerHTML = `${label}<small>${STICKERS[c].length}</small>`;
  t.onclick = () => { cat = c; drawStickers(); };
  tabs.appendChild(t);
});
function curSel(){ if (!target) return null;
  const id = target.type === "main" ? data[target.key] : (days[target.key]?.minis || [])[target.idx];
  return BY_ID[id] ? id : null; }
function drawStickers(){
  tabs.querySelectorAll(".tab").forEach(t => t.classList.toggle("on", t.dataset.c === cat));
  const sel = curSel();
  stks.innerHTML = "";
  for (const s of STICKERS[cat]){
    const b = document.createElement("button");
    b.className = "sb" + (s.id === sel ? " sel" : "");
    b.innerHTML = `${svgOf(s.id)}<span>${s.name}</span>`;
    b.onclick = () => pick(s.id);
    stks.appendChild(b);
  }
  stks.scrollTop = 0;
}
function openSheet(key, type = "main", idx = 0){
  target = { key, type, idx };
  const d = new Date(key + "T00:00:00");
  document.getElementById("shDate").textContent = `${d.getMonth()+1}월 ${d.getDate()}일 (${WD[d.getDay()]})`;
  document.querySelector(".sh-q").textContent = type === "main" ? "오늘은 어떤 기분인가요?" : "함께 느낀 감정을 골라요";
  const sel = curSel();
  if (sel){ for (const c in STICKERS) if (STICKERS[c].some(s => s.id === sel)) cat = c; }
  rm.hidden = !sel;
  goDay.hidden = view !== "month";
  hint.textContent = sel ? `지금 붙은 스티커: ${BY_ID[sel].name}` : "스티커를 누르면 바로 붙어요";
  drawStickers();
  dim.classList.add("on");
}
function closeSheet(){ dim.classList.remove("on"); target = null; }
function apply(id){
  const { key, type, idx } = target;
  if (type === "main"){ if (id) data[key] = id; else delete data[key]; save(); }
  else { const d = dayOf(key); d.minis[idx] = id || ""; saveDay(key); }
  closeSheet();
  if (view === "month") render(); else renderDay();
}
function pick(id){ setTimeout(() => apply(id), 220); }   // 눌림 효과를 보여준 뒤 붙이기
rm.onclick = () => apply(null);
goDay.onclick = () => { const k = target.key; closeSheet(); openDay(k); };
document.getElementById("shX").onclick = closeSheet;
dim.addEventListener("click", e => { if (e.target === dim) closeSheet(); });

// ---- 화면 전환 ----
let view = "month";
const memoView = document.getElementById("memoView");
const introView = document.getElementById("introView"), coverView = document.getElementById("coverView"), meView = document.getElementById("meView");
const monthView = document.getElementById("monthView"), dayView = document.getElementById("dayView"), recView = document.getElementById("recView");
function setView(v){
  view = v;
  monthView.hidden = v !== "month"; dayView.hidden = v !== "day"; recView.hidden = v !== "rec"; introView.hidden = v !== "intro";
  coverView.hidden = v !== "cover"; meView.hidden = v !== "me"; memoView.hidden = v !== "memo";
  stage.classList.remove("v-month", "v-day", "v-rec", "v-intro", "v-cover", "v-me", "v-memo"); stage.classList.add("v-" + v);
  document.querySelectorAll(".gnb-hit").forEach(b => b.style.zIndex = 5);
}
function showMonth(ym){ commitAll(); if (ym) cur = ym; setView("month"); render(); }

// ---- 일간 ----
let dayKey = null;
const K = 2.5;                       // 손글씨 해상도 배율
const PEN_COLORS = ["#3e4152", "#b47739", "#e2566a", "#3a8fd0"];
let penColor = 0, erasing = false;
const pages = [...document.querySelectorAll(".pg")].map((el, side) => {
  el.innerHTML = `
    <div class="pdate"></div>
    <button class="main-slot" aria-label="대표 감정"></button>
    <input class="tag" style="left:140px" maxlength="8" enterkeyhint="next">
    <input class="tag" style="left:239px" maxlength="8" enterkeyhint="next">
    <input class="tag" style="left:337px" maxlength="8" enterkeyhint="done">
    ${[346,374,403,432].map((x,i)=>`<button class="mini" data-i="${i}" style="left:${x}px" aria-label="함께 느낀 감정 ${i+1}"></button>`).join("")}
    <textarea class="ta feel" placeholder="오늘 있었던 일과 느낀 감정을 적어요"></textarea>
    <textarea class="ta tmr" placeholder=""></textarea>
    <canvas class="ink" width="${Math.round(473*K)}" height="${Math.round(616*K)}"></canvas>`;
  const pg = { el, side, key: null, strokes: [], base: null,
    date: el.querySelector(".pdate"), slot: el.querySelector(".main-slot"),
    tags: [...el.querySelectorAll(".tag")], minis: [...el.querySelectorAll(".mini")],
    feel: el.querySelector(".feel"), tmr: el.querySelector(".tmr"), cv: el.querySelector(".ink") };
  pg.ctx = pg.cv.getContext("2d");
  pg.slot.onclick = () => openSheet(pg.key, "main");
  pg.minis.forEach(b => b.onclick = () => openSheet(pg.key, "mini", +b.dataset.i));
  const onText = () => { if (!pg.key) return; const d = dayOf(pg.key);
    d.tags = pg.tags.map(i => i.value.trim()); d.feel = pg.feel.value; d.tmr = pg.tmr.value; saveDay(pg.key); };
  [...pg.tags, pg.feel, pg.tmr].forEach(i => i.addEventListener("input", onText));
  // 줄 수 넘치면 더 못 쓰게 (줄 노트 칸 안에서만)
  [[pg.feel, 7], [pg.tmr, 3]].forEach(([ta, rows]) => ta.addEventListener("input", () => {
    while (ta.scrollHeight > rows * 22 + 2 && ta.value.length) ta.value = ta.value.slice(0, -1);
  }));
  pg.tags.forEach((inp, i) => inp.addEventListener("keydown", e => { if (e.key === "Enter"){ e.preventDefault(); (pg.tags[i+1] || pg.feel).focus(); } }));
  setupInk(pg);
  return pg;
});

function keyAdd(k, n){ const d = new Date(k + "T00:00:00"); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function openDay(k){
  commitAll();
  dayKey = k; setView("day");
  renderDay(true);
  Promise.all(pages.map(p => pullDay(p.key))).then(ch => { if (ch.some(Boolean)) renderDay(true); });
}
async function renderDay(force = false){
  const m = +dayKey.slice(5, 7);
  const th = m === 11 ? "nov" : "dec";
  document.body.className = th;
  document.getElementById("dayBg").src = th === "nov" ? DAYBG.nov : DAYBG.dec;
  for (const pg of pages){
    const k = keyAdd(dayKey, pg.side); const changed = pg.key !== k; pg.key = k;
    const d = new Date(k + "T00:00:00"); const e = days[k] || dayOf(k);
    pg.date.textContent = `${d.getMonth()+1}월 ${d.getDate()}일 ${WD[d.getDay()]}`;
    const mainId = BY_ID[data[k]] ? data[k] : "";
    if (changed || pg.slot.dataset.id !== mainId){
      pg.slot.dataset.id = mainId;
      pg.slot.innerHTML = mainId ? `<span class="stk">${svgOf(mainId)}</span>` : `<span class="ph">눌러서<br>감정 붙이기</span>`;
    }
    pg.minis.forEach((b, i) => { const id = BY_ID[e.minis[i]] ? e.minis[i] : "";
      if (changed || b.dataset.id !== id){ b.dataset.id = id; b.innerHTML = id ? svgOf(id) : ""; } });
    pg.tags.forEach((inp, i) => { if (document.activeElement !== inp) inp.value = e.tags[i] || ""; });
    if (document.activeElement !== pg.feel) pg.feel.value = e.feel || "";
    if (document.activeElement !== pg.tmr) pg.tmr.value = e.tmr || "";
    if (changed || force) await loadInk(pg);
  }
}
function turn(el, dir){ el.classList.remove("turn-next", "turn-prev"); void el.offsetWidth; el.classList.add(dir > 0 ? "turn-next" : "turn-prev"); }
function dayStep(dir){ commitAll(); dayKey = keyAdd(dayKey, 2 * dir); openDay(dayKey); turn(dayView, dir); }
document.getElementById("prevDay").onclick = () => dayStep(-1);
document.getElementById("nextDay").onclick = () => dayStep(1);

// ---- 스와이프로 넘기기 (손가락은 항상, 펜슬은 키보드 모드일 때만) ----
let swipedAt = 0;   // 스와이프 직후 손을 뗀 자리의 버튼이 눌리지 않게
document.addEventListener("click", e => { if (Date.now() - swipedAt < 300){ e.stopPropagation(); e.preventDefault(); } }, true);
function attachSwipe(el, onPrev, onNext){
  let s = null;
  el.addEventListener("pointerdown", e => {
    if (!e.isPrimary || dim.classList.contains("on")) return;
    if (stage.classList.contains("pen") && e.pointerType !== "touch") return;   // 펜 모드의 펜슬·마우스는 글씨 쓰기
    s = { x: e.clientX, y: e.clientY, t: Date.now(), id: e.pointerId, lx: e.clientX, ly: e.clientY };
  }, true);
  el.addEventListener("pointermove", e => { if (s && e.pointerId === s.id){ s.lx = e.clientX; s.ly = e.clientY; } }, true);
  const end = e => {
    if (!s || e.pointerId !== s.id) return;
    const dx = s.lx - s.x, dy = s.ly - s.y, dt = Date.now() - s.t; s = null;
    const min = Math.max(50, innerWidth * 0.06);
    if (Math.abs(dx) > min && Math.abs(dy) < Math.abs(dx) * 0.6 && dt < 900){
      document.activeElement?.blur?.();
      swipedAt = Date.now();
      dx < 0 ? onNext() : onPrev();
    }
  };
  el.addEventListener("pointerup", end, true);
  el.addEventListener("pointercancel", end, true);
}


// ---- 손글씨 (애플펜슬만 그림, 손가락은 무시) ----
document.querySelectorAll(".seg button").forEach(b => b.onclick = () => {
  document.querySelectorAll(".seg button").forEach(x => x.classList.toggle("on", x === b));
  stage.classList.toggle("pen", b.dataset.mode === "pen");
  if (b.dataset.mode === "pen") document.activeElement?.blur?.();
});
const tColor = document.getElementById("tColor"), tErase = document.getElementById("tErase");
function setPenUI(){ stage.style.setProperty("--pen", PEN_COLORS[penColor]); tErase.classList.toggle("on", erasing); tColor.classList.toggle("on", !erasing); }
const cpop = document.getElementById("cpop");
function drawPop(){ cpop.innerHTML = PEN_COLORS.map((c, i) => `<button class="sw${i === penColor ? " sel" : ""}" data-i="${i}" aria-label="펜 색 ${i+1}"><i style="background:${c}"></i></button>`).join(""); }
tColor.onclick = e => { e.stopPropagation(); drawPop(); cpop.classList.toggle("on"); };
cpop.onclick = e => { e.stopPropagation(); const b = e.target.closest(".sw"); if (!b) return;
  penColor = +b.dataset.i; erasing = false; setPenUI(); drawPop(); setTimeout(() => cpop.classList.remove("on"), 150); };
document.addEventListener("pointerdown", e => { if (!e.target.closest(".cwrap")) cpop.classList.remove("on"); });
tErase.onclick = () => { erasing = !erasing; setPenUI(); };
document.getElementById("tUndo").onclick = () => {
  const pool = view === "rec" ? [recPad] : view === "memo" ? [memoPad] : pages;
  const pg = pool.reduce((a, b) => (b.lastT || 0) > (a.lastT || 0) ? b : a);
  if (!pg.strokes.length) return showToast("되돌릴 손글씨가 없어요");
  pg.strokes.pop(); redraw(pg); queueInk(pg);
};
setPenUI();

function drawStroke(ctx, s){
  ctx.save();
  ctx.globalCompositeOperation = s.erase ? "destination-out" : "source-over";
  ctx.strokeStyle = s.color; ctx.lineCap = "round"; ctx.lineJoin = "round";
  const p = s.pts;
  if (p.length === 1){ ctx.beginPath(); ctx.arc(p[0][0], p[0][1], s.w * (0.5 + p[0][2]) / 2, 0, 7); ctx.fillStyle = s.color; ctx.fill(); }
  for (let i = 1; i < p.length; i++){
    ctx.beginPath(); ctx.lineWidth = s.w * (0.5 + (p[i][2] + p[i-1][2]) / 2);
    ctx.moveTo(p[i-1][0], p[i-1][1]); ctx.lineTo(p[i][0], p[i][1]); ctx.stroke();
  }
  ctx.restore();
}
function redraw(pg){
  pg.ctx.clearRect(0, 0, pg.cv.width, pg.cv.height);
  if (pg.base) pg.ctx.drawImage(pg.base, 0, 0, pg.cv.width, pg.cv.height);
  for (const s of pg.strokes) drawStroke(pg.ctx, s);
}
function setupInk(pg){
  let cur = null;
  const pt = e => { const r = pg.cv.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width * pg.cv.width, (e.clientY - r.top) / r.height * pg.cv.height, e.pointerType === "pen" ? (e.pressure || .5) : .5]; };
  pg.cv.addEventListener("pointerdown", e => {
    if (e.pointerType === "touch") return;          // 손바닥·손가락 무시
    e.preventDefault(); try { pg.cv.setPointerCapture(e.pointerId); } catch (_) {}
    cur = { color: PEN_COLORS[penColor], w: (erasing ? 16 : 2.1) * (pg.k || K), erase: erasing, pts: [pt(e)] };
    pg.strokes.push(cur); pg.lastT = Date.now(); drawStroke(pg.ctx, { ...cur });
  });
  pg.cv.addEventListener("pointermove", e => {
    if (!cur) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of evs){ const p = pt(ev); const last = cur.pts[cur.pts.length - 1];
      cur.pts.push(p); drawStroke(pg.ctx, { ...cur, pts: [last, p] }); }
  });
  const end = () => { if (!cur) return; cur = null; queueInk(pg); };
  pg.cv.addEventListener("pointerup", end); pg.cv.addEventListener("pointercancel", end);
  pg.cv.addEventListener("touchstart", e => { if (stage.classList.contains("pen")) e.preventDefault(); }, { passive: false });
}
function queueInk(pg){ clearTimeout(pg.inkT); pg.inkT = setTimeout(() => commitInk(pg), 700); }
async function commitInk(pg){
  clearTimeout(pg.inkT); pg.inkT = null;
  if (!pg.key) return;
  const blank = !pg.base && !pg.strokes.some(s => !s.erase);
  const url = blank ? null : pg.cv.toDataURL("image/png");
  await inkPut(pg.key, url);
  if (pg.onInk) pg.onInk(!!url); else { dayOf(pg.key).ink = !!url; saveDay(pg.key); }
}
function commitAll(){ for (const pg of [...pages, recPad, typeof memoPad !== "undefined" ? memoPad : null]) if (pg && pg.inkT) commitInk(pg); }
async function loadInk(pg){
  const k = pg.key; pg.strokes = []; pg.base = null;
  pg.ctx.clearRect(0, 0, pg.cv.width, pg.cv.height);
  const url = (pg.hasInk ? pg.hasInk(k) : days[k]?.ink) ? await inkGet(k) : null;
  if (!url || pg.key !== k) return;
  const img = new Image(); img.src = url;
  try { await img.decode(); } catch (e) { return; }
  if (pg.key !== k) return;
  pg.base = img; redraw(pg);
}
addEventListener("pagehide", commitAll);
document.addEventListener("visibilitychange", () => { if (document.hidden) commitAll(); });

// ---- 감정 기록 (3쪽) ----
const REC_LINES = [[[80, 262], [80, 370], [80, 478], [80, 587], [380, 145], [380, 256], [380, 366], [380, 476], [380, 587], [680, 145], [680, 256], [680, 366], [680, 476], [680, 587]], [[80, 256], [80, 366], [80, 476], [80, 587], [380, 145], [380, 256], [380, 366], [380, 476], [380, 587], [680, 145], [680, 256], [680, 366], [680, 476], [680, 587]], [[80, 180], [80, 291], [80, 401], [80, 564], [380, 180], [380, 291], [380, 401], [380, 511], [680, 180], [680, 291], [680, 401], [680, 511]]];           // 쪽마다 질문 칸의 첫 줄 위치 [x, y]
const RKEY = "emodiary.rec";
let rec = {}; try { rec = JSON.parse(localStorage.getItem(RKEY) || "{}") || {}; } catch (e) {}
let recPage = 1;
const recFields = document.getElementById("recFields");
const recPad = { cv: document.getElementById("recInk"), strokes: [], base: null, key: null, k: 2 };
recPad.ctx = recPad.cv.getContext("2d");
recPad.hasInk = k => !!rec[k]?.ink;
recPad.onInk = has => { const r = rec[recPad.key] || (rec[recPad.key] = { f: {}, ink: false, t: 0 }); r.ink = has; saveRec(recPad.key); };
setupInk(recPad);
const recTimers = {};
function saveRec(k){
  rec[k].t = Date.now();
  try { localStorage.setItem(RKEY, JSON.stringify(rec)); } catch (e) {}
  clearTimeout(recTimers[k]); recTimers[k] = setTimeout(async () => {
    if (!cloudCol) return; const r = rec[k]; const ink = r.ink ? await inkGet(k) : null;
    try { await cloudCol.doc(k).set({ f: r.f, ink: ink || "", t: r.t }); } catch (e) {}
  }, 1200);
}
async function pullRec(k){
  if (!cloudCol) return false;
  try { const snap = await cloudCol.doc(k).get();
    const v = snap && (typeof snap.data === "function" ? snap.data() : (snap.data ?? snap));
    if (!v || !v.t || v.t <= (rec[k]?.t || 0)) return false;
    rec[k] = { f: v.f || {}, ink: !!v.ink, t: v.t }; await inkPut(k, v.ink || null);
    try { localStorage.setItem(RKEY, JSON.stringify(rec)); } catch (e) {}
    return true; } catch (e) { return false; }
}
async function renderRec(){
  const k = "rec-" + recPage; recPad.key = k;
  const r = rec[k] || { f: {} };
  document.getElementById("recBg").src = RECBG[recPage - 1];
  recFields.innerHTML = "";
  REC_LINES[recPage - 1].forEach(([x, y], i) => {
    const ta = document.createElement("textarea");
    ta.className = "rq"; ta.style.left = (x + 4) + "px"; ta.style.top = (y - 19) + "px";
    ta.value = r.f[i] || "";
    ta.addEventListener("input", () => {
      while (ta.scrollHeight > 3 * 22 + 2 && ta.value.length) ta.value = ta.value.slice(0, -1);
      const rr = rec[k] || (rec[k] = { f: {}, ink: false, t: 0 }); rr.f[i] = ta.value; saveRec(k);
    });
    recFields.appendChild(ta);
  });
  document.getElementById("recPrev").style.visibility = recPage > 1 ? "visible" : "hidden";
  document.getElementById("recNext").style.visibility = recPage < 3 ? "visible" : "hidden";
  await loadInk(recPad);
}
function openRec(n){
  commitAll(); recPage = n; document.body.className = "rec"; setView("rec"); renderRec();
  pullRec("rec-" + n).then(ch => { if (ch && view === "rec" && recPage === n) renderRec(); });
}
function recStep(dir){ const n = recPage + dir; if (n < 1 || n > 3) return turnEdge(dir); openRec(n); turn(recView, dir); }
function turnEdge(dir){ showToast(dir > 0 ? "마지막 쪽이에요" : "첫 쪽이에요"); }
document.getElementById("recPrev").onclick = () => recStep(-1);
document.getElementById("recNext").onclick = () => recStep(1);
// 화면 어디서든 스와이프: 일간은 이틀씩, 감정 기록은 한 쪽씩, 월간은 한 달씩
function monthStep(dir){ const n = cur === "2026-11" ? "2026-12" : "2026-11"; if ((dir > 0) !== (cur === "2026-11")) return showToast(dir > 0 ? "12월이 마지막이에요" : "11월이 처음이에요"); showMonth(n); turn(monthView, dir); }
attachSwipe(stage,
  () => view === "day" ? dayStep(-1) : view === "rec" ? recStep(-1) : view === "intro" ? introStep(-1) : view === "memo" ? memoStep(-1) : view === "month" ? monthStep(-1) : null,
  () => view === "day" ? dayStep(1) : view === "rec" ? recStep(1) : view === "intro" ? introStep(1) : view === "memo" ? memoStep(1) : view === "month" ? monthStep(1) : null);

// ---- 감정 소개 (2쪽, 보기 전용) ----
const INTROBG = ["/assets/intro1.webp", "/assets/intro2.webp"];
let introPage = 1;
function openIntro(n){
  commitAll(); introPage = n; document.body.className = "rec"; setView("intro");
  document.getElementById("introBg").src = INTROBG[n - 1];
  document.getElementById("introPrev").style.visibility = n > 1 ? "visible" : "hidden";
  document.getElementById("introNext").style.visibility = n < 2 ? "visible" : "hidden";
}
function introStep(dir){ const n = introPage + dir; if (n < 1 || n > 2) return turnEdge(dir); openIntro(n); turn(introView, dir); }
document.getElementById("introPrev").onclick = () => introStep(-1);
document.getElementById("introNext").onclick = () => introStep(1);

// ---- 표지 ----
function openCover(){ commitAll(); document.body.className = "purple edge cover"; setView("cover"); }
document.getElementById("coverGo").onclick = () => showMonth(todayYM());
function todayYM(){ const t = new Date(); return (t.getFullYear() === 2026 && t.getMonth() === 11) ? "2026-12" : "2026-11"; }

// ---- 내 소개 ----
const MKEY = "emodiary.me";
let me = { name: "", a: ["", "", "", ""], photo: false, t: 0 };
try { me = Object.assign(me, JSON.parse(localStorage.getItem(MKEY) || "{}")); } catch (e) {}
const meName = document.getElementById("meName"), meAs = [...document.querySelectorAll(".me-a")];
const mePhoto = document.getElementById("mePhoto"), mePhotoDel = document.getElementById("mePhotoDel");
let meTimer;
function saveMe(){
  me.t = Date.now(); try { localStorage.setItem(MKEY, JSON.stringify(me)); } catch (e) {}
  clearTimeout(meTimer); meTimer = setTimeout(async () => {
    if (!cloudCol) return; const photo = me.photo ? await inkGet("me-photo") : null;
    try { await cloudCol.doc("profile").set({ name: me.name, a: me.a, photo: photo || "", t: me.t }); } catch (e) {}
  }, 1200);
}
async function pullMe(){
  if (!cloudCol) return false;
  try { const snap = await cloudCol.doc("profile").get();
    const v = snap && (typeof snap.data === "function" ? snap.data() : (snap.data ?? snap));
    if (!v || !v.t || v.t <= me.t) return false;
    me = { name: v.name || "", a: v.a || ["","","",""], photo: !!v.photo, t: v.t };
    await inkPut("me-photo", v.photo || null); try { localStorage.setItem(MKEY, JSON.stringify(me)); } catch (e) {}
    return true; } catch (e) { return false; }
}
meName.addEventListener("input", () => { me.name = meName.value; saveMe(); });
meAs.forEach((inp, i) => inp.addEventListener("input", () => { me.a[i] = inp.value; saveMe(); }));
[meName, ...meAs].forEach((inp, i, arr) => inp.addEventListener("keydown", e => { if (e.key === "Enter"){ e.preventDefault(); arr[i+1] ? arr[i+1].focus() : inp.blur(); } }));
document.getElementById("mePhotoBtn").onclick = () => document.getElementById("meFile").click();
document.getElementById("meFile").onchange = async e => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  const img = new Image(); img.src = URL.createObjectURL(f);
  try { await img.decode(); } catch (_) { return showToast("사진을 열 수 없어요"); }
  const S = 360, c = document.createElement("canvas"); c.width = c.height = S;
  const k = Math.max(S / img.width, S / img.height), w = img.width * k, h = img.height * k;
  c.getContext("2d").drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
  const url = c.toDataURL("image/jpeg", .85); URL.revokeObjectURL(img.src);
  await inkPut("me-photo", url); me.photo = true; saveMe(); renderMe();
};
mePhotoDel.onclick = async () => { await inkPut("me-photo", null); me.photo = false; saveMe(); renderMe(); };
document.querySelectorAll(".me-link").forEach(b => b.onclick = () => b.dataset.go === "intro" ? openIntro(1) : openRec(1));
async function renderMe(){
  if (document.activeElement !== meName) meName.value = me.name || "";
  meAs.forEach((inp, i) => { if (document.activeElement !== inp) inp.value = me.a[i] || ""; });
  const url = me.photo ? await inkGet("me-photo") : null;
  mePhoto.hidden = !url; mePhotoDel.hidden = !url; if (url) mePhoto.src = url;
  // 작은 달력 (2026년 11·12월) — 스티커가 있으면 숫자 대신 스티커
  const box = document.getElementById("meCal"); box.innerHTML = "";
  const t = new Date(); const todayKey = `${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())}`;
  [[11, 568.5], [12, 799.5]].forEach(([m, x0]) => {
    const lead = (new Date(2026, m - 1, 1).getDay() + 6) % 7, days = new Date(2026, m, 0).getDate();
    const rows = Math.ceil((lead + days) / 7), step = rows === 5 ? 23 : 20.5;
    for (let i = 0; i < rows * 7; i++){
      const d = new Date(2026, m - 1, 1 - lead + i), inM = d.getMonth() === m - 1;
      const key = `2026-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
      const b = document.createElement("button");
      b.className = "mc" + (inM ? "" : " out") + (inM && key === todayKey ? " today" : "");
      b.style.left = (x0 + (i % 7) * 28) + "px"; b.style.top = (494.5 + Math.floor(i / 7) * step) + "px";
      b.innerHTML = inM && BY_ID[data[key]] ? svgOf(data[key]) : d.getDate();
      if (inM) b.onclick = () => openDay(key);
      box.appendChild(b);
    }
  });
}
function openMe(){
  commitAll(); document.body.className = "purple edge me"; setView("me"); renderMe();
  pullMe().then(ch => { if (ch && view === "me") renderMe(); });
}

// ---- 메모 (여러 장, 줄 노트 / 모눈 노트) ----
const MEMOBG = { line: "/assets/memoLine.webp", dot: "/assets/memoDot.webp" };
const NKEY = "emodiary.memo";
let memo = { pages: [], t: 0 };
try { memo = Object.assign(memo, JSON.parse(localStorage.getItem(NKEY) || "{}")); } catch (e) {}
if (!memo.pages.length) memo.pages.push({ id: "m" + Date.now().toString(36), type: "line", text: "", ink: false, t: 0 });
let memoIdx = 0;
const memoTa = document.getElementById("memoTa");
const memoPad = { cv: document.getElementById("memoInk"), strokes: [], base: null, key: null, k: 2 };
memoPad.ctx = memoPad.cv.getContext("2d");
memoPad.hasInk = k => !!memo.pages.find(p => "memo-" + p.id === k)?.ink;
memoPad.onInk = has => { const p = memo.pages[memoIdx]; if (p && "memo-" + p.id === memoPad.key){ p.ink = has; saveMemo(p); } };
setupInk(memoPad);
let memoTimers = {};
function saveMemo(p){
  p.t = Date.now(); memo.t = p.t;
  try { localStorage.setItem(NKEY, JSON.stringify(memo)); } catch (e) {}
  clearTimeout(memoTimers[p.id]); memoTimers[p.id] = setTimeout(async () => {
    if (!cloudCol) return; const ink = p.ink ? await inkGet("memo-" + p.id) : null;
    try {
      await cloudCol.doc("memo-" + p.id).set({ type: p.type, text: p.text, ink: ink || "", t: p.t });
      await cloudCol.doc("memo").set({ ids: memo.pages.map(x => x.id), t: memo.t });
    } catch (e) {}
  }, 1200);
}
async function pullMemo(){
  if (!cloudCol) return false;
  try {
    const sn = await cloudCol.doc("memo").get(); const v = sn && (typeof sn.data === "function" ? sn.data() : (sn.data ?? sn));
    if (!v || !v.ids || v.t <= memo.t) return false;
    const pagesNew = [];
    for (const id of v.ids){
      const s = await cloudCol.doc("memo-" + id).get(); const d = s && (typeof s.data === "function" ? s.data() : (s.data ?? s));
      if (!d) continue; pagesNew.push({ id, type: d.type || "line", text: d.text || "", ink: !!d.ink, t: d.t || 0 });
      await inkPut("memo-" + id, d.ink || null);
    }
    if (!pagesNew.length) return false;
    memo = { pages: pagesNew, t: v.t }; try { localStorage.setItem(NKEY, JSON.stringify(memo)); } catch (e) {}
    return true;
  } catch (e) { return false; }
}
function memoRows(){ return memo.pages[memoIdx].type === "line" ? 15 : 23; }
async function renderMemo(){
  const p = memo.pages[memoIdx];
  document.body.className = "edge " + (p.type === "line" ? "mint memoLine" : "olive memoDot");
  document.getElementById("memoBg").src = MEMOBG[p.type];
  document.querySelectorAll(".ptype").forEach(b => b.classList.toggle("on", b.dataset.t === p.type));
  memoTa.className = "memo-ta " + p.type; memoTa.value = p.text || "";
  document.getElementById("memoPg").textContent = `${memoIdx + 1} / ${memo.pages.length}`;
  document.getElementById("memoPrev").style.visibility = memoIdx > 0 ? "visible" : "hidden";
  memoPad.key = "memo-" + p.id; await loadInk(memoPad);
}
memoTa.addEventListener("input", () => {
  const rows = memoRows(), lh = memo.pages[memoIdx].type === "line" ? 32 : 22;
  while (memoTa.scrollHeight > rows * lh + 2 && memoTa.value.length) memoTa.value = memoTa.value.slice(0, -1);
  const p = memo.pages[memoIdx]; p.text = memoTa.value; saveMemo(p);
});
document.querySelectorAll(".ptype").forEach(b => b.onclick = () => {
  const p = memo.pages[memoIdx]; if (p.type === b.dataset.t) return;
  p.type = b.dataset.t; saveMemo(p); renderMemo();
  memoTa.dispatchEvent(new Event("input"));   // 바뀐 줄 수에 맞게 넘치는 글 정리
});
function openMemo(i){
  commitAll(); memoIdx = Math.max(0, Math.min(i, memo.pages.length - 1)); setView("memo"); renderMemo();
  pullMemo().then(ch => { if (ch && view === "memo"){ memoIdx = Math.min(memoIdx, memo.pages.length - 1); renderMemo(); } });
}
function memoStep(dir){
  commitAll();
  const n = memoIdx + dir;
  if (n < 0) return turnEdge(-1);
  if (n >= memo.pages.length){
    const cur = memo.pages[memoIdx];
    if (!cur.text && !cur.ink) return showToast("이 장을 먼저 써야 새 장이 생겨요");
    memo.pages.push({ id: "m" + Date.now().toString(36), type: cur.type, text: "", ink: false, t: 0 });
    saveMemo(memo.pages[memo.pages.length - 1]); showToast("새 메모 장을 만들었어요");
  }
  memoIdx = n; renderMemo(); turn(memoView, dir);
}
document.getElementById("memoPrev").onclick = () => memoStep(-1);
document.getElementById("memoNext").onclick = () => memoStep(1);

// ---- 모든 버튼: 누르면 작아졌다가 → 살짝 커졌다가 → 제자리 ----
const NO_BUMP = ".gnb-hit, #coverGo, .me-link";
document.addEventListener("pointerdown", e => {
  const b = e.target.closest("button");
  if (!b || b.matches(NO_BUMP) || b.disabled) return;
  if (stage.classList.contains("pen") && e.pointerType === "pen" && b.closest(".pg, #recView, #memoView") && !b.matches(".main-slot, .mini, .nav")) return;
  b.getAnimations().forEach(a => a.id === "bump" && a.cancel());
  const a = b.animate([{ transform: "scale(1)" }, { transform: "scale(.86)", offset: .35 }, { transform: "scale(1.06)", offset: .7 }, { transform: "scale(1)" }],
    { duration: 340, easing: "ease-out" });
  a.id = "bump";
}, true);

// ---- 상단 메뉴 ----
const toast = document.getElementById("toast"); let tt;
function showToast(msg){ toast.textContent = msg; toast.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove("on"), 1400); }
document.querySelectorAll(".gnb-hit").forEach(b => b.onclick = () => {
  const g = b.dataset.go;
  if (!user) return showToast("먼저 로그인해 주세요");
  if (g === "soon") return showToast(`${b.getAttribute("aria-label")} 화면은 다음 단계에서 만들어요`);
  if (g === "rec") return openRec(recPage);
  if (g === "intro") return openIntro(introPage);
  if (g === "cover") return openCover();
  if (g === "me") return openMe();
  if (g === "memo") return openMemo(memoIdx);
  showMonth(g);
});

// ---- 로그인 (Supabase Auth: 카카오 / 구글) ----
let user = null;
const loginBox = document.getElementById("login"), coverGo = document.getElementById("coverGo");
function showLogin(on){ loginBox.hidden = !on; coverGo.hidden = on; }
loginBox.querySelectorAll(".login-btn").forEach(b => b.onclick = async () => {
  const provider = b.dataset.provider;
  loginBox.querySelectorAll("button").forEach(x => x.disabled = true);
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: location.origin + location.pathname,
      // 카카오: 이메일(비즈 앱 전용)은 요청하지 않는다
      ...(provider === "kakao" ? { scopes: "profile_nickname profile_image" } : {}),
    },
  });
  if (error){ loginBox.querySelectorAll("button").forEach(x => x.disabled = false); showToast("로그인을 시작하지 못했어요"); }
});
document.getElementById("logout").onclick = async () => {
  if (!confirm("로그아웃할까요?")) return;
  commitAll();
  await supabase.auth.signOut();
};
supabase.auth.onAuthStateChange((event, session) => {
  const was = user; user = session?.user ?? null;
  if (event === "SIGNED_OUT" || (!user && was)){ openCover(); showLogin(true); }
  else if (user && !was && view === "cover" && !loginBox.hidden){ showLogin(false); showMonth(todayYM()); }
});

// 처음 열 때: 오늘이 11·12월이면 그 달, 아니면 11월
(() => { const t = new Date(); if (t.getFullYear() === 2026 && (t.getMonth() === 10 || t.getMonth() === 11)) cur = `2026-${t.getMonth()+1}`; })();
(async () => {
  document.body.classList.add("booting");
  const q = new URLSearchParams(location.search + "&" + location.hash.slice(1));
  const failed = q.get("error_description") || q.get("error");
  let session = null;
  try { ({ data: { session } } = await supabase.auth.getSession()); } catch (e) {}
  user = session?.user ?? null;
  if (failed || location.search.includes("code=")) history.replaceState(null, "", location.pathname);
  if (user){ showLogin(false); setView("month"); render(); }
  else { openCover(); showLogin(true); }
  document.body.classList.remove("booting");
  if (failed && !user) showToast("로그인하지 못했어요. 다시 시도해 주세요");
})();
