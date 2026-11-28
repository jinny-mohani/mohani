// 03 홈 · 03-8 친구 프로필(팝업)
import { html } from '../vendor/preact-htm.js';
import { Dialog, Icon } from '../ui/components.js';
import { go } from '../router.js';
import { openOverlay } from '../overlay.js';
import { ddayText, formatDay, nightsLabel } from '../date.js';
import { activeMembers, profileSrc } from '../members.js';
import { TripSettings } from './trip-settings.js';
import { sized } from '../reservation-util.js';
import { PlaceCard, PlaceForm, CATEGORIES } from './places.js';
import { HomeReservations } from './home-res.js';
import { HomeChecklist } from './home-check.js';


/** 멤버 캐릭터(전신) — 그림이 없으면 이름 첫 글자 동그라미 */
function Character({ member, height = 84 }) {
  const src = profileSrc(member.profile);
  return html`<span class="character" style=${`height:${height}px`}>
    <span class="character__fallback">${(member.name || '?').slice(0, 1)}</span>
    ${src && html`<img src=${src} alt="" onError=${(e) => (e.currentTarget.style.display = 'none')} />`}
  </span>`;
}

/** 03-8 친구 프로필 (팝업) */
export function FriendProfile({ member }) {
  return html`<${Dialog} label=${member.name + ' 프로필'}>
    <div class="friend-pop">
      <${Character} member=${member} height=${150} />
      <h2>${member.name}</h2>
      ${member.relation && html`<span class="friend-pop__rel">${member.relation}</span>`}
      ${member.intro && html`<p>${member.intro}</p>`}
    </div>
  <//>`;
}

export function Home({ data, me }) {
  const { trip } = data;
  const members = activeMembers(data);
  const places = data.places.filter((p) => !p.deleted).sort((x, y) => (Number(x.order) || 0) - (Number(y.order) || 0));

  return html`<main class="screen screen--tint home">
    <section class="home-hero" aria-label="여행 정보">
      <div class="home-hero__card">
        ${trip.coverImage
          ? html`<img class="home-hero__img" src=${sized(trip.coverImage, 1000)} alt="" />`
          : html`<span class="home-hero__fallback" aria-hidden="true">${trip.destination || trip.title}</span>`}
        <span class="home-hero__shade" aria-hidden="true"></span>
        <button class="home-hero__settings" aria-label="여행 설정" onClick=${() => openOverlay(html`<${TripSettings} />`)}>
          <${Icon} name="settings" size=${22} />
        </button>
        <div class="home-hero__text">
          <p class="home-hero__dday">${ddayText(trip)}</p>
          <h1 class="home-hero__h1">
            <button class="home-hero__title" onClick=${() => go('/trips')} aria-label=${trip.title + ', 다른 여행 보기'}>
              <span>${trip.title}</span><${Icon} name="chevron-down" size=${20} stroke=${2} />
            </button>
          </h1>
          <p class="home-hero__date">${formatDay(trip.startDate)} 출발 · ${nightsLabel(trip)}</p>
        </div>
      </div>
      <div class="home-members">
      <ul class="home-members__row" aria-label="멤버">
        ${members.map(
          (m) => html`<li key=${m.id}>
            <button onClick=${() => openOverlay(html`<${FriendProfile} member=${m} />`)} aria-label=${m.name + ' 프로필 보기'}>
              <${Character} member=${m} />
              <span class="home-members__name">${m.name}</span>
            </button>
          </li>`
        )}
      </ul>
      </div>
    </section>

    <div class="page">
      <${HomeReservations} data=${data} />

      <${HomeChecklist} data=${data} me=${me} />

      ${places.length
        ? placeGroups(places).map(({ c, list }) => html`<section class="home-section" key=${c}>
            <button class="home-section__head" onClick=${() => go('/places?category=' + encodeURIComponent(c))}>
              <h2>${c}</h2><${Icon} name="select-right" size=${18} stroke=${1.4} label=${c + ' 전체 보기'} />
            </button>
            <div class="place-row">${list.slice(0, 5).map((p) => html`<${PlaceCard} key=${p.id} p=${p} />`)}</div>
          </section>`)
        : html`<section class="home-section">
            <button class="home-section__head" onClick=${() => go('/places')}>
              <h2>장소</h2><${Icon} name="select-right" size=${18} stroke=${1.4} label="전체 보기" />
            </button>
            <button class="check-card check-card__empty" style="width:100%" onClick=${() => openOverlay(html`<${PlaceForm} />`)}>+ 가고 싶은 장소를 등록해 보세요</button>
          </section>`}
    </div>
  </main>`;
}

/** 등록된 장소를 카테고리별로 (기본 카테고리 순서, 그 밖의 카테고리는 뒤에). 장소가 있는 카테고리만 */
function placeGroups(places) {
  const extra = [...new Set(places.map((p) => p.category || '기타'))].filter((c) => !CATEGORIES.includes(c));
  return [...CATEGORIES, ...extra]
    .map((c) => ({ c, list: places.filter((p) => (p.category || '기타') === c) }))
    .filter((g) => g.list.length);
}
