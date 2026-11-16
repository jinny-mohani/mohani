// 공통 컴포넌트 — 피그마 'Components' 프레임과 같은 이름으로 맞췄어요.
import { html } from '../vendor/preact-htm.js';
import { ICONS, FILLED } from './icons.js';
import { TABS, back, replace } from '../router.js';
import { closeOverlay } from '../overlay.js';
import { syncText } from '../date.js';
import { profileSrc } from '../members.js';

/** lucide 아이콘. filled는 하단 탭 선택 상태(면) */
export function Icon({ name, size = 24, filled = false, stroke = 1.5, label }) {
  const inner = (filled && FILLED[name]) || ICONS[name] || '';
  return html`<svg
    class="icon"
    width=${size}
    height=${size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width=${stroke}
    stroke-linecap="round"
    stroke-linejoin="round"
    role=${label ? 'img' : null}
    aria-label=${label || null}
    aria-hidden=${label ? null : 'true'}
    dangerouslySetInnerHTML=${{ __html: inner }}
  ></svg>`;
}

/** 하단 탭바 (TabBar) — 탭끼리는 뒤로 가기 기록을 쌓지 않아요 */
export function TabBar({ active }) {
  return html`<nav class="tabbar" aria-label="메뉴">
    ${TABS.map((t) => {
      const on = t.id === active;
      return html`<a
        href=${'#/' + t.id}
        aria-current=${on ? 'page' : null}
        onClick=${(e) => {
          e.preventDefault();
          if (!on) replace('/' + t.id);
          else window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      >
        <${Icon} name=${t.icon} filled=${on} />
        <span>${t.label}</span>
      </a>`;
    })}
  </nav>`;
}

/** 탭 화면 제목 + 오른쪽 버튼 */
export function TopTitle({ title, children }) {
  return html`<header class="top-title">
    <h1>${title}</h1>
    <div>${children}</div>
  </header>`;
}

/** 서브 페이지 헤더: ‹ 뒤로 + 제목 + 오른쪽 버튼 */
export function SubHeader({ title, fallback, children }) {
  return html`<header class="sub-header">
    <button class="icon-btn" aria-label="뒤로" onClick=${() => back(fallback)}>
      <${Icon} name="chevron-left" />
    </button>
    <h1>${title}</h1>
    ${children}
  </header>`;
}

export function Button({ variant = 'primary', children, ...rest }) {
  return html`<button class=${'btn btn--' + variant} ...${rest}>${children}</button>`;
}

/** 칩 (Chip). 선택 = 검정 바탕 + 흰 글씨 */
export function Chip({ selected, children, ...rest }) {
  return html`<button class="chip" aria-pressed=${selected ? 'true' : 'false'} ...${rest}>${children}</button>`;
}

export function ChipGroup({ options, value, onChange, label }) {
  return html`<div class="chips" role="group" aria-label=${label}>
    ${options.map(
      (o) => html`<${Chip} selected=${o.value === value} onClick=${() => onChange(o.value)}>${o.label}<//>`
    )}
  </div>`;
}

/** 입력칸 제목 + 입력칸 + 설명 (TextField) */
export function TextField({ title, help, ...input }) {
  return html`<label class="field">
    <span class="field__label">${title}</span>
    <input class="input" ...${input} />
    ${help && html`<span class="field__help">${help}</span>`}
  </label>`;
}

/** 전체 화면 팝업 (작성·수정): ✕ 오른쪽 위, 저장 버튼 아래 고정 */
export function Modal({ title, children, footer }) {
  return html`<div class="modal" role="dialog" aria-modal="true" aria-label=${title}>
    <header class="modal__head">
      <h1>${title}</h1>
      <button class="icon-btn" aria-label="닫기" onClick=${() => closeOverlay()}>
        <${Icon} name="x" />
      </button>
    </header>
    <div class="modal__body">${children}</div>
    ${footer && html`<div class="modal__foot">${footer}</div>`}
  </div>`;
}

/** 바텀시트 (짧은 입력·선택): ✕ 또는 바깥 누르기 / 아래로 내리기로 닫기 */
export function Sheet({ title, children }) {
  let startY = null;
  const onTouchStart = (e) => {
    startY = e.currentTarget.scrollTop <= 0 ? e.touches[0].clientY : null;
  };
  const onTouchEnd = (e) => {
    if (startY != null && e.changedTouches[0].clientY - startY > 80) closeOverlay();
    startY = null;
  };
  return html`<div>
    <div class="dim" onClick=${() => closeOverlay()}></div>
    <section
      class="sheet"
      role="dialog"
      aria-modal="true"
      aria-label=${title}
      onTouchStart=${onTouchStart}
      onTouchEnd=${onTouchEnd}
    >
      <span class="sheet__handle" aria-hidden="true"></span>
      <div class="sheet__head">
        <h2>${title}</h2>
        <button class="icon-btn" aria-label="닫기" onClick=${() => closeOverlay()}>
          <${Icon} name="x" />
        </button>
      </div>
      ${children}
    </section>
  </div>`;
}

/** 목록 한 줄: 아이콘 + 제목/설명 + › */
export function Row({ icon, title, sub, onClick, chevron = true }) {
  return html`<button class="row" onClick=${onClick}>
    ${icon && html`<span class="row__icon"><${Icon} name=${icon} /></span>`}
    <span class="row__body">
      <span class="row__title" style="display:block">${title}</span>
      ${sub && html`<span class="row__sub" style="display:block">${sub}</span>`}
    </span>
    ${chevron && html`<${Icon} name="chevron-right" size=${20} />`}
  </button>`;
}

/** 빈 화면 (S-4) */
export function Empty({ icon, title, text, action }) {
  return html`<div class="empty">
    <span class="empty__icon"><${Icon} name=${icon} size=${28} /></span>
    <h2>${title}</h2>
    ${text && html`<p>${text}</p>`}
    ${action && html`<div style="width:100%;max-width:240px;margin-top:8px">${action}</div>`}
  </div>`;
}

/** 오프라인 띠 (S-3) */
export function OfflineBanner({ lastSync }) {
  return html`<div class="banner" role="status">
    <${Icon} name="wifi-off" size=${18} />
    <span>보기만 가능 · 마지막 동기화 ${syncText(lastSync)}</span>
  </div>`;
}

/** 2단계 자리 표시 — 3단계에서 피그마 화면으로 채워요 */
export function Todo({ children }) {
  return html`<p class="todo">${children}</p>`;
}

/** 프로필 사진·캐릭터. 그림이 없거나 못 불러오면 이름 첫 글자로 */
export function Avatar({ member, size = 40, className = '' }) {
  const src = profileSrc(member && member.profile);
  const name = (member && member.name) || '?';
  const isCharacter = src && !/^https?:/.test(src); // 캐릭터는 동그라미 없이 전신 그대로
  return html`<span
    class=${'avatar ' + (isCharacter ? 'avatar--char ' : '') + className}
    style=${`width:${size}px;height:${size}px;font-size:${Math.round(size * 0.4)}px`}
    aria-hidden="true"
  >
    <span class="avatar__initial">${name.slice(0, 1)}</span>
    ${src &&
    html`<img
      src=${src}
      alt=""
      loading="lazy"
      onError=${(e) => (e.currentTarget.style.display = 'none')}
    />`}
  </span>`;
}

/** 겹친 작은 프로필 + 이름들 (02 여행 카드 '함께 가는 친구') */
export function MemberStack({ members }) {
  return html`<div class="member-stack">
    <span class="member-stack__faces">
      ${members.slice(0, 5).map((m) => html`<${Avatar} member=${m} size=${22} key=${m.id} />`)}
    </span>
    <span class="member-stack__names">${members.map((m) => m.name).join(' · ')}</span>
  </div>`;
}

/** 디데이 라벨 (Label_Dday): 다가오는 여행은 테두리, 지난 여행은 회색 */
export function LabelDday({ text, past }) {
  return html`<span class=${'label-dday' + (past ? ' label-dday--past' : '')}>${text}</span>`;
}

/** 체크박스 (Checkbox) 한 줄 — 줄 전체를 눌러도 체크돼요 (피그마 컴포넌트 설명) */
export function CheckRow({ checked, label, meta, onToggle }) {
  return html`<button class="check-row" role="checkbox" aria-checked=${checked ? 'true' : 'false'} onClick=${onToggle}>
    <span class="checkbox" aria-hidden="true">${checked && html`<${Icon} name="check" size=${16} stroke=${2.5} />`}</span>
    <span class="check-row__label">${label}</span>
    ${meta && html`<span class="check-row__meta">${meta}</span>`}
  </button>`;
}

/** 가운데 팝업 (03-8 친구 프로필) — 바깥을 누르거나 ✕로 닫기 */
export function Dialog({ label, children }) {
  return html`<div>
    <div class="dim" onClick=${() => closeOverlay()}></div>
    <section class="dialog" role="dialog" aria-modal="true" aria-label=${label}>
      <button class="icon-btn dialog__close" aria-label="닫기" onClick=${() => closeOverlay()}><${Icon} name="x" /></button>
      ${children}
    </section>
  </div>`;
}

/** 제목 + 칩 고르기 (구분·상태·담당 등) */
export function ChipField({ title, options, value, onChange, help }) {
  return html`<div class="field">
    <span class="field__label">${title}</span>
    <div class="chips chips--wrap" role="radiogroup" aria-label=${title}>
      ${options.map((o) => {
        const opt = typeof o === 'string' ? { value: o, label: o } : o;
        return html`<${Chip}
          key=${opt.value}
          role="radio"
          aria-checked=${opt.value === value ? 'true' : 'false'}
          selected=${opt.value === value}
          onClick=${() => onChange(opt.value === value && opt.toggle ? '' : opt.value)}
        >${opt.label}<//>`;
      })}
    </div>
    ${help && html`<span class="field__help">${help}</span>`}
  </div>`;
}

/** 메모 칸 (Textarea) — 줄바꿈 포함 최대 5줄 (기획안) */
export function TextArea({ title, help, value, onInput, placeholder, maxLines = 5 }) {
  const limit = (e) => {
    const v = e.currentTarget.value.split('\n').slice(0, maxLines).join('\n');
    if (v !== e.currentTarget.value) e.currentTarget.value = v;
    onInput(v);
  };
  return html`<label class="field">
    <span class="field__label">${title}</span>
    <textarea class="input textarea" rows=${maxLines} placeholder=${placeholder} value=${value} onInput=${limit}></textarea>
    <span class="field__help">${help || `최대 ${maxLines}줄 · 줄바꿈 가능`}</span>
  </label>`;
}

/** 접었다 펴는 '추가 정보' 묶음 */
export function Collapsible({ title, sub, open, onToggle, children }) {
  return html`<section class=${'collapse' + (open ? ' collapse--open' : '')}>
    <button class="collapse__head" aria-expanded=${open ? 'true' : 'false'} onClick=${onToggle} type="button">
      <span class="collapse__title">
        <strong>${title}</strong>
        <small>${open ? '선택 · 태그로 표시돼요' : sub}</small>
      </span>
      <span class="collapse__toggle">${open ? '접기' : '펼치기'}<${Icon} name=${open ? 'chevron-up' : 'chevron-down'} size=${16} /></span>
    </button>
    ${open && html`<div class="collapse__body">${children}</div>`}
  </section>`;
}

/** 상태 라벨 (StatusLabel): 예약 전 · 예약 완료 · 보류 — 색 없이 아이콘·테두리로 구분 */
export function StatusLabel({ status, onClick }) {
  const s = status || '예약 전';
  const icon = { '예약 전': 'clock', '예약 완료': 'check', 보류: 'pause' }[s] || 'clock';
  const cls = 'status' + (s === '예약 완료' ? ' status--done' : '');
  const inner = html`<${Icon} name=${icon} size=${12} stroke=${2} /><span>${s}</span>`;
  return onClick
    ? html`<button class=${cls} onClick=${(e) => { e.stopPropagation(); onClick(); }} aria-label=${'상태 ' + s + ', 바꾸기'}>${inner}</button>`
    : html`<span class=${cls}>${inner}</span>`;
}

/** 사진 고르기 (여러 장) — 고른 사진은 줄여서 보관했다가 저장할 때 올려요 */
export function PhotoField({ title = '사진', photos, onChange, max = 3 }) {
  const add = async (e) => {
    const files = Array.from(e.currentTarget.files || []).slice(0, max - photos.length);
    e.currentTarget.value = '';
    const { resizeImage } = await import('../image.js');
    const added = [];
    for (const f of files) {
      try { added.push(await resizeImage(f)); } catch (err) { /* 못 읽은 사진은 건너뜀 */ }
    }
    onChange([...photos, ...added]);
  };
  return html`<div class="field">
    <span class="field__label">${title}</span>
    <div class="photo-row">
      ${photos.map((p, i) => html`<span class="photo-thumb" key=${i}>
        <img src=${typeof p === 'string' ? p : p.dataUrl} alt="" />
        <button type="button" class="photo-thumb__x" aria-label="사진 빼기" onClick=${() => onChange(photos.filter((_, j) => j !== i))}>
          <${Icon} name="x" size=${14} stroke=${2} />
        </button>
      </span>`)}
      ${photos.length < max && html`<label class="photo-pick">
        <${Icon} name="image-plus" /><span>사진 추가</span>
        <input type="file" accept="image/*" multiple onChange=${add} aria-label="사진 추가" />
      </label>`}
    </div>
  </div>`;
}
