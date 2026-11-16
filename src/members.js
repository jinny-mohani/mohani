// 멤버 도우미: 캐릭터 프로필, 이름 목록
export const CHARACTER_COUNT = 6;

/** 프로필 값 → 이미지 주소. '1'~'6'은 캐릭터, http로 시작하면 올린 사진 */
export function profileSrc(profile) {
  const p = String(profile || '').trim();
  if (/^https?:\/\//.test(p)) return p;
  const n = Number(p);
  if (n >= 1 && n <= CHARACTER_COUNT) return `images/characters/${n}.png`;
  return '';
}

/** 아직 아무도 안 쓰는 캐릭터 중 하나를 무작위로 (다 쓰면 아무거나) — 피그마 '프로필 이미지 (랜덤 사용)' */
export function randomCharacter(used = []) {
  const all = Array.from({ length: CHARACTER_COUNT }, (_, i) => String(i + 1));
  const free = all.filter((n) => !used.map(String).includes(n));
  const pool = free.length ? free : all;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function activeMembers(data) {
  return (data.members || []).filter((m) => !m.deleted);
}

export function memberName(data, id) {
  const m = (data.members || []).find((x) => x.id === id);
  return m ? m.name : '';
}
