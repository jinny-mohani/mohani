// 09 장소 목록 · 10 장소 상세 (2단계: 카테고리 칩과 목록만)
import { html } from '../vendor/preact-htm.js';
import { ChipGroup, Empty, Icon, Row, SubHeader, Todo, TopTitle } from '../ui/components.js';
import { go, replace } from '../router.js';

const CATEGORIES = ['전체', '음식점', '즐길거리', '쇼핑', '디저트'];

export function Places({ data, query }) {
  const cat = CATEGORIES.includes(query.category) ? query.category : '전체';
  const all = data.places.filter((p) => !p.deleted);
  const list = cat === '전체' ? all : all.filter((p) => p.category === cat);

  return html`<main class="screen">
    <${TopTitle} title="장소">
      <button class="icon-btn" aria-label="장소 등록"><${Icon} name="plus" /></button>
    <//>
    <div class="page">
      <${ChipGroup}
        label="카테고리"
        value=${cat}
        options=${CATEGORIES.map((v) => ({ value: v, label: v }))}
        onChange=${(v) => replace(v === '전체' ? '/places' : '/places?category=' + v)}
      />
      ${list.length
        ? html`<ul style="margin-top:12px">
            ${list.map(
              (p) => html`<li>
                <${Row}
                  icon="map-pin"
                  title=${p.name || '이름 없음'}
                  sub=${[p.category, p.hours].filter(Boolean).join(' · ')}
                  onClick=${() => go('/places/' + p.id)}
                />
              </li>`
            )}
          </ul>`
        : html`<${Empty} icon="map-pin" title="아직 장소가 없어요" text="가고 싶은 곳을 모아 두면 일정에 바로 넣을 수 있어요." />`}
      <${Todo}>사진 카드 가로 스와이프(09·09-2)는 3단계에서 만들어요.<//>
    </div>
  </main>`;
}

export function PlaceDetail({ data, id }) {
  const p = data.places.find((x) => x.id === id);
  return html`<main class="screen screen--sub">
    <${SubHeader} title=${p ? p.name : '장소'} fallback="/places" />
    <div class="page">
      ${p
        ? html`<p>${p.address}</p>
            ${p.hours && html`<p class="muted">운영시간 ${p.hours}</p>`}
            ${p.memo && html`<p style="margin-top:16px">${p.memo}</p>`}`
        : html`<${Empty} icon="map-pin" title="지워졌거나 없는 장소예요" />`}
      <${Todo}>장소 상세(10)는 3단계에서 만들어요.<//>
    </div>
  </main>`;
}
