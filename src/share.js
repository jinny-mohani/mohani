// 초대 링크 만들기·복사·공유
import { toast } from './ui/toast.js';

/** 이 앱 주소 + ?t=초대코드 (GitHub Pages든 다른 곳이든 지금 주소 기준) */
export function inviteUrl(code) {
  const url = new URL(location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('t', code);
  return url.toString();
}

/** 화면에 보여줄 짧은 모양 (https:// 뺀 것) */
export function shortUrl(url) {
  return url.replace(/^https?:\/\//, '');
}

export async function copyText(text, message = '링크를 복사했어요') {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    // 오래된 브라우저·카톡 내장 브라우저 대비
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (err) { /* 무시 */ }
    ta.remove();
  }
  toast(message);
}

/**
 * 휴대폰 공유 창 열기 (카카오톡·메시지 등). 공유 창이 없는 브라우저는 링크 복사로 대신해요.
 * 카카오톡 전용 버튼(카카오 SDK)은 앱 키 등록이 필요해서 1차에서는 휴대폰 공유 창을 써요.
 */
export async function shareInvite(trip, code) {
  const url = inviteUrl(code);
  const text = `'${trip.title}'에 초대할게요! 링크를 눌러 들어와요.`;
  if (navigator.share) {
    try {
      await navigator.share({ title: '함께 가요!', text, url });
      return;
    } catch (e) {
      if (e && e.name === 'AbortError') return; // 사용자가 닫음
    }
  }
  copyText(url);
}

/** 휴대폰 공유 창(없으면 복사). lines: 제목 아래 붙일 줄들 */
export async function shareInfo(title, lines, copied = '정보를 복사했어요') {
  const text = [title, ...lines].filter(Boolean).join('\n');
  if (navigator.share) {
    try { await navigator.share({ title, text }); } catch (e) { /* 취소 */ }
  } else copyText(text, copied);
}
