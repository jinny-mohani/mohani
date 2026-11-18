// 13 새 여행 만들기 (전체 화면 팝업) · 13-1 초대 링크 공유 · 02-1 초대 안내 시트
import { html, useState } from '../vendor/preact-htm.js';
import { Avatar, Button, Icon, Modal, Sheet, TextField , FormError } from '../ui/components.js';
import { openOverlay, closeOverlay, closeAllOverlays, replaceOverlay } from '../overlay.js';
import { createTrip, saveRow, uploadPhoto, enterFromUrl } from '../store.js';
import { replace } from '../router.js';
import { randomCharacter } from '../members.js';
import { resizeImage } from '../image.js';
import { inviteUrl, copyText, shareInvite } from '../share.js';
import { MemberAddSheet } from './member-add.js';
import { DateRangeField } from '../ui/pickers.js';
import { toast } from '../ui/toast.js';

export function NewTripModal() {
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cover, setCover] = useState(null); // { dataUrl, mimeType }
  const [myProfile] = useState(() => randomCharacter());
  const [myName, setMyName] = useState('');
  const [members, setMembers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const usedProfiles = () => [myProfile, ...members.map((m) => m.profile)];

  const addMember = () =>
    openOverlay(html`<${MemberAddSheet}
      profile=${randomCharacter(usedProfiles())}
      onAdd=${(m) => setMembers((list) => [...list, { ...m, key: Date.now() }])}
    />`);

  const pickCover = async (e) => {
    const file = e.currentTarget.files && e.currentTarget.files[0];
    if (!file) return;
    try {
      setCover(await resizeImage(file));
    } catch (err) {
      toast(err.message);
    }
  };

  const submit = async () => {
    const missing = [!title.trim() && '여행 이름', !startDate && '출발일', !endDate && '도착일', !myName.trim() && '내 이름'].filter(Boolean);
    if (missing.length) {
      setError(missing.join(', ') + '을(를) 입력해 주세요.');
      return;
    }
    if (endDate < startDate) {
      setError('도착일이 출발일보다 빨라요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await createTrip({
        trip: { title: title.trim(), destination: destination.trim(), startDate, endDate },
        me: { name: myName.trim(), profile: myProfile },
        members: members.map(({ name, relation, intro, profile }) => ({ name, relation, intro, profile })),
      });
      // 대표 이미지는 여행이 만들어진 뒤에 올려요 (사진 폴더가 여행별이라서)
      if (cover) {
        uploadPhoto(cover.dataUrl, cover.mimeType)
          .then((url) => saveRow('trips', { coverImage: url }, { baseUpdatedAt: res.trip.updatedAt, by: myName.trim() }))
          .catch(() => toast('대표 이미지는 올리지 못했어요. 여행 설정에서 다시 넣어 주세요.'));
      }
      replace('/home');
      replaceOverlay(html`<${TripCreated} trip=${res.trip} />`);
    } catch (err) {
      setError(err.message || '만들지 못했어요. 다시 시도해 주세요.');
      setBusy(false);
    }
  };

  return html`<${Modal}
    title="새 여행 만들기"
    footer=${html`<${Button} onClick=${submit} disabled=${busy}>${busy ? '만드는 중…' : '만들고 초대 링크 받기'}<//>`}
  >
    <div class="form">
      <p class="lead" style="margin-top:0">처음 설정만 하면, 그 뒤로는 모두 함께 수정해요</p>
      <${TextField} title="여행 이름" placeholder="예) 제주 우정여행" value=${title} maxLength="30"
        onInput=${(e) => setTitle(e.currentTarget.value)} />
      <${TextField} title="목적지" placeholder="예) 제주도" value=${destination} maxLength="30"
        onInput=${(e) => setDestination(e.currentTarget.value)} />
      <div class="field">
        <span class="field__label" id="date-label">날짜</span>
        <${DateRangeField} label="여행 날짜" placeholder="출발일 – 도착일" start=${startDate} end=${endDate}
          onChange=${(a, b) => { setStartDate(a); setEndDate(b); }} />
        <span class="field__help">날짜를 고르면 Day 탭이 자동으로 만들어져요</span>
      </div>
      <div class="field">
        <span class="field__label">대표 이미지</span>
        <label class="photo-pick">
          ${cover
            ? html`<img src=${cover.dataUrl} alt="고른 대표 이미지" />`
            : html`<${Icon} name="image" /><span>이미지 추가</span>`}
          <input type="file" accept="image/*" onChange=${pickCover} aria-label="대표 이미지 고르기" />
        </label>
        <span class="field__help">선택 · 여행 목록에 보여요</span>
      </div>
      <div class="field">
        <span class="field__label">내 프로필</span>
        <div class="me-row">
          <${Avatar} member=${{ name: myName || ' ', profile: myProfile }} size=${64} />
          <${TextField} title="내 이름" placeholder="예) 지니" value=${myName} maxLength="20"
            onInput=${(e) => setMyName(e.currentTarget.value)} />
        </div>
        <span class="field__help">친구들에게 이 이름과 캐릭터로 보여요. 개설자로 표시돼요</span>
      </div>
      <hr class="divider" />
      <div class="field">
        <div class="section-head-inline">
          <h2>멤버<small>${members.length + 1}명</small></h2>
          <button class="round-btn" aria-label="멤버 추가" onClick=${addMember}><${Icon} name="plus" /></button>
        </div>
        <span class="field__help">친구는 초대 링크로 들어와 자기 프로필을 골라요</span>
        <ul class="list-gap">
          <li class="member-item">
            <${Avatar} member=${{ name: myName || '나', profile: myProfile }} size=${40} />
            <span class="member-item__text">
              <span class="member-item__name">${myName || '나'} (나)</span>
              <span class="member-item__rel">개설자</span>
            </span>
          </li>
          ${members.map(
            (m) => html`<li class="member-item" key=${m.key}>
              <${Avatar} member=${m} size=${40} />
              <span class="member-item__text">
                <span class="member-item__name">${m.name}</span>
                <span class="member-item__rel">${m.relation}</span>
              </span>
              <button class="icon-btn" aria-label=${m.name + ' 빼기'}
                onClick=${() => setMembers((list) => list.filter((x) => x.key !== m.key))}>
                <${Icon} name="x" size=${20} />
              </button>
            </li>`
          )}
        </ul>
      </div>
      <${FormError} error=${error} />
    </div>
  <//>`;
}

