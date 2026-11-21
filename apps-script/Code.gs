/**
 * 함께 가요! — 구글 시트 API (Google Apps Script)
 *
 * 이 파일 하나를 시트의 Apps Script 편집기에 붙여 넣고
 *   1) setup 실행 → 탭과 컬럼이 자동으로 만들어짐
 *   2) 웹 앱으로 배포 → 나온 주소를 앱에 넣음
 * 자세한 순서는 docs/시트-설정-안내.md 참고.
 *
 * 구조: 기능 1개 = 시트 탭 1개, 첫 줄 = 컬럼 이름, 한 줄 = 항목 1개.
 * 앱은 영어 키(title, startDate …)로 주고받고, 시트에는 한글 컬럼 이름으로 저장한다.
 * 컬럼은 이름으로 찾으므로 시트에서 순서를 바꿔도 된다.
 */

// ───────────────────────── 설정 ─────────────────────────

const APP = {
  SHEET_ID: '', // 비워 두면 이 스크립트가 붙어 있는 시트를 사용
  PHOTO_FOLDER: '함께 가요! 사진', // 구글 드라이브에 만들어질 사진 폴더 이름
  MAX_PHOTO_MB: 8,
};

/** 모든 탭 끝에 붙는 공통 컬럼 */
const TAIL = [
  ['updatedBy', '수정자'],
  ['updatedAt', '수정시간'],
  ['deleted', '삭제됨'],
  ['deletedBy', '삭제자'],
  ['deletedAt', '삭제시간'],
];

/** 탭 정의: [앱 키, 시트 컬럼 이름] */
const TABLES = {
  trips: {
    sheet: '여행정보',
    cols: [
      ['id', '여행id'], ['title', '여행명'], ['startDate', '시작일'], ['endDate', '종료일'],
      ['destination', '목적지'], ['coverImage', '대표 이미지'], ['inviteCode', '초대코드'],
      ['createdBy', '개설자'],
    ],
  },
  members: {
    sheet: '멤버',
    cols: [
      ['id', 'id'], ['tripId', '여행id'], ['name', '이름'], ['relation', '관계'],
      ['intro', '소개'], ['isOwner', '개설자 여부'], ['profile', '프로필'], ['order', '순서'],
    ],
  },
  reservations: {
    sheet: '예약정보',
    cols: [
      // 공통
      ['id', 'id'], ['tripId', '여행id'], ['type', '종류'], ['title', '예약명'],
      ['startAt', '시작 일시'], ['endAt', '종료 일시'], ['address', '장소'], ['mapUrl', '지도링크'],
      ['bookingNo', '예약번호'], ['status', '상태'], ['assignee', '담당'], ['photos', '사진URL'],
      ['memo', '메모'], ['vendor', '예약처'], ['cost', '비용'],
      // 항공권
      ['direction', '구분'], ['fromAirport', '출발 공항'], ['fromTerminal', '출발 터미널'],
      ['toAirport', '도착 공항'], ['toTerminal', '도착 터미널'], ['duration', '소요 시간'],
      ['airline', '항공사'], ['flightNo', '항공편'], ['aircraft', '기종'], ['seat', '좌석'],
      // 숙소
      ['roomType', '객실 형태'], ['roomSize', '방 크기'], ['checkInTime', '체크인 시간'],
      // 기타
      ['subType', '세부 종류'], ['people', '인원'],
      ['order', '순서'],
    ],
  },
  checklist: {
    sheet: '체크 리스트',
    cols: [
      ['id', 'id'], ['tripId', '여행id'], ['title', '할 일'], ['group', '구분'],
      ['assignee', '담당'], ['dueDate', '기한'], ['doneBy', '완료한 멤버'], ['order', '순서'],
    ],
  },
  places: {
    sheet: '장소',
    cols: [
      ['id', 'id'], ['tripId', '여행id'], ['category', '카테고리'], ['name', '장소이름'],
      ['photos', '사진URL'], ['mapUrl', '지도링크'], ['address', '정확한 주소'],
      ['hours', '운영시간'], ['breakTime', '브레이크타임'], ['waiting', '웨이팅'],
      ['memo', '메모'], ['order', '순서'],
      ['subtitle', '보조제목'], ['phone', '전화번호'], ['parking', '주차정보'], // 11.21 추가 (setup이 칸을 만듦)
    ],
  },
  schedule: {
    sheet: '일정',
    cols: [
      ['id', 'id'], ['tripId', '여행id'], ['day', 'Day'], ['time', '시간'],
      ['placeId', '장소id'], ['placeName', '장소 직접 입력'], ['transport', '이동수단'],
      ['memo', '메모'], ['order', '순서'],
    ],
  },
};

