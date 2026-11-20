import stickersJson from "./stickers.json";
import { supabase } from "./supabase.js";
import { registerSW } from "virtual:pwa-register";

// 오프라인용 서비스워커 (새 버전이 배포되면 다음에 열 때 자동으로 바뀐다)
if ("serviceWorker" in navigator) registerSW({ immediate: true });

const STICKERS = stickersJson;
const CELL = {nov:"/assets/nov_cell.webp", dec:"/assets/dec_cell.webp"};
const DAYBG = {nov:"/assets/nov_daily.webp", dec:"/assets/dec_daily.webp"};
const RECBG = ["/assets/rec1.webp", "/assets/rec2.webp", "/assets/rec3.webp"];
const CATS = [["pos","긍정"],["neg","부정"],["mix","복합"]];
const BY_ID = {}; for (const c in STICKERS) for (const s of STICKERS[c]) BY_ID[s.id] = s;
// 피그마 원본 SVG 그대로, 몸통 중심을 기준으로 정중앙 정렬
// 피그마 '감정' 원본 컴포넌트를 그대로 렌더한 이미지 — 몸통 중심을 칸 정중앙에
function svgOf(id){ const s = BY_ID[id]; return `<span class="sv"><img src="${s.src}" alt="" draggable="false" style="left:${s.l}%;top:${s.t}%;width:${s.w}%;height:${s.h}%"></span>`; }

// ---- 저장 ----
// 기기 안(localStorage·IndexedDB)에 먼저 저장하고, 로그인한 사람의 Supabase로 올린다(sync 부분).
// 기기 안 저장 공간은 사용자마다 따로: emodiary.<user_id>.*
let UID = null, NS = "emodiary.anon.";
const ls = {
  get(k, d){ try { const v = JSON.parse(localStorage.getItem(NS + k)); return v ?? d; } catch (e) { return d; } },
  set(k, v){ try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch (e) {} },
};
let data = {};        // 날짜 → 스티커 id
let stickerT = {};    // 날짜 → 마지막으로 바꾼 시각(ms). 뗀 스티커도 시각을 남겨야 다른 기기에 전달된다
function save(k){
  if (k){ stickerT[k] = Date.now(); markDirty("sticker:" + k); }
  ls.set("v1", data); ls.set("stickerT", stickerT);
}

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
    if (inMonth) holdToOpen(b, key);
    b.onclick = () => { if (held === key){ held = null; return; } openSheet(key); };
    grid.appendChild(b);
  }
}
// 날짜를 0.5초 길게 누르면 팝업 없이 바로 그날 일기
let held = null;
function holdToOpen(btn, key){
  let t = null, sx = 0, sy = 0;
  const cancel = () => { clearTimeout(t); t = null; btn.classList.remove("holding"); };
  btn.addEventListener("pointerdown", e => {
    if (!e.isPrimary) return;
    sx = e.clientX; sy = e.clientY; held = null; btn.classList.add("holding");
    t = setTimeout(() => { t = null; btn.classList.remove("holding"); held = key; openDay(key); }, 500);
  });
  btn.addEventListener("pointermove", e => { if (t && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) cancel(); });
  ["pointerup", "pointercancel", "pointerleave"].forEach(ev => btn.addEventListener(ev, cancel));
  btn.addEventListener("contextmenu", e => e.preventDefault());
}
function addSticker(btn, id, key){
  const w = document.createElement("span");
  w.className = "stk"; w.innerHTML = svgOf(id); w.setAttribute("aria-label", BY_ID[id].name);
  btn.appendChild(w);
}

