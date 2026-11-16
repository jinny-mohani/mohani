// 03 홈 (2단계: 구조만 — 3단계에서 피그마 디자인으로 다듬어요)
import { html } from '../vendor/preact-htm.js';
import { Icon, Todo } from '../ui/components.js';
import { go } from '../router.js';
import { ddayText, formatDay, nightsLabel } from '../date.js';

const RES_TYPES = [
  { type: '항공권', icon: 'plane' },
  { type: '숙소', icon: 'bed-double' },
  { type: '기타', icon: 'car' },
];

export function Home({ data }) {
  const { trip } = data;
  const members = data.members.filter((m) => !m.deleted);
  const reservations = data.reservations.filter((r) => !r.deleted);
  const todos = data.checklist.filter((c) => !c.deleted);

  return html`<main class="screen">
    <section class="hero" aria-label="여행 정보">
      ${trip.coverImage
        ? html`<img class="hero__img" src=${trip.coverImage} alt="" />`
        : html`<span class="hero__fallback" aria-hidden="true">${trip.destination}</span>`}
      <div class="hero__text">
        <p class="hero__dday">${ddayText(trip)}</p>
        <button class="hero__title" onClick=${() => go('/trips')} aria-label=${trip.title + ', 다른 여행 보기'}>
          <span>${trip.title}</span><${Icon} name="chevron-down" size=${20} stroke=${2} />
        </button>
        <p class="hero__date">${formatDay(trip.startDate)} 출발 · ${nightsLabel(trip)}</p>
      </div>
      <button class="icon-btn hero__settings" aria-label="여행 설정" onClick=${() => go('/home/settings')}>
        <${Icon} name="settings" />
      </button>
    </section>
    <ul class="hero__members" aria-label="멤버">
      ${members.map((m) => html`<li>${m.name}</li>`)}
    </ul>

    <div class="page">
      <section class="section">
        <div class="section__head">
          <h2>예약정보</h2>
          <button class="section__more" onClick=${() => go('/reservations')}>
            전체 보기 <${Icon} name="chevron-right" size=${16} />
          </button>
        </div>
        <div class="res-cards">
          ${RES_TYPES.map(({ type, icon }) => {
            const list = reservations.filter((r) => r.type === type);
            const done = list.filter((r) => r.status === '예약 완료').length;
            return html`<button class="card res-card" onClick=${() => go('/reservations?type=' + type)}>
              <${Icon} name=${icon} />
              <span class="res-card__name">${type}</span>
              <span class="muted">${done} / ${list.length}</span>
            </button>`;
          })}
        </div>
      </section>

      <section class="section">
        <div class="section__head">
          <h2>체크 리스트</h2>
          <span class="muted">${todos.length}개</span>
        </div>
        <${Todo}>체크 리스트 카드(여행 전 할 일 · 짐 꾸리기 · 공항에서 할 일)는 3단계에서 만들어요.<//>
      </section>
    </div>
  </main>`;
}