/** 체크박스(TRUE/FALSE)로 다루는 컬럼 */
const BOOL_KEYS = ['deleted', 'isOwner'];

/** 숫자로 돌려주는 컬럼 */
const NUM_KEYS = ['day', 'order'];

/** 앱에서 바꿀 수 없는 칸 (서버가 관리) */
const LOCKED_KEYS = ['id', 'tripId', 'inviteCode', 'updatedBy', 'updatedAt', 'deleted', 'deletedBy', 'deletedAt'];

// ───────────────────────── 진입점 ─────────────────────────

function doGet(e) {
  return respond_((e && e.parameter) || {});
}

function doPost(e) {
  let req;
  try {
    req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: 'bad_json', message: '요청 형식이 올바르지 않아요.' });
  }
  return respond_(req);
}

function respond_(req) {
  try {
    const action = ACTIONS[req.action];
    if (!action) throw apiError_('unknown_action', '알 수 없는 요청이에요: ' + req.action);
    const result = action(req);
    return json_(Object.assign({ ok: true, serverTime: now_() }, result));
  } catch (err) {
    return json_(Object.assign(
      { ok: false, error: err.code || 'server_error', message: err.message || String(err) },
      err.data || {}
    ));
  }
}

const ACTIONS = {
  ping: () => ({ message: '함께 가요! 연결 성공' }),
  trips: listTrips_,
  load: loadTrip_,
  create_trip: createTrip_,
  save: save_,
  delete: (req) => setDeleted_(req, true),
  restore: (req) => setDeleted_(req, false),
  toggle_done: toggleDone_,
  reorder: reorder_,
  upload: upload_,
};

// ───────────────────────── 읽기 ─────────────────────────

/**
 * 여행 목록 화면용. 휴대폰에 저장된 초대코드들을 받아 요약을 돌려준다.
 * GET ?action=trips&codes=코드1,코드2
 */
function listTrips_(req) {
  const codes = toList_(req.codes);
  const trips = readTable_('trips').rows;
  const members = readTable_('members').rows;
  const found = [];
  const missing = [];
  codes.forEach((code) => {
    const trip = trips.find((t) => t.inviteCode === code && !t.deleted);
    if (!trip) { missing.push(code); return; }
    found.push({
      trip: publicTrip_(trip),
      members: sortByOrder_(members.filter((m) => m.tripId === trip.id && !m.deleted)),
    });
  });
  return { trips: found, missing: missing };
}

/**
 * 여행 하나의 전체 데이터. 삭제된 항목도 함께 보낸다(최근 삭제 화면용).
 * GET ?action=load&code=초대코드
 */
function loadTrip_(req) {
  const trip = tripByCode_(req.code);
  const out = { trip: publicTrip_(trip) };
  ['members', 'reservations', 'checklist', 'places', 'schedule'].forEach((name) => {
    out[name] = sortByOrder_(readTable_(name).rows.filter((r) => r.tripId === trip.id));
  });
  return out;
}

// ───────────────────────── 쓰기 ─────────────────────────

/**
 * 새 여행 만들기 (13 화면).
 * POST { action:'create_trip', trip:{title,startDate,endDate,destination,coverImage}, members:[{name,relation,profile,isOwner}], by }
 */
function createTrip_(req) {
  const t = req.trip || {};
  if (!t.title) throw apiError_('invalid', '여행 이름을 입력해 주세요.');
  checkDates_(t.startDate, t.endDate);
  return withLock_(() => {
    const by = req.by || '';
    const stamp = now_();
    const trip = Object.assign({}, pick_(t, 'trips'), {
      id: 't_' + randomId_(8),
      inviteCode: randomId_(20),
      createdBy: by,
      updatedBy: by,
      updatedAt: stamp,
      deleted: false,
    });
    insertRow_('trips', trip);
    const members = (req.members || []).map((m, i) => {
      const row = Object.assign({}, pick_(m, 'members'), {
        id: m.id || 'm_' + randomId_(8),
        tripId: trip.id,
        isOwner: !!m.isOwner,
        order: i + 1,
        updatedBy: by,
        updatedAt: stamp,
        deleted: false,
      });
      insertRow_('members', row);
      return row;
    });
    return { trip: publicTrip_(trip), members: members };
  });
}

