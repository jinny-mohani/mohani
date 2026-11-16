// 03 홈 · 03-8 친구 프로필(팝업)
import { html } from '../vendor/preact-htm.js';
import { CheckRow, Dialog, Icon } from '../ui/components.js';
import { go } from '../router.js';
import { openOverlay } from '../overlay.js';
import { toggleDone } from '../store.js';
import { ddayText, formatDay, nightsLabel } from '../date.js';
import { activeMembers, memberName, profileSrc } from '../members.js';
import { GROUPS, byGroup, homePick, isDone } from '../checklist.js';
import { toast } from '../ui/toast.js';
import { TripSettings } from './trip-settings.js';
import { ChecklistSheet } from './checklist.js';

const RES_TYPES = [
  { type: '항공권', icon: 'plane' },
  { type: '숙소', icon: 'bed-double' },
  { type: '기타', icon: 'car' },
];

/** 멤버 캐릭터(전신) — 그림이 없으면 이름 첫 글자 동그라미 */
function Character({ member, height = 84 }) {
  const src = profileSrc(member.profile);
  return html`<span class="character" style=${`height:${height}px`}>
    <span class="character__fallback">${(member.name || '?').slice(0, 1)}</span>
    ${src && html`<img src=${src} alt="" onError=${(e) => (e.currentTarget.style.display = 'none')} />`}
  </span>`;
}

/** 03-8 친구 프로필 (팝업) */
function FriendProfile({ member }) {
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
  const reservations = data.reservations.filter((r) => !r.deleted);
  const all = data.checklist.filter((c) => !c.deleted);
  const left = all.filter((c) => !isDone(c, me)).length;

  const toggle = (item) =>
    toggleDone(item, !isDone(item, me)).catch(() =>
      toast('연결이 불안정해 저장하지 못했어요', { action: '다시 시도', duration: 6000, onAction: () => toggle(item) }));
  const assignee = (c) => (c.assignee === '각자' ? '각자' : memberName(data, c.assignee));

  return html`<main class="screen home">
    <section class="home-hero" aria-label="여행 정보">
      <div class="home-hero__card">
        ${trip.coverImage
          ? html`<img class="home-hero__img" src=${trip.coverImage} alt="" />`
          : html`<span class="home-hero__fallback" aria-hidden="true">${trip.destination || trip.title}</span>`}
        <span class="home-hero__shade" aria-hidden="true"></span>
        <button class="home-hero__settings" aria-label="여행 설정" onClick=${() => openOverlay(html`<${TripSettings} />`)}>
          <${Icon} name="settings" size=${22} />
        </button>
        <div class="home-hero__text">
          <p class="home-hero__dday">${ddayText(trip)}</p>
          <button class="home-hero__title" onClick=${() => go('/trips')} aria-label=${trip.title + ', 다른 여행 보기'}>
            <span>${trip.title}</span><${Icon} name="chevron-down" size=${20} stroke=${2} />
          </button>
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
      <section class="home-section">
        <button class="home-section__head" onClick=${() => go('/reservations')}>
          <h2>예약정보</h2>
          <span>전체 보기</span><${Icon} name="chevron-right" size=${16} />
        </button>
        <div class="res-cards">
          ${RES_TYPES.map(({ type, icon }) => {
            const list = reservations.filter((r) => r.type === type);
            const done = list.filter((r) => r.status === '예약 완료').length;
            return html`<button class="res-card" onClick=${() => go('/reservations?type=' + type)}>
              <${Icon} name=${icon} size=${22} />
              <span class="res-card__name">${type}</span>
              <span class="res-card__count">${done} / ${list.length}</span>
            </button>`;
          })}
        </div>
      </section>

      <section class="home-section">
        <button class="home-section__head" onClick=${() => go('/home/checklist')}>
          <h2>체크 리스트</h2>
          <span>${left}개 남음 · 전체 보기</span><${Icon} name="chevron-right" size=${16} />
        </button>
        <div class="check-cards">
          ${GROUPS.map((group, gi) => {
            const items = byGroup(all, group);
            const done = items.filter((c) => isDone(c, me)).length;
            const open = () => go('/home/checklist?group=' + gi);
            return html`<div class="check-card">
              <button class="check-card__head" onClick=${open}>
                <h3>${group}</h3>
                <span>${done} / ${items.length}</span>
              </button>
              ${!items.length && html`<button class="check-card__empty" onClick=${() => openOverlay(html`<${ChecklistSheet} group=${group} />`)}>+ 할 일을 추가해 보세요</button>`}
              ${gi === 0
                ? homePick(items, me, 3).map(
                    (c) => html`<${CheckRow} key=${c.id} checked=${isDone(c, me)} label=${c.title} meta=${assignee(c)} onToggle=${() => toggle(c)} />`
                  )
                : items.length > 0 &&
                  html`<div class="tags">
                    ${homePick(items, me, 5).map((c) => {
                      const d = isDone(c, me);
                      return html`<button key=${c.id} class=${'tag' + (d ? ' tag--done' : '')} aria-pressed=${d ? 'true' : 'false'} onClick=${() => toggle(c)}>
                        <${Icon} name=${d ? 'check' : 'circle'} size=${14} stroke=${d ? 2.5 : 1.5} />${c.title}
                      </button>`;
                    })}
                  </div>`}
            </div>`;
          })}
        </div>
      </section>
    </div>
  </main>`;
}