// ---- 날씨 (일간 '오늘 느낀 감정' 줄 오른쪽 4칸) ----
const CLOUD = 'M6.6 19.2h10.6a3.7 3.7 0 0 0 .5-7.36 5.3 5.3 0 0 0-10.2-1.1A4.25 4.25 0 0 0 6.6 19.2z';
const WEATHER = [
  ["sun", "맑음", `<circle cx="12" cy="12" r="5.2" fill="#FFC83D"/><g stroke="#FFB12B" stroke-width="2.2" stroke-linecap="round"><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.5 1.5M17.1 17.1l1.5 1.5M5.4 18.6l1.5-1.5M17.1 6.9l1.5-1.5"/></g>`],
  ["cloud", "흐림", `<path d="${CLOUD}" fill="#B8C4D4"/><path d="M8.2 13.2a3 3 0 0 1 3.3-2.5" stroke="#fff" stroke-width="1.4" stroke-linecap="round" fill="none" opacity=".8"/>`],
  ["rain", "비", `<path d="M3 12.6a9 7.8 0 0 1 18 0q-1.5-1.3-3 0q-1.5-1.3-3 0q-1.5-1.3-3 0q-1.5-1.3-3 0q-1.5-1.3-3 0q-1.5-1.3-3 0z" fill="#5FB0F0"/><path d="M12 4.8v7.8" stroke="#3E95DA" stroke-width="1.1" opacity=".55"/><path d="M12 12.4v6.3a1.9 1.9 0 0 1-3.8 0" stroke="#8A6D4F" stroke-width="1.8" stroke-linecap="round" fill="none"/><g stroke="#4FA9EE" stroke-width="1.7" stroke-linecap="round"><path d="M4.6 1.6l-.6 1.8M19.8 1.6l-.6 1.8M3.4 15.6l-.6 1.8M20.8 15.6l-.6 1.8M17 17.4l-.6 1.8"/></g>`],
  ["snow", "눈", `<g transform="translate(0 -3)"><path d="${CLOUD}" fill="#C9D6E6"/></g><g fill="#7EC4F1"><circle cx="8" cy="19.6" r="1.35"/><circle cx="12" cy="21.2" r="1.35"/><circle cx="16" cy="19.6" r="1.35"/></g>`],
];
const wxSvg = i => `<svg viewBox="0 0 24 24" aria-hidden="true">${WEATHER[i][2]}</svg>`;

// ---- 일기 데이터 (글: localStorage, 손글씨: IndexedDB) ----
let days = {};
function dayOf(k){ const d = days[k] || (days[k] = {tags:["","",""], feel:"", tmr:"", weather:"", ink:false, t:0}); if (d.weather == null) d.weather = ""; return d; }
function hasDiary(k){ const d = days[k]; return !!d && (d.ink || d.feel || d.tmr || d.tags.some(Boolean) || !!d.weather); }
function saveDay(k){
  const d = dayOf(k); d.t = Date.now();
  ls.set("days", days); markDirty("day:" + k);
}
let idb = null;
const idbReady = new Promise(res => {
  try { const r = indexedDB.open("emodiary", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("ink");
    r.onsuccess = () => { idb = r.result; res(); }; r.onerror = () => res();
  } catch (e) { res(); }
});
const inkKey = k => (UID || "anon") + "/" + k;
async function inkGet(k){ await idbReady; if (!idb) return null;
  return new Promise(res => { try { const q = idb.transaction("ink").objectStore("ink").get(inkKey(k)); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); } catch (e) { res(null); } }); }
async function inkPut(k, v){ await idbReady; if (!idb) return;
  return new Promise(res => { try { const tx = idb.transaction("ink", "readwrite"); v ? tx.objectStore("ink").put(v, inkKey(k)) : tx.objectStore("ink").delete(inkKey(k));
    tx.oncomplete = () => res(); tx.onerror = () => res(); } catch (e) { res(); } }); }
async function idbAll(){ await idbReady; if (!idb) return [];   // [키, 값] 전부 (옮기기·지우기용)
  return new Promise(res => { const out = []; try { const q = idb.transaction("ink").objectStore("ink").openCursor();
    q.onsuccess = () => { const c = q.result; if (c){ out.push([c.key, c.value]); c.continue(); } else res(out); }; q.onerror = () => res(out); } catch (e) { res(out); } }); }