/**
 * 항목 추가·수정 (한 줄 단위).
 * POST { action:'save', code, table, row:{...}, baseUpdatedAt, force, by }
 *  - row.id가 없거나 시트에 없으면 새 줄로 추가
 *  - 있으면 수정. 내가 불러온 뒤 다른 사람이 먼저 고쳤으면(수정시간이 다르면) conflict
 *  - force:true 이면 덮어쓰기
 */
function save_(req) {
  const name = req.table;
  const def = TABLES[name];
  if (!def) throw apiError_('invalid', '알 수 없는 탭이에요: ' + name);
  const input = req.row || {};
  const by = req.by || '';

  return withLock_(() => {
    const trip = tripByCode_(req.code);
    const table = readTable_(name);
    const stamp = now_();

    // 여행 정보 수정
    if (name === 'trips') {
      const current = table.rows.find((r) => r.id === trip.id);
      checkConflict_(current, req);
      const next = Object.assign({}, current, pick_(input, name), {
        updatedBy: by, updatedAt: laterThan_(current.updatedAt, stamp),
      });
      checkDates_(next.startDate, next.endDate);
      writeRow_(table, current._row, next);
      const moved = clampScheduleDays_(trip.id, dayCount_(next.startDate, next.endDate), by, stamp);
      return { row: publicTrip_(next), movedSchedule: moved };
    }

    const current = input.id ? table.rows.find((r) => r.id === input.id) : null;

    if (current) {
      if (current.tripId !== trip.id) throw apiError_('forbidden', '다른 여행의 항목이에요.');
      checkConflict_(current, req);
      const next = Object.assign({}, current, pick_(input, name), {
        updatedBy: by, updatedAt: laterThan_(current.updatedAt, stamp),
      });
      writeRow_(table, current._row, next);
      return { row: strip_(next) };
    }

    // 새 항목
    const sameTrip = table.rows.filter((r) => r.tripId === trip.id);
    const maxOrder = sameTrip.reduce((m, r) => Math.max(m, Number(r.order) || 0), 0);
    const row = Object.assign({}, pick_(input, name), {
      id: input.id || prefix_(name) + randomId_(8),
      tripId: trip.id,
      updatedBy: by,
      updatedAt: stamp,
      deleted: false,
    });
    if (def.cols.some((c) => c[0] === 'order') && !row.order) row.order = maxOrder + 1;
    insertRow_(name, row);
    return { row: row, created: true };
  });
}

/**
 * 삭제(표시만) / 복구.
 * POST { action:'delete' | 'restore', code, table, id, by }
 */
function setDeleted_(req, deleted) {
  const name = req.table;
  if (!TABLES[name] || name === 'trips') throw apiError_('invalid', '이 항목은 지울 수 없어요.');
  return withLock_(() => {
    const trip = tripByCode_(req.code);
    const table = readTable_(name);
    const current = table.rows.find((r) => r.id === req.id && r.tripId === trip.id);
    if (!current) throw apiError_('not_found', '항목을 찾을 수 없어요.');
    const stamp = now_();
    const next = Object.assign({}, current, {
      deleted: deleted,
      deletedBy: deleted ? (req.by || '') : '',
      deletedAt: deleted ? stamp : '',
      updatedBy: req.by || '',
      updatedAt: stamp,
    });
    writeRow_(table, current._row, next);
    return { row: strip_(next) };
  });
}

/**
 * 체크 리스트 완료 표시. 여러 명이 동시에 눌러도 서로 덮어쓰지 않도록 따로 처리한다.
 * '각자' 일은 memberId별로, 아니면 아무 멤버 id 하나로 완료를 표시한다.
 * POST { action:'toggle_done', code, id, memberId, done, by }
 */
function toggleDone_(req) {
  if (!req.memberId) throw apiError_('invalid', '멤버를 알 수 없어요.');
  return withLock_(() => {
    const trip = tripByCode_(req.code);
    const table = readTable_('checklist');
    const current = table.rows.find((r) => r.id === req.id && r.tripId === trip.id);
    if (!current) throw apiError_('not_found', '항목을 찾을 수 없어요.');
    let done = toList_(current.doneBy);
    if (current.assignee === '각자') {
      done = done.filter((id) => id !== req.memberId);
      if (req.done) done.push(req.memberId);
    } else {
      done = req.done ? [req.memberId] : [];
    }
    const next = Object.assign({}, current, {
      doneBy: done.join(','),
      updatedBy: req.by || '',
      updatedAt: now_(),
    });
    writeRow_(table, current._row, next);
    return { row: strip_(next) };
  });
}

