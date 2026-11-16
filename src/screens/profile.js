// 01 초대 진입 – 프로필 선택 · 01-1 선택됨
import { html, useState } from '../vendor/preact-htm.js';
import { Avatar, Button, Icon } from '../ui/components.js';
import { openOverlay } from '../overlay.js';
import { setMe, saveRow } from '../store.js';
import { activeMembers, randomCharacter } from '../members.js';
import { formatDay } from '../date.js';
import { MemberAddSheet } from './member-add.js';

function shortDate(s) {
  return formatDay(s).replace(/ \(.\)$/, ''); // 12.19
}

export function ProfileSelect({ data }) {
  const [picked, setPicked] = useState(null);
  const members = activeMembers(data);
  const owner = members.find((m) => m.isOwner);
  const { trip } = data;

  const addMe = () =>
    openOverlay(html`<${MemberAddSheet}
      title="목록에 나를 추가"
      button="추가하고 입장하기"
      profile=${randomCharacter(members.map((m) => m.profile))}
      onAdd=${async (m) => {
        const row = await saveRow('members', m, { by: m.name });
        setMe(row.id);
      }}
    />`);

  return html`<main class="full">
    <h1 class="page-title">${trip.title}에<br />초대받았어요</h1>
    <p class="page-sub">
      ${owner ? owner.name + '님이 초대했어요 · ' : ''}${shortDate(trip.startDate)} – ${shortDate(trip.endDate)}
    </p>

    <h2 style="font-size:18px;font-weight:500;margin-top:40px">나는 누구인가요?</h2>
    <p class="muted" style="font-size:15px;margin:4px 0 20px">
      ${picked ? '다시 누르면 선택이 취소돼요' : '내 프로필을 선택해 주세요'}
    </p>

    <div class="member-grid" role="radiogroup" aria-label="내 프로필">
      ${members.map(
        (m) => html`<button
          class="member-card"
          role="radio"
          aria-checked=${picked === m.id ? 'true' : 'false'}
          key=${m.id}
          onClick=${() => setPicked(picked === m.id ? null : m.id)}
        >
          <span class="member-card__check" aria-hidden="true">
            ${picked === m.id && html`<${Icon} name="check" size=${14} stroke=${2.5} />`}
          </span>
          <${Avatar} member=${m} size=${80} />
          <span class="member-card__name">${m.name}</span>
          <span class="member-card__rel">${m.relation || ' '}</span>
        </button>`
      )}
    </div>

    <button class="link-center" style="margin-top:20px" onClick=${addMe}>목록에 내가 없어요</button>
    <div class="full__spacer"></div>
    <${Button} disabled=${!picked} onClick=${() => setMe(picked)}>입장하기<//>
  </main>`;
}