async function idbDel(keys){ await idbReady; if (!idb || !keys.length) return;
  return new Promise(res => { try { const tx = idb.transaction("ink", "readwrite"); keys.forEach(k => tx.objectStore("ink").delete(k));
    tx.oncomplete = () => res(); tx.onerror = () => res(); } catch (e) { res(); } }); }

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
  const id = data[target.key];
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
  document.querySelector(".sh-q").textContent = type === "main" ? "오늘은 어떤 기분인가요?" : "오늘은 어떤 기분인가요?";
  const sel = curSel();
  if (sel){ for (const c in STICKERS) if (STICKERS[c].some(s => s.id === sel)) cat = c; }
  rm.hidden = !sel;
  goDay.hidden = view !== "month";
  document.getElementById("holdTip").hidden = view !== "month";
  hint.textContent = sel ? `지금 붙은 스티커: ${BY_ID[sel].name}` : "스티커를 누르면 바로 붙어요";
  drawStickers();
  dim.classList.add("on");
}
function closeSheet(){ dim.classList.remove("on"); target = null; }
function apply(id){
  const { key, type, idx } = target;
  if (type === "main"){ if (id) data[key] = id; else delete data[key]; save(key); }
  closeSheet();
  if (view === "month") render(); else renderDay();
}
function pick(id){ setTimeout(() => apply(id), 220); }   // 눌림 효과를 보여준 뒤 붙이기
rm.onclick = () => apply(null);
goDay.onclick = () => { const k = target.key; closeSheet(); openDay(k); };
document.getElementById("shX").onclick = closeSheet;
dim.addEventListener("click", e => { if (e.target === dim) closeSheet(); });

