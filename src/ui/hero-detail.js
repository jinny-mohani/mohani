// 사진 위주 상세 화면 공통 틀 (10 장소 상세 · 05-4 숙소 상세 · 05-6 기타 상세, 11.22)
// 큰 사진 + 흐림 버튼 + 사진 위로 올라오는 흰 박스 + 박스 모서리에 걸친 프로필·사진 3장.
// 썸네일을 누르거나 큰 사진을 옆으로 밀면 큰 사진이 바뀌고, 큰 사진을 누르면 전체 화면으로 봐요.
// 스크롤하면 사진은 30% 속도로 올라가고, 박스가 위에 닿으면 윗줄이 흰 바탕 + 제목으로 바뀌어요.
import { html, useState, useEffect, useRef } from '../vendor/preact-htm.js';
import { Icon, Avatar } from './components.js';
import { openOverlay } from '../overlay.js';
import { PhotoViewer } from './viewer.js';
import { sized } from '../reservation-util.js';

export function HeroDetail({ title, photos = [], author, onBack, onMore, placeholder = 'image', children }) {
  const heroRef = useRef(null);
  const [solid, setSolid] = useState(false);
  const [idx, setIdx] = useState(0); // 큰 사진에 보이는 사진 (썸네일·옆으로 밀기로 바꿈)
  const swipe = useRef(null);
  useEffect(() => {
    const box = document.getElementById('app');
    if (!box) return undefined;
    const onScroll = () => {
      const y = box.scrollTop;
      if (heroRef.current) heroRef.current.style.transform = `translateY(${Math.min(y, 400) * 0.7}px)`; // 스크롤의 30%만 올라감
      setSolid(y > 300);
    };
    onScroll();
    box.addEventListener('scroll', onScroll, { passive: true });
    return () => box.removeEventListener('scroll', onScroll);
  }, []);
  const view = (i) => openOverlay(html`<${PhotoViewer} photos=${photos} index=${i} />`);
  const go = (d) => setIdx((i) => (i + d + photos.length) % photos.length);
  // 큰 사진: 옆으로 밀면 다음·이전 사진, 그냥 누르면 크게 보기
  const down = (e) => { swipe.current = { x: e.clientX, y: e.clientY, moved: false }; };
  const move = (e) => {
    const s0 = swipe.current;
    if (s0 && Math.abs(e.clientX - s0.x) > 12 && Math.abs(e.clientX - s0.x) > Math.abs(e.clientY - s0.y)) s0.moved = true;
  };
  const up = (e) => {
    const s0 = swipe.current;
    swipe.current = null;
    if (!s0) return;
    const dx = e.clientX - s0.x;
    if (s0.moved && Math.abs(dx) > 40 && photos.length > 1) go(dx < 0 ? 1 : -1);
    else if (!s0.moved) view(idx);
  };

  return html`<main class="screen screen--sub place-detail">
    <div class=${'place-detail__bar' + (solid ? ' place-detail__bar--solid' : '')}>
      <button class="glass-btn glass-btn--left" aria-label="뒤로" onClick=${onBack}><span><${Icon} name="glass-back" size=${24} stroke=${2} /></span></button>
      ${solid && html`<strong class="place-detail__bartitle">${title}</strong>`}
      ${onMore && html`<button class="glass-btn glass-btn--right" aria-label="더 보기" onClick=${onMore}><span><${Icon} name="glass-more" size=${24} stroke=${2} /></span></button>`}
    </div>
    <div class="place-detail__hero" ref=${heroRef}>
      ${photos[0]
        ? html`<button class="place-detail__heroimg" aria-label=${`사진 ${idx + 1}/${photos.length} 크게 보기`}
            onPointerDown=${down} onPointerMove=${move} onPointerUp=${up} onPointerCancel=${() => { swipe.current = null; }}
            onKeyDown=${(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); view(idx); } else if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); }}>
            <img key=${photos[idx]} class="place-detail__heroimg-img" src=${sized(photos[idx], 1000)} alt="" draggable="false" /></button>`
        : html`<span class="place-detail__ph"><${Icon} name=${placeholder} size=${32} /></span>`}
    </div>
    <div class="place-detail__sheet">
      <div class="place-detail__float">
        ${author ? html`<span class="place-detail__author" title=${author.name + '님이 등록'}><${Avatar} member=${author} size=${56} /></span>` : html`<span></span>`}
        ${photos.length > 0 && html`<div class="place-detail__thumbs">
          ${photos.slice(0, 3).map((src, i) => html`<button aria-label=${'사진 ' + (i + 1) + ' 보기'} aria-pressed=${i === idx ? 'true' : 'false'} onClick=${() => setIdx(i)}><img src=${sized(src, 200)} alt="" loading="lazy" /></button>`)}
        </div>`}
      </div>
      ${children}
    </div>
  </main>`;
}

/** 초록 아이콘 정보 줄 (피그마 '장소 설명'). rows: [{ icon, content }] — content가 비면 줄을 숨겨요 */
export function InfoRows({ rows }) {
  const list = rows.filter((r) => r && r.content);
  if (!list.length) return null;
  return html`<ul class="pd-info">
    ${list.map((r) => html`<li><${Icon} name=${r.icon} size=${16} bold /><span>${r.content}</span></li>`)}
  </ul>`;
}
