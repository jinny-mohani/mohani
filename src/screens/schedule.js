// 08 일정 – Day별 코스 (2단계: Day 탭과 목록만)
import { html } from '../vendor/preact-htm.js';
import { ChipGroup, Empty, Icon, Row, Todo, TopTitle } from '../ui/components.js';
import { replace, go } from '../router.js';
import { tripDays, dayDate, formatDay } from '../date.js';

export function Schedule({ data, query }) {
  const days = tripDays(data.trip);
  const day = Math.min(Math.max(Number(query.day) || 1, 1), days);
  const places = data.places;
  const items = data.schedule
    .filter((s) => !s.deleted && Number(s.day) === day)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const placeName = (s) => {
    const p = s.placeId && places.find((x) => x.id === s.placeId);
    return (p && p.name) || s.placeName || '장소 미정';
  };

  return html`<main class="screen">
    <${TopTitle} title="일정">
      <button class="icon-btn" aria-label="일정 추가"><${Icon} name="plus" /></button>
    <//>
    <div class="page">
      <${ChipGroup}
        label="Day"
        value=${day}
        options=${Array.from({ length: days }, (_, i) => ({ value: i + 1, label: 'Day ' + (i + 1) }))}
        onChange=${(v) => replace('/schedule?day=' + v)}
      />
      <p class="muted" style="margin-top:12px">${formatDay(dayDate(data.trip, day))}</p>
      ${items.length
        ? html`<ol>
            ${items.map(
              (s, i) => html`<li>
                <${Row}
                  title=${placeName(s)}
                  sub=${[s.time || String(i + 1), s.transport].filter(Boolean).join(' · ')}
                  onClick=${() => s.placeId && go('/places/' + s.placeId)}
                  chevron=${!!s.placeId}
                />
              </li>`
            )}
          </ol>`
        : html`<${Empty} icon="calendar-days" title="아직 일정이 없어요" text="가고 싶은 곳을 순서대로 넣어 봐요." />`}
      <${Todo}>Day별 코스(08~08-4)와 예약 자동 표시는 3단계에서 만들어요.<//>
    </div>
  </main>`;
}
