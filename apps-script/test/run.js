// Code.gs를 가짜 구글 시트 위에서 돌려 보는 테스트. 실행: node apps-script/test/run.js
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const crypto = require('crypto');

function makeSheet(name) {
  const data = [];
  const chain = new Proxy({}, { get: (t, k) => () => chain });
  const sheet = {
    name, data,
    getLastRow: () => data.length,
    getLastColumn: () => data.reduce((m, r) => Math.max(m, r.length), 0),
    getMaxRows: () => 1000,
    getDataRange: () => sheet.getRange(1, 1, Math.max(data.length, 1), Math.max(sheet.getLastColumn(), 1)),
    getRange(r, c, nr = 1, nc = 1) {
      return {
        getValues: () => Array.from({ length: nr }, (_, i) =>
          Array.from({ length: nc }, (_, j) => ((data[r - 1 + i] || [])[c - 1 + j] ?? ''))),
        setValues(vals) {
          vals.forEach((row, i) => row.forEach((v, j) => {
            while (data.length < r + i) data.push([]);
            data[r - 1 + i][c - 1 + j] = v;
          }));
          return this;
        },
        setValue(v) { return this.setValues([[v]]); },
        setFontWeight: () => chain, setBackground: () => chain,
        setNumberFormat() { return this; },
        // 실제 시트처럼: 체크박스 칸은 빈 칸도 FALSE 값으로 채워져 getLastRow가 1000이 됨
        setDataValidation() {
          for (let i = 0; i < nr; i++) {
            while (data.length < r + i) data.push([]);
            if (data[r - 1 + i][c - 1] === undefined || data[r - 1 + i][c - 1] === '') data[r - 1 + i][c - 1] = false;
          }
          return this;
        },
      };
    },
    setFrozenRows() {}, autoResizeColumns() {},
  };
  return sheet;
}

const sheets = { '시트1': makeSheet('시트1') };
const ss = {
  getSheetByName: (n) => sheets[n] || null,
  insertSheet: (n) => (sheets[n] = makeSheet(n)),
  getSheets: () => Object.values(sheets),
  deleteSheet: (s) => delete sheets[s.name],
  getSpreadsheetTimeZone: () => 'Asia/Seoul',
};
const files = [];
const folder = {
  getFoldersByName: () => ({ hasNext: () => false }),
  createFolder: () => folder,
  createFile: (b) => (files.push(b), { getId: () => 'FILE' + files.length, setSharing() {} }),
};
const chainAny = new Proxy({}, { get: (t, k) => () => chainAny });
const ctx = {
  SpreadsheetApp: { getActiveSpreadsheet: () => ss, newDataValidation: () => chainAny },
  DriveApp: { getRootFolder: () => folder, Access: {}, Permission: {} },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
  Utilities: {
    getUuid: () => crypto.randomUUID(),
    DigestAlgorithm: { SHA_256: 1 },
    computeDigest: (a, s) => [...crypto.createHash('sha256').update(s).digest()].map((b) => (b > 127 ? b - 256 : b)),
    base64Decode: (s) => [...Buffer.from(s, 'base64')],
    newBlob: (bytes, mime, name) => ({ bytes, mime, name }),
    formatDate: (d) => d.toISOString(),
  },
  ContentService: { createTextOutput: (t) => ({ setMimeType: () => JSON.parse(t) }), MimeType: { JSON: 1 } },
  Logger: { log: (m) => console.log('  [log]', m) },
  console,
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + '/../Code.gs', 'utf8'), ctx);

const get = (p) => ctx.doGet({ parameter: p });
const post = (b) => ctx.doPost({ postData: { contents: JSON.stringify(b) } });

// 1. setup: 탭 6개 + 샘플 여행
ctx.setup();
assert.deepStrictEqual(Object.keys(sheets).sort(), ['멤버', '여행정보', '예약정보', '일정', '장소', '체크 리스트'].sort());
assert.strictEqual(sheets['여행정보'].data[0][0], '여행id');
ctx.setup(); // 두 번 실행해도 안전
const tripRows = sheets['여행정보'].data.slice(1).filter((r) => r.some((v) => v !== '' && v !== false && v !== undefined));
assert.strictEqual(tripRows.length, 1); // 두 번 실행해도 샘플은 하나
assert.strictEqual(sheets['여행정보'].data[1][1], '샘플 여행'); // 맨 아래가 아니라 2행

const code = sheets['여행정보'].data[1][6]; // 샘플 여행은 맨 아래가 아니라 2행에 있어야 함
assert.strictEqual(code.length, 20);

// 2. ping, trips, load
assert.ok(get({ action: 'ping' }).ok);
let r = get({ action: 'trips', codes: code + ',없는코드' });
assert.strictEqual(r.trips[0].trip.title, '샘플 여행');
assert.strictEqual(r.trips[0].members.length, 2);
assert.deepStrictEqual(r.missing, ['없는코드']);
assert.strictEqual(get({ action: 'load', code: 'nope' }).error, 'trip_not_found');

