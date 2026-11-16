// 11 친구들 (2단계: 멤버 목록만)
import { html } from '../vendor/preact-htm.js';
import { Avatar, Todo, TopTitle } from '../ui/components.js';

export function Friends({ data, me }) {
  const members = data.members.filter((m) => !m.deleted);
  return html`<main class="screen">
    <${TopTitle} title="친구들" />
    <ul class="page">
      ${members.map(
        (m) => html`<li class="member-row">
          <${Avatar} member=${m} size=${56} />
          <span class="row__body">
            <span class="row__title" style="display:block">
              ${m.name}${m.id === me ? html` <span class="muted">(나)</span>` : ''}
            </span>
            <span class="row__sub" style="display:block">${m.relation}</span>
          </span>
        </li>`
      )}
    </ul>
    <div class="page"><${Todo}>프로필 카드·소개·멤버 추가(11~11-3)는 3단계에서 만들어요.<//></div>
  </main>`;
}
