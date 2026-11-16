// 저장 + 동시 수정 처리 (기획안 '동시 편집 충돌')
import { saveRow, refresh, deleteRow, restoreRow } from './store.js';
import { askConflict } from './ui/conflict.js';
import { toast } from './ui/toast.js';

/**
 * 한 줄 저장. 내가 불러온 뒤 다른 친구가 먼저 고쳤으면 12 팝업으로 물어봐요.
 * 돌려주는 값: 저장된 줄, 또는 상대 글로 두기를 고르면 null
 */
export async function saveWithCheck(table, row, baseUpdatedAt) {
  try {
    return await saveRow(table, row, { baseUpdatedAt });
  } catch (e) {
    if (e.code !== 'conflict') throw e;
    const current = e.data && e.data.current;
    const choice = await askConflict(current && current.updatedBy);
    if (choice === 'mine') return saveRow(table, row, { force: true });
    // 상대 글로 두기: 시트 내용을 다시 불러와 화면을 바꿔요
    await refresh();
    return null;
  }
}

/** 삭제 + '되돌리기' 알림 (기획안: 삭제 직후 되돌리기, 이후엔 최근 삭제에서) */
export async function deleteWithUndo(table, id, label) {
  await deleteRow(table, id);
  toast(`${label ? "'" + label + "' " : ''}삭제했어요`, {
    action: '되돌리기',
    duration: 5000,
    onAction: () => restoreRow(table, id).catch(() => toast('되돌리지 못했어요 · 최근 삭제에서 되살려 주세요')),
  });
}