/**
 * 순서 편집 (08-4 등). ids 순서대로 순서 칸을 1, 2, 3… 으로 바꾼다.
 * schedule이면 day를 함께 보내면 그 Day로 옮긴다.
 * POST { action:'reorder', code, table, ids:[...], day, by }
 */
function reorder_(req) {
  const name = req.table;
  if (!TABLES[name] || name === 'trips') throw apiError_('invalid', '순서를 바꿀 수 없는 탭이에요.');
  const ids = Array.isArray(req.ids) ? req.ids : toList_(req.ids);
  return withLock_(() => {
    const trip = tripByCode_(req.code);
    const table = readTable_(name);
    const stamp = now_();
    const changed = [];
    ids.forEach((id, i) => {
      const current = table.rows.find((r) => r.id === id && r.tripId === trip.id);
      if (!current) return;
      const next = Object.assign({}, current, { order: i + 1, updatedBy: req.by || '', updatedAt: stamp });
      if (name === 'schedule' && req.day) next.day = Number(req.day);
      writeRow_(table, current._row, next);
      changed.push(strip_(next));
    });
    return { rows: changed };
  });
}

/**
 * 사진 올리기. 구글 드라이브 '함께 가요! 사진/여행id' 폴더에 저장하고 주소를 돌려준다.
 * 앱에서 미리 크기를 줄여 base64로 보낸다.
 * POST { action:'upload', code, name, mimeType, data }
 */
function upload_(req) {
  const trip = tripByCode_(req.code);
  const mime = req.mimeType || 'image/jpeg';
  if (!/^image\//.test(mime)) throw apiError_('invalid', '사진만 올릴 수 있어요.');
  const base64 = String(req.data || '').replace(/^data:[^,]*,/, '');
  if (!base64) throw apiError_('invalid', '사진이 비어 있어요.');
  const bytes = Utilities.base64Decode(base64);
  if (bytes.length > APP.MAX_PHOTO_MB * 1024 * 1024) {
    throw apiError_('too_large', '사진이 너무 커요. ' + APP.MAX_PHOTO_MB + 'MB 이하로 올려 주세요.');
  }
  const blob = Utilities.newBlob(bytes, mime, req.name || 'photo-' + Date.now() + '.jpg');
  const file = tripFolder_(trip.id).createFile(blob);
  let warning = '';
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    // 회사(Workspace) 계정은 외부 공유가 막혀 있을 수 있음
    warning = '사진 공유 설정에 실패했어요. 개인 구글 계정으로 배포했는지 확인해 주세요.';
  }
  const id = file.getId();
  return { fileId: id, url: 'https://drive.google.com/thumbnail?id=' + id + '&sz=w1600', warning: warning };
}

// ───────────────────────── 시트 도우미 ─────────────────────────

