// 03-4 홈 › 여행 설정 (전체 화면 팝업) — 멤버 누구나 고칠 수 있어요
import { html, useState } from '../vendor/preact-htm.js';
import { Button, Icon, Modal, TextField } from '../ui/components.js';
import { closeOverlay } from '../overlay.js';
import { getState, saveRow, uploadPhoto, refresh } from '../store.js';
import { go } from '../router.js';
import { formatDay, nightsLabel, tripDays } from '../date.js';
import { resizeImage } from '../image.js';
import { inviteUrl, copyText } from '../share.js';
import { toast } from '../ui/toast.js';

export function TripSettings() {
  const { data, current } = getState();
  const trip = data.trip;
  const [title, setTitle] = useState(trip.title || '');
  const [destination, setDestination] = useState(trip.destination || '');
  const [startDate, setStartDate] = useState(trip.startDate || '');
  const [endDate, setEndDate] = useState(trip.endDate || '');
  const [cover, setCover] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const deletedCount = ['reservations', 'checklist', 'places', 'schedule', 'members']
    .reduce((n, t) => n + data[t].filter((r) => r.deleted).length, 0);
  const preview = { startDate, endDate };
  const days = tripDays(preview);
  const oldDays = tripDays(trip);

  const pickCover = async (e) => {
    const file = e.currentTarget.files && e.currentTarget.files[0];
    if (!file) return;
    try {
      setCover(await resizeImage(file));
    } catch (err) {
      toast(err.message);
    }
  };

  const save = async () => {
    if (!title.trim() || !startDate || !endDate) {
      setError('여행 이름과 날짜를 입력해 주세요.');
      return;
    }
    if (endDate < startDate) {
      setError('도착일이 출발일보다 빨라요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const row = { title: title.trim(), destination: destination.trim(), startDate, endDate };
      if (cover) row.coverImage = await uploadPhoto(cover.dataUrl, cover.mimeType);
      await saveRow('trips', row, { baseUpdatedAt: trip.updatedAt });
      if (days < oldDays) refresh(); // 빠진 Day의 일정이 마지막 Day로 옮겨졌으니 다시 불러오기
      closeOverlay();
      toast('여행 정보를 저장했어요');
    } catch (err) {
      if (err.code === 'conflict') {
        setError(err.message + ' 닫고 다시 열어 바뀐 내용을 확인해 주세요.');
        refresh();
      } else {
        setError(err.message || '저장 안 됨 · 다시 시도해 주세요');
      }
      setBusy(false);
    }
  };

  return html`<${Modal}
    title="여행 설정"
    footer=${html`<${Button} onClick=${save} disabled=${busy}>${busy ? '저장 중…' : '저장하기'}<//>`}
  >
    <div class="form">
      <${TextField} title="여행 이름" value=${title} maxLength="30" onInput=${(e) => setTitle(e.currentTarget.value)} />
      <${TextField} title="목적지" value=${destination} maxLength="30" onInput=${(e) => setDestination(e.currentTarget.value)} />
      <div class="field">
        <span class="field__label" id="set-date">날짜</span>
        <div class="field-pair" role="group" aria-labelledby="set-date">
          <input class="input" type="date" aria-label="출발일" value=${startDate} onInput=${(e) => setStartDate(e.currentTarget.value)} />
          <span class="field-pair__dash">–</span>
          <input class="input" type="date" aria-label="도착일" value=${endDate} min=${startDate || null} onInput=${(e) => setEndDate(e.currentTarget.value)} />
        </div>
        <p class="info-box">
          <${Icon} name="info" size=${16} />
          <span>
            ${nightsLabel(preview)} · Day 1 ~ Day ${days}${startDate ? ` (${formatDay(startDate)} 출발)` : ''}<br />
            ${days < oldDays
              ? html`<strong>Day ${days + 1}~${oldDays}의 일정은 Day ${days}로 옮겨져요</strong>`
              : '날짜를 줄이면 빠진 Day의 일정은 마지막 Day로 옮겨져요'}
          </span>
        </p>
      </div>
      <div class="field">
        <span class="field__label">대표 이미지</span>
        <label class="photo-pick">
          ${cover || trip.coverImage
            ? html`<img src=${cover ? cover.dataUrl : trip.coverImage} alt="대표 이미지" />`
            : html`<${Icon} name="image-plus" /><span>이미지 변경</span>`}
          <input type="file" accept="image/*" onChange=${pickCover} aria-label="대표 이미지 바꾸기" />
        </label>
      </div>
      <div class="field">
        <span class="field__help">멤버 관리는 친구들 메뉴에서 할 수 있어요</span>
        <div class="list-gap">
          <button class="setting-row" onClick=${() => copyText(inviteUrl(current))}>
            <${Icon} name="link" size=${20} /><span>초대 링크 복사</span><${Icon} name="copy" size=${18} />
          </button>
          <button class="setting-row" onClick=${() => closeOverlay(() => go('/home/deleted'))}>
            <${Icon} name="trash-2" size=${20} /><span>최근 삭제한 항목</span>
            <em>${deletedCount}</em><${Icon} name="chevron-right" size=${18} />
          </button>
        </div>
      </div>
      ${error && html`<p class="form__error" role="alert">${error}</p>`}
    </div>
  <//>`;
}
