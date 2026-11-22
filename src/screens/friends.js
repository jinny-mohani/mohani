// 11 친구들 · 11-1 내 프로필 수정 · 11-2 프로필 사진 선택 · 11-3 멤버 추가
import { html, useState } from '../vendor/preact-htm.js';
import { Avatar, Button, Icon, Modal, Sheet, TextArea, TextField, FormError } from '../ui/components.js';
import { openOverlay, closeOverlay } from '../overlay.js';
import { getState, saveRow, uploadPhoto } from '../store.js';
import { saveLater } from '../save.js';
import { activeMembers, profileSrc, randomCharacter, CHARACTER_COUNT } from '../members.js';
import { inviteUrl, copyText } from '../share.js';
import { resizeImage } from '../image.js';
import { toast } from '../ui/toast.js';
import { MemberAddSheet } from './member-add.js';
import { FriendProfile } from './home.js';

function FriendRow({ m, isMe }) {
  const rel = [m.isOwner && '개설자', m.relation && m.relation !== '개설자' && m.relation].filter(Boolean).join(' · ');
  // 친구를 누르면 03-8 프로필 팝업 (소개 전체), 나는 내 프로필 수정
  const open = () => openOverlay(isMe ? html`<${ProfileEdit} />` : html`<${FriendProfile} member=${m} />`);
  // 피그마 11.22 '친구글-목록': 흰 카드 · 큰 프로필(80) 옆에 이름·소개, 아래에 긴 소개
  return html`<li class="friend">
    <button class="friend__open" aria-label=${isMe ? '내 프로필 수정' : m.name + ' 프로필 보기'} onClick=${open}></button>
    <div class="friend__top">
      <${Avatar} member=${m} size=${80} />
      <div class="friend__body">
        <div class="friend__name"><b>${m.name}</b>${isMe && html`<span class="me-label">나</span>`}</div>
        ${rel && html`<p class="friend__rel">${rel}</p>`}
      </div>
    </div>
    ${m.intro && html`<p class="friend__intro clamp-2">${m.intro}</p>`}
    ${isMe && html`<button class="icon-btn friend__edit" aria-label="내 프로필 수정" onClick=${() => openOverlay(html`<${ProfileEdit} />`)}>
      <${Icon} name="pencil" size=${16} /></button>`}
  </li>`;
}

export function Friends({ data, me }) {
  const members = activeMembers(data);
  // 나를 맨 위로
  const sorted = [...members.filter((m) => m.id === me), ...members.filter((m) => m.id !== me)];
  const addMember = () => openOverlay(html`<${MemberAddSheet}
    profile=${randomCharacter(members.map((m) => m.profile))}
    onAdd=${(m) => { saveLater('members', m); toast(`${m.name}님을 추가했어요. 초대 링크를 보내 주세요`); }} />`);

  return html`<main class="screen screen--tint">
    <header class="big-title friends-title">
      <h1>친구들</h1>
      <span>
        <button class="round-btn" aria-label="멤버 추가" onClick=${addMember}><${Icon} name="user-plus" size=${22} /></button>
        <button class="round-btn" aria-label="초대 링크 복사" onClick=${() => copyText(inviteUrl(getState().current))}><${Icon} name="link" size=${22} /></button>
      </span>
    </header>
    <div class="page">
      <p class="friends-count">${members.length}명이 함께 가요</p>
      <ul class="friends">${sorted.map((m) => html`<${FriendRow} key=${m.id} m=${m} isMe=${m.id === me} />`)}</ul>
    </div>
  </main>`;
}