// 월간 왼쪽 테이프 아래 '오늘의 일기'
function todayKey(){ const t = new Date(); return `${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())}`; }
document.getElementById("todayDiary").onclick = () => openDay(todayKey());

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
    ${[346,374,403,432].map((x,i)=>`<button class="wx" data-i="${i}" style="left:${x}px" aria-label="날씨 ${WEATHER[i][1]}">${wxSvg(i)}</button>`).join("")}
    <textarea class="ta feel" placeholder="오늘 있었던 일과 느낀 감정을 적어요"></textarea>
    <textarea class="ta tmr" placeholder=""></textarea>
    <canvas class="ink" width="${Math.round(473*K)}" height="${Math.round(616*K)}"></canvas>`;
  const pg = { el, side, key: null, strokes: [], base: null,
    date: el.querySelector(".pdate"), slot: el.querySelector(".main-slot"),
    tags: [...el.querySelectorAll(".tag")], wx: [...el.querySelectorAll(".wx")],
    feel: el.querySelector(".feel"), tmr: el.querySelector(".tmr"), cv: el.querySelector(".ink") };
  pg.ctx = pg.cv.getContext("2d");
  pg.slot.onclick = () => openSheet(pg.key, "main");
  pg.wx.forEach(b => b.onclick = () => {   // 하나만 고르기, 다시 누르면 지우기
    if (!pg.key) return; const d = dayOf(pg.key), w = WEATHER[+b.dataset.i][0];
    d.weather = d.weather === w ? "" : w; saveDay(pg.key); renderDay(); });
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
    pg.wx.forEach((b, i) => { const on = (e.weather || "") === WEATHER[i][0];
      b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
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
function setMode(mode){
  document.querySelectorAll(".seg button").forEach(x => x.classList.toggle("on", x.dataset.mode === mode));
  stage.classList.toggle("pen", mode === "pen");
  if (mode === "pen") document.activeElement?.blur?.();
}
document.querySelectorAll(".seg button").forEach(b => b.onclick = () => setMode(b.dataset.mode));
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
  const pool = view === "rec" ? [recPad] : view === "memo" ? [memoPad] : view === "me" ? [mePad] : pages;
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
function commitAll(){ const ps = []; for (const pg of [...pages, recPad, typeof memoPad !== "undefined" ? memoPad : null, typeof mePad !== "undefined" ? mePad : null]) if (pg && pg.inkT) ps.push(commitInk(pg)); return Promise.all(ps); }
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
let rec = {};
let recPage = 1;
const recFields = document.getElementById("recFields");
const recPad = { cv: document.getElementById("recInk"), strokes: [], base: null, key: null, k: 2 };
recPad.ctx = recPad.cv.getContext("2d");
recPad.hasInk = k => !!rec[k]?.ink;
recPad.onInk = has => { const r = rec[recPad.key] || (rec[recPad.key] = { f: {}, ink: false, t: 0 }); r.ink = has; saveRec(recPad.key); };
setupInk(recPad);
function saveRec(k){
  rec[k].t = Date.now();
  ls.set("rec", rec); markDirty("rec:" + k);
}
async function renderRec(){
  const k = "rec-" + recPage; recPad.key = k;
  const r = rec[k] || { f: {} };
  document.getElementById("recBg").src = RECBG[recPage - 1];
  recFields.innerHTML = "";
  REC_LINES[recPage - 1].forEach(([x, y], i) => {
    const ta = document.createElement("textarea");
    ta.className = "rq"; ta.style.left = (x + 4) + "px"; ta.style.top = (y + 1) + "px";   // 질문 아래 첫 점선부터 3줄
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
let me = { name: "", a: ["", "", "", ""], photo: false, ink: false, t: 0 };
const meName = document.getElementById("meName"), meAs = [...document.querySelectorAll(".me-a")];
const mePhoto = document.getElementById("mePhoto"), mePhotoDel = document.getElementById("mePhotoDel");
function saveMe(){
  me.t = Date.now(); ls.set("me", me); markDirty("profile");
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
// 안내 그림을 누르면 그 화면으로
document.querySelectorAll(".gd").forEach(b => b.onclick = () => {
  const o = b.dataset.open;
  if (o === "month") return showMonth(todayYM());
  if (o.startsWith("intro")) return openIntro(+o.slice(5));
  openRec(1);
  if (o === "rec2" || o === "rec3") setMode(o === "rec3" ? "pen" : "key");
});
// 내 소개 손글씨 (왼쪽 카드 위)
const mePad = { cv: document.getElementById("meInk"), strokes: [], base: null, key: "me-ink", k: 2 };
mePad.ctx = mePad.cv.getContext("2d");
mePad.hasInk = () => !!me.ink;
mePad.onInk = has => { me.ink = has; saveMe(); };
setupInk(mePad);
async function renderMe(){
  if (document.activeElement !== meName) meName.value = me.name || "";
  meAs.forEach((inp, i) => { if (document.activeElement !== inp) inp.value = me.a[i] || ""; });
  const url = me.photo ? await inkGet("me-photo") : null;
  mePhoto.hidden = !url; mePhotoDel.hidden = !url; if (url) mePhoto.src = url;
  if (!mePad.inkT) loadInk(mePad);
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
}

// ---- 메모 (여러 장, 줄 노트 / 모눈 노트) ----
const MEMOBG = { line: "/assets/memoLine.webp", dot: "/assets/memoDot.webp" };
let memo = { pages: [], t: 0 };
const newMemoPage = (type = "line") => ({ id: "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), type, text: "", ink: false, t: 0 });
memo.pages.push(newMemoPage());
let memoIdx = 0;
const memoTa = document.getElementById("memoTa");
const memoPad = { cv: document.getElementById("memoInk"), strokes: [], base: null, key: null, k: 2 };
memoPad.ctx = memoPad.cv.getContext("2d");
memoPad.hasInk = k => !!memo.pages.find(p => "memo-" + p.id === k)?.ink;
memoPad.onInk = has => { const p = memo.pages[memoIdx]; if (p && "memo-" + p.id === memoPad.key){ p.ink = has; saveMemo(p); } };
setupInk(memoPad);
function saveMemo(p){
  p.t = Date.now(); memo.t = p.t;
  ls.set("memo", memo); markDirty("memo:" + p.id);
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
}
function memoStep(dir){
  commitAll();
  const n = memoIdx + dir;
  if (n < 0) return turnEdge(-1);
  if (n >= memo.pages.length){
    const cur = memo.pages[memoIdx];
    if (!cur.text && !cur.ink) return showToast("이 장을 먼저 써야 새 장이 생겨요");
    memo.pages.push(newMemoPage(cur.type));
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
  if (stage.classList.contains("pen") && e.pointerType === "pen" && b.closest(".pg, #recView, #memoView, #meView") && !b.matches(".main-slot, .wx, .nav")) return;
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

// ---- Supabase 동기화 ----
// 원칙: 쓰면 바로 기기에 저장 → '올릴 목록(dirty)'에 적어 두고 → 온라인이면 Supabase로 올린다.
// 내려받을 때는 updated_at(마지막으로 고친 시각)이 더 최근인 쪽이 이긴다. DB도 옛 수정은 무시한다(keep_newest).
let dirty = {};
let flushTimer = null, flushing = false;
const iso = t => new Date(t || Date.now()).toISOString();
const ms = v => v ? Date.parse(v) : 0;
function markDirty(id){ if (!UID) return; dirty[id] = 1; ls.set("dirty", dirty); scheduleFlush(); }
function scheduleFlush(wait = 1200){ clearTimeout(flushTimer); flushTimer = setTimeout(flush, wait); }
function pendingCount(){ return Object.keys(dirty).length; }

// 손글씨·사진: dataURL ↔ Storage 파일
async function uploadInk(path, dataUrl, type){
  const blob = await (await fetch(dataUrl)).blob();
  const { error } = await supabase.storage.from("ink").upload(path, blob, { upsert: true, contentType: type, cacheControl: "0" });
  if (error) throw error;
  return path;
}
async function removeInk(path){ try { await supabase.storage.from("ink").remove([path]); } catch (e) {} }
async function downloadInk(path){
  const { data: blob, error } = await supabase.storage.from("ink").download(path);
  if (error || !blob) return null;
  return new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(null); r.readAsDataURL(blob); });
}
async function inkPath(localKey, has, file, type = "image/png"){
  const path = `${UID}/${file}`;
  if (has){ const url = await inkGet(localKey); if (url) return uploadInk(path, url, type); }
  await removeInk(path); return null;
}

async function pushOne(id){
  const [kind, key] = id.split(/:(.*)/s);
  const db = (t, row, conflict) => supabase.from(t).upsert({ user_id: UID, ...row }, { onConflict: conflict });
  let res;
  if (kind === "sticker"){
    res = await db("stickers", { date: key, sticker_id: data[key] || null, updated_at: iso(stickerT[key]) }, "user_id,date");
  } else if (kind === "day"){
    const d = days[key]; if (!d) return true;
    const ink_path = await inkPath(key, d.ink, `day-${key}.png`);
    res = await db("days", { date: key, tags: (d.tags || []).slice(0, 3), feel: d.feel || "", tmr: d.tmr || "", weather: d.weather || "", ink_path, updated_at: iso(d.t) }, "user_id,date");
  } else if (kind === "rec"){
    const r = rec[key]; if (!r) return true;
    const ink_path = await inkPath(key, r.ink, `${key}.png`);
    res = await db("records", { page: +key.split("-")[1], fields: r.f || {}, ink_path, updated_at: iso(r.t) }, "user_id,page");
  } else if (kind === "profile"){
    const photo_path = await inkPath("me-photo", me.photo, "profile.jpg", "image/jpeg");
    const ink_path = await inkPath("me-ink", me.ink, "profile-ink.png");
    const row = { name: me.name || "", answers: (me.a || []).slice(0, 4), photo_path, ink_path, updated_at: iso(me.t) };
    res = await db("profile", row, "user_id");
    // DB에 아직 ink_path 칸이 없으면(002 마이그레이션 전) 손글씨만 빼고 저장
    if (res.error && /ink_path/.test(res.error.message || "")){ delete row.ink_path; res = await db("profile", row, "user_id"); if (!res.error && me.ink) throw new Error("profile.ink_path 칸이 없어요 (002 마이그레이션 필요)"); }
  } else if (kind === "memo"){
    const i = memo.pages.findIndex(p => p.id === key), p = memo.pages[i]; if (!p) return true;
    const ink_path = await inkPath("memo-" + p.id, p.ink, `memo-${p.id}.png`);
    res = await db("memos", { id: p.id, sort: i, type: p.type, text: p.text || "", ink_path, deleted: false, updated_at: iso(p.t || memo.t) }, "user_id,id");
  } else return true;
  if (res.error) throw res.error;
  return true;
}
let flushAgain = false;
async function flush(){
  if (!UID) return;
  if (flushing){ flushAgain = true; return; }     // 올리는 중에 새로 고친 것은 끝나자마자 이어서
  if (!navigator.onLine){ return; }               // 다시 연결되면 'online'에서 이어서 올린다
  flushing = true; flushAgain = false; let failed = false;
  try {
    for (const id of Object.keys(dirty)){
      const was = UID;
      try { await pushOne(id); if (UID === was){ delete dirty[id]; ls.set("dirty", dirty); } }
      catch (e){ failed = true; console.warn("올리기 실패", id, e?.message || e); }
    }
  } finally { flushing = false; }
  if (flushAgain) scheduleFlush(300);
  else if (failed) scheduleFlush(15000);         // 잠시 뒤 다시
}

async function pullAll(){
  if (!UID || !navigator.onLine) return false;
  const was = UID;
  const q = t => supabase.from(t).select("*");
  const [st, dy, rc, pf, mm] = await Promise.all([q("stickers"), q("days"), q("records"), q("profile"), q("memos")]);
  if (UID !== was) return false;
  for (const r of [st, dy, rc, pf, mm]) if (r.error){ console.warn("내려받기 실패", r.error.message); return false; }
  let changed = false;
  for (const row of st.data){
    const t = ms(row.updated_at); if (t <= (stickerT[row.date] || 0)) continue;
    if (row.sticker_id && BY_ID[row.sticker_id]) data[row.date] = row.sticker_id; else delete data[row.date];
    stickerT[row.date] = t; delete dirty["sticker:" + row.date]; changed = true;
  }
  for (const row of dy.data){
    const t = ms(row.updated_at), k = row.date; if (t <= (days[k]?.t || 0)) continue;
    const tags = [...(row.tags || []), "", "", ""].slice(0, 3);
    days[k] = { tags, feel: row.feel || "", tmr: row.tmr || "", weather: row.weather || "", ink: !!row.ink_path, t };
    await inkPut(k, row.ink_path ? await downloadInk(row.ink_path) : null);
    delete dirty["day:" + k]; changed = true;
  }
  for (const row of rc.data){
    const t = ms(row.updated_at), k = "rec-" + row.page; if (t <= (rec[k]?.t || 0)) continue;
    rec[k] = { f: row.fields || {}, ink: !!row.ink_path, t };
    await inkPut(k, row.ink_path ? await downloadInk(row.ink_path) : null);
    delete dirty["rec:" + k]; changed = true;
  }
  for (const row of pf.data){
    const t = ms(row.updated_at); if (t <= (me.t || 0)) continue;
    me = { name: row.name || "", a: [...(row.answers || []), "", "", "", ""].slice(0, 4), photo: !!row.photo_path, ink: !!row.ink_path, t };
    await inkPut("me-photo", row.photo_path ? await downloadInk(row.photo_path) : null);
    await inkPut("me-ink", row.ink_path ? await downloadInk(row.ink_path) : null);
    delete dirty.profile; changed = true;
  }
  const rows = mm.data.filter(r => !r.deleted).sort((a, b) => a.sort - b.sort);
  if (rows.length){
    const onlyBlank = memo.pages.length === 1 && !memo.pages[0].t && !memo.pages[0].text && !memo.pages[0].ink;
    if (onlyBlank) memo.pages = [];
    for (const row of rows){
      const t = ms(row.updated_at); let p = memo.pages.find(x => x.id === row.id);
      if (p && t <= (p.t || 0)) continue;
      if (!p){ p = { id: row.id }; memo.pages.push(p); }
      Object.assign(p, { type: row.type || "line", text: row.text || "", ink: !!row.ink_path, t });
      await inkPut("memo-" + row.id, row.ink_path ? await downloadInk(row.ink_path) : null);
      delete dirty["memo:" + row.id]; changed = true;
    }
    if (!memo.pages.length) memo.pages.push(newMemoPage());
  }
  if (UID !== was) return false;
  if (changed){
    ls.set("v1", data); ls.set("stickerT", stickerT); ls.set("days", days); ls.set("rec", rec); ls.set("me", me); ls.set("memo", memo); ls.set("dirty", dirty);
    refreshView();
  }
  return changed;
}
function refreshView(){
  if (view === "month") render();
  else if (view === "day") renderDay(true);
  else if (view === "rec") renderRec();
  else if (view === "me") renderMe();
  else if (view === "memo"){ memoIdx = Math.min(memoIdx, memo.pages.length - 1); renderMemo(); }
}

// 로그인한 사람의 기기 안 저장 공간을 연다 (처음이면 예전 기기 저장분을 옮겨 온다)
const LEGACY = { v1: "emodiary.v1", days: "emodiary.days", rec: "emodiary.rec", me: "emodiary.me", memo: "emodiary.memo" };
async function openSpace(uid){
  UID = uid; NS = `emodiary.${uid}.`;
  let moved = false;
  if (localStorage.getItem(NS + "v1") === null && Object.values(LEGACY).some(k => localStorage.getItem(k) !== null)){
    for (const [n, k] of Object.entries(LEGACY)){ const v = localStorage.getItem(k); if (v !== null) localStorage.setItem(NS + n, v); }
    const legacyInk = (await idbAll()).filter(([k]) => typeof k === "string" && !k.includes("/"));
    for (const [k, v] of legacyInk) await inkPut(k, v);
    await idbDel(legacyInk.map(([k]) => k));
    Object.values(LEGACY).forEach(k => localStorage.removeItem(k)); localStorage.removeItem("emodiary.v1.ver");
    moved = true;
  }
  data = ls.get("v1", {}); for (const k in data) if (!BY_ID[data[k]]) delete data[k];
  stickerT = ls.get("stickerT", {}); days = ls.get("days", {}); rec = ls.get("rec", {});
  me = Object.assign({ name: "", a: ["", "", "", ""], photo: false, ink: false, t: 0 }, ls.get("me", {}));
  memo = Object.assign({ pages: [], t: 0 }, ls.get("memo", {})); if (!memo.pages.length) memo.pages.push(newMemoPage());
  memoIdx = 0; dirty = ls.get("dirty", {});
  if (moved){   // 옮겨 온 내용은 모두 올릴 목록에
    const now = Date.now();
    for (const k in data){ stickerT[k] = stickerT[k] || now; dirty["sticker:" + k] = 1; }
    for (const k in days) dirty["day:" + k] = 1;
    for (const k in rec) dirty["rec:" + k] = 1;
    if (me.t) dirty.profile = 1;
    memo.pages.forEach(p => { if (p.t) dirty["memo:" + p.id] = 1; });
    ls.set("stickerT", stickerT); ls.set("dirty", dirty);
  }
}
// 로그아웃: 이 기기에 남은 내 일기를 지운다(같은 아이패드를 다른 친구가 써도 안 보이게)
async function closeSpace(){
  const uid = UID; if (!uid) return;
  Object.keys(localStorage).filter(k => k.startsWith(`emodiary.${uid}.`)).forEach(k => localStorage.removeItem(k));
  await idbDel((await idbAll()).map(([k]) => k).filter(k => typeof k === "string" && k.startsWith(uid + "/")));
  UID = null; NS = "emodiary.anon.";
  data = {}; stickerT = {}; days = {}; rec = {}; me = { name: "", a: ["", "", "", ""], photo: false, t: 0 };
  memo = { pages: [newMemoPage()], t: 0 }; memoIdx = 0; dirty = {};
}
let lastPull = 0;
function syncNow(){ if (!UID) return; lastPull = Date.now(); pullAll().finally(() => flush()); }
addEventListener("online", syncNow);
document.addEventListener("visibilitychange", () => { if (!document.hidden && Date.now() - lastPull > 30000) syncNow(); else if (document.hidden) flush(); });

// 인터넷 없이 열었는데 로그인 토큰이 만료돼 갱신을 못 한 경우, 기기에 남은 로그인 정보로 계속 쓴다
function storedUser(){
  try { const k = Object.keys(localStorage).find(k => /^sb-.*-auth-token$/.test(k));
    const v = k && JSON.parse(localStorage.getItem(k)); return v?.user?.id ? v.user : null; } catch (e) { return null; }
}
// 토큰이 무효가 되어 저절로 로그아웃된 경우: 아직 못 올린 게 있으면 기기 저장분은 지우지 않는다(같은 계정으로 다시 로그인하면 이어서 올라감)
function forgetMemory(){
  UID = null; NS = "emodiary.anon.";
  data = {}; stickerT = {}; days = {}; rec = {}; me = { name: "", a: ["", "", "", ""], photo: false, t: 0 };
  memo = { pages: [newMemoPage()], t: 0 }; memoIdx = 0; dirty = {};
}

// ---- 로그인 (Supabase Auth: 카카오 / 구글) ----
let user = null;
const loginBox = document.getElementById("login"), coverGo = document.getElementById("coverGo");
loginBox.querySelectorAll("[data-stk]").forEach(el => { el.innerHTML = svgOf(el.dataset.stk); });
function showLogin(on){ loginBox.hidden = !on; coverGo.hidden = on; }
loginBox.querySelectorAll(".login-btn").forEach(b => b.onclick = async () => {
  const provider = b.dataset.provider;
  loginBox.querySelectorAll(".login-btn").forEach(x => x.disabled = true);
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: location.origin + location.pathname,
      // 카카오: 이메일(비즈 앱 전용)은 요청하지 않는다
      ...(provider === "kakao" ? { scopes: "profile_nickname profile_image" } : {}),
    },
  });
  if (error){ loginBox.querySelectorAll(".login-btn").forEach(x => x.disabled = false); showToast("로그인을 시작하지 못했어요"); }
});
// 확인 팝업: ask({...}) → 확인이면 true, 취소면 false
const askDim = document.getElementById("askDim");
function ask({ icon, title, msg = "", ok = "확인", no = "취소", warn = false }){
  document.getElementById("askIcon").innerHTML = BY_ID[icon] ? svgOf(icon) : "";
  document.getElementById("askTitle").textContent = title;
  document.getElementById("askMsg").textContent = msg;
  const bOk = document.getElementById("askOk"), bNo = document.getElementById("askNo");
  bOk.textContent = ok; bNo.textContent = no; bOk.classList.toggle("warn", warn);
  askDim.classList.add("on");
  return new Promise(res => {
    const done = v => { askDim.classList.remove("on"); bOk.onclick = bNo.onclick = askDim.onclick = null; setTimeout(() => res(v), 120); };
    bOk.onclick = () => done(true); bNo.onclick = () => done(false);
    askDim.onclick = e => { if (e.target === askDim) done(false); };
  });
}
document.getElementById("logout").onclick = async () => {
  if (!await ask({ icon: "neg01", title: "로그아웃할까요?", msg: "일기는 안전하게 저장돼 있어요.\n다시 로그인하면 그대로 볼 수 있어요.", ok: "로그아웃" })) return;
  showToast("일기를 저장하는 중이에요…");
  await commitAll(); clearTimeout(flushTimer); await flush();
  if (pendingCount() && !await ask({ icon: "neg09", title: "아직 저장 중인 일기가 있어요", msg: "인터넷 연결을 확인해 주세요.\n지금 로그아웃하면 이 기기에서 쓴 내용이 사라져요.", ok: "그래도 로그아웃", no: "기다릴게요", warn: true })) return;
  await closeSpace();
  await supabase.auth.signOut();
};
supabase.auth.onAuthStateChange((event, session) => {
  const was = user; user = session?.user ?? null;
  if (event === "SIGNED_OUT" || (!user && was)){
    (UID && pendingCount() ? Promise.resolve(forgetMemory()) : closeSpace()).then(() => { openCover(); showLogin(true); });
  }
  else if (user && !was && view === "cover" && !loginBox.hidden){
    openSpace(user.id).then(() => { showLogin(false); showMonth(todayYM()); setTimeout(syncNow, 0); });
  }
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
  if (!user && !navigator.onLine) user = storedUser();   // 오프라인: 저장된 계정으로 열기
  if (failed || location.search.includes("code=")) history.replaceState(null, "", location.pathname);
  if (user){ await openSpace(user.id); showLogin(false); setView("month"); render(); setTimeout(syncNow, 0); }
  else { openCover(); showLogin(true); }
  document.body.classList.remove("booting");
  if (failed && !user) showToast("로그인하지 못했어요. 다시 시도해 주세요");
})();