// 3. 저장 → 수정 → 충돌 → 덮어쓰기
r = post({ action: 'save', code, table: 'schedule', row: { day: 3, placeName: '공항', memo: '=HACK()' }, by: '지니' });
assert.ok(r.ok && r.created);
const s1 = r.row;
assert.strictEqual(s1.order, 1);
r = post({ action: 'save', code, table: 'schedule', row: { id: s1.id, memo: '수정' }, baseUpdatedAt: s1.updatedAt, by: '친구1' });
assert.ok(r.ok, JSON.stringify(r));
const r2 = post({ action: 'save', code, table: 'schedule', row: { id: s1.id, memo: '옛날 화면에서' }, baseUpdatedAt: s1.updatedAt, by: '지니' });
assert.strictEqual(r2.error, 'conflict');
assert.strictEqual(r2.current.memo, '수정');
assert.ok(r2.message.includes('친구1'));
r = post({ action: 'save', code, table: 'schedule', row: { id: s1.id, memo: '덮어씀' }, force: true, by: '지니' });
assert.strictEqual(r.row.memo, '덮어씀');
// 서버 관리 칸은 앱이 못 바꿈
r = post({ action: 'save', code, table: 'schedule', row: { id: s1.id, tripId: 'evil', deleted: true }, force: true });
assert.notStrictEqual(r.row.tripId, 'evil');
assert.strictEqual(r.row.deleted, false);

// 4. 삭제·복구
r = post({ action: 'delete', code, table: 'schedule', id: s1.id, by: '지니' });
assert.strictEqual(r.row.deleted, true);
assert.strictEqual(get({ action: 'load', code }).schedule[0].deleted, true);
r = post({ action: 'restore', code, table: 'schedule', id: s1.id, by: '친구1' });
assert.strictEqual(r.row.deleted, false);

// 5. 체크 리스트: '각자' 일은 멤버별로
const members = get({ action: 'load', code }).members;
r = post({ action: 'save', code, table: 'checklist', row: { title: '여권 챙기기', group: '짐 꾸리기', assignee: '각자' } });
const c1 = r.row.id;
post({ action: 'toggle_done', code, id: c1, memberId: members[0].id, done: true });
r = post({ action: 'toggle_done', code, id: c1, memberId: members[1].id, done: true });
assert.strictEqual(r.row.doneBy, members[0].id + ',' + members[1].id);
r = post({ action: 'toggle_done', code, id: c1, memberId: members[0].id, done: false });
assert.strictEqual(r.row.doneBy, members[1].id);

// 6. 순서 편집
const s2 = post({ action: 'save', code, table: 'schedule', row: { day: 1, placeName: 'B' } }).row;
const s3 = post({ action: 'save', code, table: 'schedule', row: { day: 1, placeName: 'C' } }).row;
post({ action: 'reorder', code, table: 'schedule', ids: [s3.id, s2.id], day: 1 });
const sch = get({ action: 'load', code }).schedule.filter((x) => x.day == 1);
assert.deepStrictEqual(sch.map((x) => x.placeName), ['C', 'B']);

// 7. 날짜를 2일로 줄이면 Day 3 일정이 Day 2로
const trip = get({ action: 'load', code }).trip;
r = post({ action: 'save', code, table: 'trips', row: { endDate: '2026-12-20' }, baseUpdatedAt: trip.updatedAt });
assert.ok(r.ok, JSON.stringify(r));
assert.strictEqual(r.movedSchedule, 1);
assert.strictEqual(get({ action: 'load', code }).schedule.find((x) => x.id === s1.id).day, 2);
assert.strictEqual(post({ action: 'save', code, table: 'trips', row: { endDate: '2026-01-01' }, force: true }).error, 'invalid');

// 8. PC에서 id 없이 직접 넣은 줄 → id 자동
const ps = sheets['장소'];
const row = ps.data[0].map(() => '');
row[ps.data[0].indexOf('여행id')] = trip.id;
row[ps.data[0].indexOf('장소이름')] = 'PC에서 쓴 식당';
ps.data[1] = row;
const places = get({ action: 'load', code }).places;
assert.strictEqual(places[0].name, 'PC에서 쓴 식당');
assert.ok(places[0].id.startsWith('p_'));

// 9. 새 여행, 사진, 수식 막기
r = post({ action: 'create_trip', trip: { title: '제주', startDate: '2027-01-01', endDate: '2027-01-02' }, members: [{ name: 'A', isOwner: true }], by: 'A' });
assert.ok(r.ok && r.trip.inviteCode && r.members[0].isOwner === true);
r = post({ action: 'upload', code, mimeType: 'image/jpeg', data: 'data:image/jpeg;base64,' + Buffer.from('abc').toString('base64') });
assert.ok(r.url.includes('thumbnail?id=FILE1'));
assert.strictEqual(post({ action: 'upload', code, mimeType: 'text/html', data: 'eA==' }).error, 'invalid');
const memoCell = sheets['일정'].data.find((x) => x.includes(s1.id));
assert.ok(!sheets['일정'].data.flat().includes('=HACK()'));

// 10. 공백 붙은 초대코드도 찾음, 새 줄은 위에서부터 차곡차곡
assert.ok(get({ action: 'load', code: ' ' + code + ' ' }).ok);
assert.strictEqual(sheets['일정'].data[1][0], s1.id);
assert.strictEqual(sheets['멤버'].data[2][2], '친구1');

console.log('모든 테스트 통과 ✓');