/** 13-1 초대 링크 공유 (만든 직후) */
export function TripCreated({ trip }) {
  const [shared, setShared] = useState(false);
  const url = inviteUrl(trip.inviteCode);
  const share = async () => {
    await shareInvite(trip, trip.inviteCode);
    setShared(true);
  };
  const copy = () => {
    copyText(url);
    setShared(true);
  };
  const later = () => {
    // 팝업을 닫으면 만들기 전 주소로 돌아가므로, 새 여행 코드를 주소에 다시 붙여요
    if (shared) return closeAllOverlays(() => { enterFromUrl(); replace('/home'); });
    // 아직 안 보냈으면 여행 목록에서 한 번 더 안내 (02-1)
    closeAllOverlays(() => {
      enterFromUrl();
      replace('/trips');
      setTimeout(() => openOverlay(html`<${InviteSheet} trip=${trip} />`), 50);
    });
  };
  return html`<div class="modal" role="dialog" aria-modal="true" aria-label="여행을 만들었어요">
    <div class="full" style="min-height:100%">
      <div class="done-hero">
        <span class="done-hero__icon"><${Icon} name="check" size=${32} stroke=${2} /></span>
        <h1>${trip.title}을<br />만들었어요</h1>
        <p>친구들에게 링크를 보내면<br />바로 들어와서 함께 쓸 수 있어요</p>
      </div>
      <${ShareIcons} onShare=${share} onCopy=${copy} style="margin-top:40px" />
      <p class="note"><${Icon} name="info" size=${14} />링크를 아는 사람은 누구나 들어올 수 있어요. 여행 멤버에게만 보내 주세요.</p>
      <div class="full__spacer"></div>
      <button class="link-center" style="text-decoration:none" onClick=${later}>${shared ? '홈으로 가기' : '나중에 보내기'}</button>
    </div>
  </div>`;
}

/** 02-1 초대 안내 (개설자 · 처음 1회) */
export function InviteSheet({ trip }) {
  const url = inviteUrl(trip.inviteCode);
  return html`<${Sheet} title="친구들을 아직 초대하지 않았어요">
    <p class="lead" style="margin-top:-8px">링크를 보내면 친구가 바로 들어와서 함께 쓸 수 있어요.<br />링크는 여행 카드에서도 언제든 복사할 수 있어요.</p>
    <${ShareIcons} onShare=${() => shareInvite(trip, trip.inviteCode).then(() => closeOverlay())}
      onCopy=${() => { copyText(url); closeOverlay(); }} />
  <//>`;
}

/** 초대 링크 보내기: 글자 버튼 대신 동그란 아이콘 + 아래 이름 (13-1 · 02-1) */
function ShareIcons({ onShare, onCopy, style }) {
  return html`<div class="share-icons" style=${style}>
    <button class="share-icon" onClick=${onShare}>
      <span class="share-icon__circle share-icon__circle--point"><${Icon} name="share-2" size=${24} /></span>카카오톡·공유
    </button>
    <button class="share-icon" onClick=${onCopy}>
      <span class="share-icon__circle"><${Icon} name="link" size=${24} /></span>링크 복사
    </button>
  </div>`;
}
