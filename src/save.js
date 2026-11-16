// 저장 규칙 (기획안 '동기화 규칙')
// - 내가 저장할 때: 화면에 먼저 반영, 저장은 뒤에서. 실패하면 '저장 안 됨 · 다시 시도'
// - 같은 항목 동시 수정: 수정시간 비교 → 12 팝업 (상대 글로 두기 / 내 글로 바꾸기)
import { saveRow, refresh, deleteRow, restoreRow, applyLocal, newId, syncing, failed, touch } from './store.js';
import { askConflict } from './ui/conflict.js';
import { toast } from './ui/toast.js';

/**
 * 뒤에서 저장. 화면에는 바로 반영되고, 이 함수는 기다리지 않아도 돼요.
 * 돌려주는 값: 저장할 줄 (새 항목이면 id가 붙어 있어요)
 */
export function saveLater(table, row, baseUpdatedAt) {
  const full = { ...row, id: row.id || newId(table) };
  applyLocal(table, full);
  syncing.count++;
  const attempt = (force) =>
    saveRow(table, full, { baseUpdatedAt, force })
      .then(() => {
        delete failed[full.id];
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
  attempt(false).finally(() => { syncing.count = Math.max(0, syncing.count - 1); });
  return full;
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