/** 11-1 내 프로필 수정 (전체 화면 팝업) */
function ProfileEdit() {
  const { data, me } = getState();
  const mine = data.members.find((m) => m.id === me);
  const [f, setF] = useState({ name: mine.name || '', relation: mine.relation || '', intro: mine.intro || '', profile: mine.profile || '' });
  const [photo, setPhoto] = useState(null); // 새로 고른 사진 { dataUrl }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v && v.currentTarget ? v.currentTarget.value : v }));

  const pick = () => openOverlay(html`<${ProfilePicker} current=${f.profile} photo=${photo}
    onPick=${(v) => { if (typeof v === 'string') { setPhoto(null); set('profile')(v); } else { setPhoto(v); } }} />`);

  const save = async () => {
    if (!f.name.trim()) return setError('이름을 입력해 주세요.');
    setBusy(true);
    try {
      const profile = photo ? await uploadPhoto(photo.dataUrl, photo.mimeType) : f.profile;
      saveLater('members', { id: me, name: f.name.trim(), relation: f.relation.trim(), intro: f.intro.trim(), profile }, mine.updatedAt);
      closeOverlay();
      toast('프로필을 저장했어요');
    } catch (e) {
      setError((e.message || '저장 안 됨') + ' · 다시 시도해 주세요');
      setBusy(false);
    }
  };

  const preview = photo ? { name: f.name, profile: '' } : { name: f.name, profile: f.profile };
  return html`<${Modal} title="내 프로필" footer=${html`<${Button} onClick=${save} disabled=${busy}>${busy ? '저장 중…' : '저장하기'}<//>`}>
    <div class="form">
      <button class="profile-pick" aria-label="프로필 사진 바꾸기" onClick=${pick}>
        ${photo ? html`<span class="avatar" style="width:88px;height:88px"><img src=${photo.dataUrl} alt="" /></span>` : html`<${Avatar} member=${preview} size=${88} />`}
        <span class="member-add__pencil"><${Icon} name="pencil" size=${14} /></span>
      </button>
      <${TextField} title="이름" value=${f.name} maxLength="20" onInput=${set('name')} />
      <${TextField} title="간단 소개" placeholder="예) 지니의 대학 동기" value=${f.relation} maxLength="30" onInput=${set('relation')} />
      <${TextArea} title="소개" maxLines=${3} placeholder=${'예) 사진 담당이에요.\n가고 싶은 곳 있으면 장소에 올려주세요!'} value=${f.intro} onInput=${set('intro')}
        help="최대 3줄 · 줄바꿈 가능 · 목록에서는 2줄까지 보여요" />
      <${FormError} error=${error} />
    </div>
  <//>`;
}

/** 11-2 프로필 사진 선택 — 직접 등록 + 캐릭터 6종, 다른 친구가 쓰는 캐릭터는 고를 수 없어요 (피그마) */
function ProfilePicker({ current, photo, onPick }) {
  const { data, me } = getState();
  const usedBy = {};
  activeMembers(data).forEach((m) => { if (m.id !== me && m.profile) usedBy[String(m.profile)] = m.name; });
  const [sel, setSel] = useState(photo || String(current || ''));

  const upload = async (e) => {
    const file = e.currentTarget.files && e.currentTarget.files[0];
    if (!file) return;
    try { setSel(await resizeImage(file, 600)); } catch (err) { toast(err.message); }
  };
  const isPhoto = sel && typeof sel === 'object';
  const ownPhoto = isPhoto ? sel.dataUrl : /^https?:/.test(String(sel)) ? sel : '';

  return html`<${Sheet} title="프로필 사진 선택" footer=${html`<${Button} disabled=${!sel} onClick=${() => { onPick(sel); closeOverlay(); }}>선택 완료<//>`}>
    <p class="lead" style="margin-top:-8px">다른 친구가 쓰고 있는 캐릭터는 고를 수 없어요</p>
    <div class="char-grid">
      ${Array.from({ length: CHARACTER_COUNT }, (_, i) => String(i + 1)).map((n) => {
        const taken = usedBy[n];
        const on = sel === n;
        return html`<button class=${'char' + (on ? ' char--on' : '') + (taken ? ' char--taken' : '')} disabled=${!!taken}
          aria-pressed=${on ? 'true' : 'false'} key=${n} onClick=${() => setSel(n)}
          aria-label=${'캐릭터 ' + n + (taken ? ', ' + taken + ' 사용 중' : '')}>
          <span class="char__img"><img src=${profileSrc(n)} alt="" />
            ${taken && html`<span class="char__lock"><${Icon} name="lock" size=${12} stroke=${2} /></span>`}
            ${on && html`<span class="char__check"><${Icon} name="check" size=${12} stroke=${2.5} /></span>`}
          </span>
          ${taken ? html`<span>${taken}</span><small>사용 중</small>` : on ? html`<b>${String(current) === n ? '지금 내 사진' : '고른 사진'}</b>` : html`<span>선택 가능</span>`}
        </button>`;
      })}
      <label class=${'char' + (ownPhoto ? ' char--on' : '')}>
        <span class="char__img char__img--upload">
          ${ownPhoto ? html`<img src=${ownPhoto} alt="" style="border-radius:50%;object-fit:cover" />` : html`<${Icon} name="image-plus" size=${24} />`}
        </span>
        <b>직접 등록</b>
        <input type="file" accept="image/*" class="sr-only" onChange=${upload} />
      </label>
    </div>
  <//>`;
}