function ss_() {
  return APP.SHEET_ID ? SpreadsheetApp.openById(APP.SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

function allCols_(name) {
  return TABLES[name].cols.concat(TAIL);
}

/**
 * 탭 전체를 읽어 객체 배열로 바꾼다. 각 객체의 _row는 시트의 줄 번호.
 * PC에서 id 없이 직접 추가한 줄은 여기서 id를 채워 넣는다.
 */
function readTable_(name) {
  const def = TABLES[name];
  const sheet = ss_().getSheetByName(def.sheet);
  if (!sheet) throw apiError_('no_sheet', "'" + def.sheet + "' 탭이 없어요. setup을 먼저 실행해 주세요.");
  const values = sheet.getDataRange().getValues();
  const header = (values[0] || []).map((h) => String(h).trim());
  const index = {};
  allCols_(name).forEach(([key, label]) => {
    const i = header.indexOf(label);
    if (i >= 0) index[key] = i;
  });

  const rows = [];
  const tz = ss_().getSpreadsheetTimeZone();
  let firstEmpty = 0; // 처음 나오는 빈 줄 (새 항목을 넣을 자리)
  for (let r = 1; r < values.length; r++) {
    const line = values[r];
    // 빈 체크박스(FALSE)만 있는 줄도 빈 줄로 본다
    if (line.every((v) => v === '' || v === null || v === false)) {
      if (!firstEmpty) firstEmpty = r + 1;
      continue;
    }
    const obj = { _row: r + 1 };
    Object.keys(index).forEach((key) => {
      obj[key] = normalize_(key, line[index[key]], tz);
    });
    if (!obj.id && index.id !== undefined) {
      obj.id = prefix_(name) + randomId_(8);
      sheet.getRange(r + 1, index.id + 1).setValue(obj.id);
    }
    rows.push(obj);
  }
  const nextRow = firstEmpty || values.length + 1;
  return { name: name, sheet: sheet, header: header, index: index, rows: rows, nextRow: nextRow };
}

function normalize_(key, v, tz) {
  if (BOOL_KEYS.indexOf(key) >= 0) return v === true || String(v).toUpperCase() === 'TRUE';
  if (v instanceof Date) {
    if (v.getFullYear() < 1900) return Utilities.formatDate(v, tz, 'HH:mm'); // 시간만 입력한 칸
    const hasTime = v.getHours() || v.getMinutes();
    return Utilities.formatDate(v, tz, hasTime ? "yyyy-MM-dd'T'HH:mm" : 'yyyy-MM-dd');
  }
  if (v === null || v === undefined) return '';
  if (NUM_KEYS.indexOf(key) >= 0 && v !== '' && !isNaN(Number(v))) return Number(v);
  return v;
}

/** 있는 줄을 고쳐 쓴다. 시트에만 있고 앱이 모르는 컬럼은 그대로 둔다. */
function writeRow_(table, rowNum, obj) {
  const width = table.header.length;
  const range = table.sheet.getRange(rowNum, 1, 1, width);
  const line = range.getValues()[0];
  Object.keys(table.index).forEach((key) => {
    if (key in obj) line[table.index[key]] = toCell_(key, obj[key]);
  });
  range.setValues([line]);
}

function insertRow_(name, obj) {
  const table = readTable_(name);
  const line = table.header.map(() => '');
  Object.keys(table.index).forEach((key) => {
    if (key in obj) line[table.index[key]] = toCell_(key, obj[key]);
  });
  // getLastRow()는 빈 체크박스도 내용으로 세서 맨 아래에 붙어 버림 → 첫 빈 줄에 넣는다
  table.sheet.getRange(table.nextRow, 1, 1, line.length).setValues([line]);
}

function toCell_(key, v) {
  if (BOOL_KEYS.indexOf(key) >= 0) return !!v;
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) v = v.join(',');
  v = String(v);
  if (/^[=+\-@]/.test(v) && !/^-?\d/.test(v)) v = "'" + v; // 수식으로 실행되지 않게
  return v;
}

/** 앱이 보낸 값에서 이 탭의 칸만 고르고, 서버가 관리하는 칸은 뺀다. */
function pick_(input, name) {
  const out = {};
  TABLES[name].cols.forEach(([key]) => {
    if (LOCKED_KEYS.indexOf(key) >= 0) return;
    if (input && key in input) out[key] = input[key];
  });
  return out;
}

function strip_(row) {
  const out = Object.assign({}, row);
  delete out._row;
  return out;
}

function publicTrip_(trip) {
  return strip_(trip);
}

function tripByCode_(code) {
  if (!code) throw apiError_('no_code', '초대 링크가 필요해요.');
  code = String(code).trim();
  const trip = readTable_('trips').rows.find((t) => String(t.inviteCode).trim() === code && !t.deleted);
  if (!trip) throw apiError_('trip_not_found', '여행을 찾을 수 없어요. 초대 링크를 다시 확인해 주세요.');
  return trip;
}

function checkConflict_(current, req) {
  if (req.force || !current || !current.updatedAt) return;
  if (String(current.updatedAt) !== String(req.baseUpdatedAt || '')) {
    throw apiError_('conflict', (current.updatedBy || '다른 친구') + '님이 먼저 수정했어요.', {
      current: strip_(current),
    });
  }
}

/** 여행 날짜가 줄면 빠진 Day의 일정을 마지막 Day 끝으로 옮긴다. */
function clampScheduleDays_(tripId, days, by, stamp) {
  if (!days) return 0;
  const table = readTable_('schedule');
  const mine = table.rows.filter((r) => r.tripId === tripId);
  const lastDayMax = mine
    .filter((r) => Number(r.day) === days)
    .reduce((m, r) => Math.max(m, Number(r.order) || 0), 0);
  const overflow = mine
    .filter((r) => Number(r.day) > days)
    .sort((a, b) => (Number(a.day) - Number(b.day)) || ((Number(a.order) || 0) - (Number(b.order) || 0)));
  overflow.forEach((r, i) => {
    writeRow_(table, r._row, Object.assign({}, r, {
      day: days, order: lastDayMax + i + 1, updatedBy: by, updatedAt: stamp,
    }));
  });
  return overflow.length;
}

function dayCount_(start, end) {
  const s = Date.parse(start);
  const e = Date.parse(end);
  if (isNaN(s) || isNaN(e)) return 0;
  return Math.round((e - s) / 86400000) + 1;
}

function checkDates_(start, end) {
  if (!start || !end) return;
  if (dayCount_(start, end) < 1) throw apiError_('invalid', '끝나는 날이 시작일보다 빨라요.');
}

function tripFolder_(tripId) {
  const root = getOrCreateFolder_(DriveApp.getRootFolder(), APP.PHOTO_FOLDER);
  return getOrCreateFolder_(root, tripId);
}

function getOrCreateFolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

// ───────────────────────── 공통 도우미 ─────────────────────────

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw apiError_('busy', '잠시 후 다시 시도해 주세요.');
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function sortByOrder_(rows) {
  return rows
    .map(strip_)
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
}

function toList_(v) {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  return String(v || '').split(',').map((s) => s.trim()).filter(Boolean);
}

function prefix_(name) {
  return { members: 'm_', reservations: 'r_', checklist: 'c_', places: 'p_', schedule: 's_' }[name] || 'x_';
}

/** 추측하기 어려운 무작위 문자열 (헷갈리는 글자 0·O·1·l 제외) */
function randomId_(len) {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    Utilities.getUuid() + Math.random() + Date.now()
  );
  let out = '';
  for (let i = 0; i < len; i++) out += chars[(bytes[i % bytes.length] + 256) % chars.length];
  return out;
}

