// 화면 점검 (가짜 시트 데이터 사용). 실행:
//   python3 -m http.server 8123 --bind 127.0.0.1 &
//   node tests/screens.js 저장할폴더
const { chromium } = require('playwright');
const OUT = process.argv[2];
const now = '2026-11-15T16:14:27.523Z';
const base = { updatedBy: '지니', updatedAt: now, deleted: false, deletedBy: '', deletedAt: '' };
const data = {
  ok: true, serverTime: now,
  trip: { id: 't_1', title: '샘플 여행', startDate: '2026-12-19', endDate: '2026-12-21', destination: '오사카', coverImage: '', inviteCode: 'CODE', createdBy: '지니', ...base },
  members: [
    { id: 'm_1', tripId: 't_1', name: '지니', relation: '나', intro: '', isOwner: true, profile: '1', order: 1, ...base },
    { id: 'm_2', tripId: 't_1', name: '친구1', relation: '대학 친구', intro: '', isOwner: false, profile: '2', order: 2, ...base },
  ],
  reservations: [
    { id: 'r_1', tripId: 't_1', type: '항공권', title: '제주항공 7C1301', startAt: '2026-12-19T09:10', status: '예약 완료', order: 1, ...base },
    { id: 'r_2', tripId: 't_1', type: '숙소', title: '난바 오리엔탈 호텔', startAt: '2026-12-19T15:00', address: '오사카 주오구 난바 1-2', status: '예약 전', order: 2, ...base },
  ],
  checklist: [{ id: 'c_1', tripId: 't_1', title: '여권 챙기기', group: '짐 꾸리기', assignee: '각자', doneBy: '', order: 1, ...base }],
  places: [{ id: 'p_1', tripId: 't_1', category: '음식점', name: '이치란 라멘 도톤보리', hours: '10:00–22:00', address: '도톤보리 7-18', order: 1, ...base }],
  schedule: [
    { id: 's_1', tripId: 't_1', day: 1, time: '12:00', placeId: 'p_1', placeName: '', transport: '도보', order: 1, ...base },
    { id: 's_2', tripId: 't_1', day: 1, time: '', placeId: '', placeName: '호텔 체크인', transport: '', order: 2, ...base },
  ],
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 360, height: 760 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => m.type() === 'error' && !/fonts\.g/.test(m.text()) && errors.push('console: ' + m.text()));
  // 외부 글꼴은 이 환경에서 받지 않음 (기본 글꼴로 대신 보임)
  await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  let offline = false;
  const posts = [];
  await page.route('https://script.google.com/**', (route) => {
    if (offline) return route.abort();
    const req = route.request();
    if (req.method() === 'POST') {
      const body = JSON.parse(req.postData());
      posts.push(body);
      if (body.action === 'create_trip') {
        const trip = { ...body.trip, id: 't_new', inviteCode: 'NEWCODE', createdBy: body.by, ...base };
        const members = body.members.map((m, i) => ({ ...m, id: 'm_n' + i, tripId: 't_new', order: i + 1, ...base }));
        return route.fulfill({ json: { ok: true, trip, members } });
      }
      if (body.action === 'save') {
        const row = { ...body.row, id: body.row.id || 'm_added', tripId: 't_1', ...base };
        if (body.table === 'members') data.members.push(row);
        return route.fulfill({ json: { ok: true, row, created: true } });
      }
      return route.fulfill({ json: { ok: true } });
    }
    const u = new URL(req.url());
    if (u.searchParams.get('action') === 'trips') {
      return route.fulfill({ json: { ok: true, trips: [{ trip: data.trip, members: data.members }], missing: [] } });
    }
    if (u.searchParams.get('code') !== 'CODE') {
      return route.fulfill({ json: { ok: false, error: 'trip_not_found', message: '여행을 찾을 수 없어요.' } });
    }
    route.fulfill({ json: data });
  });
  const B = 'http://127.0.0.1:8123/';
  const shot = async (n) => {
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/${n}.png` });
  };

  await page.goto(B); await shot('00-start');
  // 13 새 여행 만들기
  await page.click('text=새 여행 만들기'); await page.waitForSelector('.modal');
  await page.click('text=만들고 초대 링크 받기'); await page.waitForTimeout(200);
  console.log('validation:', await page.textContent('.form__error'));
  await page.fill('input[placeholder="예) 제주 우정여행"]', '부산 먹방여행');
  await page.fill('input[aria-label="출발일"]', '2026-12-24');
  await page.fill('input[aria-label="도착일"]', '2026-12-26');
  await page.fill('input[placeholder="예) 지니"]', '지니');
  await page.click('[aria-label="멤버 추가"]'); await page.waitForSelector('.sheet');
  await page.fill('.sheet input[placeholder="예) 도윤"]', '수아');
  await page.fill('.sheet input[placeholder="예) 지니의 사촌"]', '대학 동기');
  await shot('13-2-member-sheet');
  await page.click('.sheet >> text=추가하기'); await page.waitForTimeout(300);
  console.log('sheet closed, modal kept:', !(await page.$('.sheet')), !!(await page.$('.modal')));
  await shot('13-new-trip');
  await page.click('text=만들고 초대 링크 받기'); await page.waitForSelector('.done-hero'); await shot('13-1-created');
  console.log('create_trip members:', JSON.stringify(posts.find((p) => p.action === 'create_trip').members.map((m) => m.name + (m.isOwner ? '*' : ''))));
  await page.click('text=나중에 보내기'); await page.waitForTimeout(600); await shot('02-1-invite-sheet');
  console.log('after later url:', page.url(), 'sheet:', !!(await page.$('.sheet')));
  await page.click('[aria-label="닫기"]'); await page.waitForTimeout(300); await shot('02-trips');
  // 다른 여행(초대받은 여행)으로: 01 프로필 선택
  await page.goto(B + '?t=CODE'); await page.waitForSelector('.member-grid'); await shot('01-profile');
  await page.click('.member-card >> nth=1'); await shot('01-1-selected');
  await page.click('text=입장하기'); await page.waitForSelector('.hero'); await shot('03-home');
  console.log('url after join:', page.url());
  await page.click('.tabbar >> text=예약'); await page.waitForSelector('.chips'); await shot('05-reservations');
  await page.click('[aria-label="예약 추가"]'); await shot('07-0-sheet');
  await page.click('.sheet >> text=항공권'); await shot('07-1-modal');
  await page.goBack(); await page.waitForTimeout(300);
  console.log('modal closed by back:', !(await page.$('.modal')), 'url:', page.url());
  await page.click('text=난바 오리엔탈 호텔'); await shot('05-4-detail');
  console.log('tabbar hidden on detail:', !(await page.$('.tabbar')));
  await page.click('[aria-label="뒤로"]'); await page.waitForSelector('.tabbar');
  console.log('back to list:', page.url());
  await page.click('.chips >> text=숙소'); await page.waitForTimeout(200);
  console.log('chip url:', page.url(), 'rows:', await page.$$eval('.row', (r) => r.length));
  await page.click('.tabbar >> text=일정'); await shot('08-schedule');
  await page.click('.tabbar >> text=장소'); await shot('09-places');
  await page.click('.tabbar >> text=친구들'); await shot('11-friends');
  await page.goto(B + '#/home'); await page.waitForSelector('.hero');
  console.log('reopen keeps code:', page.url());
  offline = true; await page.reload(); await page.waitForSelector('.banner'); await shot('S-3-offline');
  offline = false;
  await page.goto(B + '?t=WRONG'); await page.waitForTimeout(800); await shot('trip-not-found');
  await page.goto(B + '?t=CODE#/reservations'); await page.waitForSelector('.chips');
  const small = await page.$$eval('button, a', (els) => els
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.width < 44 || r.height < 40); })
    .map((e) => (e.className || e.tagName) + ':' + e.textContent.trim().slice(0, 10) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height)));
  console.log('small targets:', small);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  console.log('horizontal overflow:', overflow);
  // 칩 스크롤: 처음 왼쪽 여백 20px, 스크롤 영역은 화면 끝까지
  await page.goto(B + '?t=CODE#/places'); await page.waitForSelector('.chips');
  console.log('chips box:', await page.$eval('.chips', (c) => { const r = c.getBoundingClientRect(); return [r.left, r.right, c.firstChild.getBoundingClientRect().left]; }));
  console.log('errors:', errors);
  await browser.close();
})();
