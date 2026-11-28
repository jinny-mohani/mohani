// 저장 규칙 (기획안 '동기화 규칙')
// - 내가 저장할 때: 화면에 먼저 반영, 저장은 뒤에서. 실패하면 '저장 안 됨 · 다시 시도'
// - 같은 항목 동시 수정: 수정시간 비교 → 12 팝업 (상대 글로 두기 / 내 글로 바꾸기)
import { saveRow, refresh, deleteRow, restoreRow, applyLocal, newId, syncing, failed, touch, uploadPhoto, getState } from './store.js';
import { askConflict } from './ui/conflict.js';
import { toast } from './ui/toast.js';

// 같은 항목의 저장은 한 줄로 세워서 차례로 보내요. 앞 저장이 끝난 뒤의 수정시간을 써야
// 빠르게 두 번 바꿔도 '내가 나와 충돌'하지 않아요 (11.28 코드 검수)
const queues = {};
const latestUpdatedAt = (table, id, fallback) => {
  const d = getState().data;
  const row = d && (d[table] || []).find((r) => r.id === id);
  return (row && row.updatedAt) || fallback;
};

/**
 * 뒤에서 저장. 화면에는 바로 반영되고, 이 함수는 기다리지 않아도 돼요.
 * 돌려주는 값: 저장할 줄 (새 항목이면 id가 붙어 있어요)
 */
export function saveLater(table, row, baseUpdatedAt, photos) {
  const full = { ...row, id: row.id || newId(table) };
  // 사진: 새로 고른 사진은 휴대폰 안 미리보기 주소로 먼저 보여주고, 올리기는 뒤에서
  const items = (photos || []).map((p) =>
    typeof p === 'string' ? { url: p } : { file: p, preview: dataUrlToObjectUrl(p.dataUrl) }
  );
  if (photos) full.photos = items.map((x) => x.url || x.preview).join(',');
  applyLocal(table, full);
  syncing.count++;
  const hasNew = items.some((x) => !x.url);
  const uploadAll = async () => {
    for (const x of items) {
      if (!x.url) x.url = await uploadPhoto(x.file.dataUrl, x.file.mimeType); // 이미 올린 건 다시 안 올려요
    }
    if (photos) full.photos = items.map((x) => x.url).join(',');
  };
  let base = baseUpdatedAt;
  const attempt = (force) =>
    uploadAll()
      .then(() => saveRow(table, full, { baseUpdatedAt: base, force }))
      .then(() => {
        delete failed[full.id];
        if (hasNew) toast('사진까지 저장했어요');
      })
      .catch(async (e) => {
        if (e.code === 'conflict') {
          const current = e.data && e.data.current;
          const choice = await askConflict(current && current.updatedBy);
          if (choice === 'mine') return attempt(true);
          syncing.count = Math.max(0, syncing.count - 1);
          await refresh(); // 상대 글로 두기: 시트 내용으로 바꿔요
          syncing.count++;
          return;
        }
        failed[full.id] = () => {
          syncing.count++;
          return attempt(force).finally(() => { syncing.count = Math.max(0, syncing.count - 1); });
        };
        touch(); // '저장 안 됨' 표시를 위해 화면 다시 그리기
        toast('연결이 불안정해 저장하지 못했어요', { action: '다시 시도', duration: 8000, onAction: () => failed[full.id] && failed[full.id]() });
      });
  const prev = queues[full.id];
  const run = () => {
    if (prev) base = latestUpdatedAt(table, full.id, baseUpdatedAt); // 앞 저장이 받아 온 새 수정시간
    return attempt(false);
  };
  const p = (prev ? prev.then(run, run) : run()).finally(() => {
    syncing.count = Math.max(0, syncing.count - 1);
    if (queues[full.id] === p) delete queues[full.id];
  });
  queues[full.id] = p;
  return full;
}

function dataUrlToObjectUrl(dataUrl) {
  const [head, b64] = dataUrl.split(',');
  const mime = (head.match(/data:([^;]+)/) || [])[1] || 'image/jpeg';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

/** 기다리는 저장 (여행 설정처럼 결과를 꼭 확인해야 할 때). 상대 글로 두기를 고르면 null */
export async function saveWithCheck(table, row, baseUpdatedAt) {
  try {
    return await saveRow(table, row, { baseUpdatedAt });
  } catch (e) {
    if (e.code !== 'conflict') throw e;
    const current = e.data && e.data.current;
    const choice = await askConflict(current && current.updatedBy);
    if (choice === 'mine') return saveRow(table, row, { force: true });
    await refresh();
    return null;
  }
}

/** 삭제 + '되돌리기' 알림 (기획안: 삭제 직후 되돌리기, 이후엔 최근 삭제에서) */
export async function deleteWithUndo(table, id, label) {
  const p = deleteRow(table, id);
  toast(`${label ? "'" + label + "' " : ''}삭제했어요`, {
    action: '되돌리기',
    duration: 5000,
    onAction: () => p.then(() => restoreRow(table, id)).catch(() => toast('되돌리지 못했어요 · 최근 삭제에서 되살려 주세요')),
  });
  return p;
}