/** 수정시간이 항상 이전 값보다 뒤가 되게 (같은 순간에 두 번 저장해도 충돌을 알아챌 수 있도록) */
function laterThan_(prev, stamp) {
  if (!prev || String(prev) < stamp) return stamp;
  const t = Date.parse(prev);
  return isNaN(t) ? stamp : new Date(t + 1).toISOString();
}

function now_() {
  return new Date().toISOString();
}

function apiError_(code, message, data) {
  const err = new Error(message);
  err.code = code;
  err.data = data;
  return err;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ───────────────────────── 처음 설정 ─────────────────────────

/**
 * 편집기에서 한 번 실행하세요.
 * 탭과 컬럼을 만들고(이미 있으면 빠진 컬럼만 추가), 샘플 여행을 하나 넣습니다.
 */
function setup() {
  const ss = ss_();
  Object.keys(TABLES).forEach((name) => {
    const def = TABLES[name];
    let sheet = ss.getSheetByName(def.sheet);
    if (!sheet) sheet = ss.insertSheet(def.sheet);

    const labels = allCols_(name).map((c) => c[1]);
    const lastCol = sheet.getLastColumn();
    const existing = lastCol ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
    const missing = labels.filter((l) => existing.indexOf(l) < 0);
    if (missing.length) {
      sheet.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
    }
    const header = existing.concat(missing);

    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, header.length)
      .setFontWeight('bold')
      .setBackground('#f3f3f3');

    // 날짜·숫자가 멋대로 바뀌지 않게 모든 칸을 '글자'로, 체크박스 칸만 체크박스로
    const maxRows = sheet.getMaxRows();
    header.forEach((label, i) => {
      const col = sheet.getRange(2, i + 1, maxRows - 1, 1);
      const key = (allCols_(name).find((c) => c[1] === label) || [])[0];
      if (BOOL_KEYS.indexOf(key) >= 0) {
        col.setNumberFormat('General')
          .setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
      } else {
        col.setNumberFormat('@');
      }
    });
    sheet.autoResizeColumns(1, header.length);
  });

  // 빈 기본 탭(시트1/Sheet1) 정리
  ['시트1', 'Sheet1'].forEach((n) => {
    const s = ss.getSheetByName(n);
    if (s && s.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s);
  });

  const trips = readTable_('trips').rows;
  if (!trips.length) {
    const res = createTrip_({
      trip: { title: '샘플 여행', startDate: '2026-12-19', endDate: '2026-12-21', destination: '오사카' },
      members: [
        { name: '지니', relation: '나', isOwner: true, profile: '1' },
        { name: '친구1', relation: '대학 친구', profile: '2' },
      ],
      by: '지니',
    });
    Logger.log('샘플 여행 초대코드: ' + res.trip.inviteCode);
  }
  Logger.log('설정 완료! 처음이면 [배포 → 새 배포], 코드를 고친 뒤라면 [배포 → 배포 관리 → 새 버전]으로 배포해 주세요.');
}
