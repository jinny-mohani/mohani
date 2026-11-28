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
    { id: 'r_1', tripId: 't_1', type: '항공권', title: '제주항공 7C1301', direction: '가는 편', fromAirport: 'ICN 인천', toAirport: 'KIX 오사카 간사이', fromTerminal: 'T1', toTerminal: 'T1', startAt: '2026-12-19T08:30', endAt: '2026-12-19T10:20', aircraft: 'B737-800', seat: '이코노미', bookingNo: 'AB12CD', assignee: 'm_1', vendor: '제주항공 앱', memo: '수하물 15kg 포함, 출발 2시간 전 도착', status: '예약 완료', order: 1, ...base },
    { id: 'r_2', tripId: 't_1', type: '숙소', title: '난바 오리엔탈 호텔', startAt: '2026-12-19T15:00', endAt: '2026-12-21T11:00', address: '오사카 주오구 난바 1-2', mapUrl: 'https://maps.app.goo.gl/x', roomType: '디럭스 더블', roomSize: '32㎡', checkInTime: '15:00', memo: '주차 가능, 바비큐는 하루 전 신청. 체크인 전에도 짐 보관이 가능하니 도착하면 먼저 맡기기', status: '예약 완료', assignee: 'm_2', order: 2, ...base },
    { id: 'r_3', tripId: 't_1', type: '기타', subType: '렌터카', title: '렌터카', startAt: '2026-12-19T10:00', endAt: '2026-12-21T17:00', address: '간사이공항 픽업', assignee: 'm_2', memo: '아직 예약 전이에요', status: '예약 전', order: 3, ...base },
    { id: 'r_4', tripId: 't_1', type: '기타', subType: '스노클링', title: '협재 스노클링', startAt: '2026-12-20T09:00', status: '보류', order: 4, ...base },
    { id: 'r_5', tripId: 't_1', type: '항공권', title: '제주항공 7C1302', direction: '오는 편', fromAirport: 'KIX 오사카 간사이', toAirport: 'ICN 인천', fromTerminal: 'T1', toTerminal: 'T1', startAt: '2026-12-21T18:40', endAt: '2026-12-21T20:35', seat: '이코노미', assignee: 'm_2', memo: '특가 뜨면 바로 예약하기', status: '예약 전', order: 5, ...base },
  ],
  checklist: [
    { id: 'c_1', tripId: 't_1', title: '렌터카 예약 확인', group: '여행 전 할 일', assignee: 'm_2', doneBy: '', order: 1, ...base },
    { id: 'c_2', tripId: 't_1', title: '여행자 보험 가입', group: '여행 전 할 일', assignee: '각자', doneBy: '', order: 2, ...base },
    { id: 'c_3', tripId: 't_1', title: '비행기 예약', group: '여행 전 할 일', assignee: 'm_1', doneBy: 'm_1', order: 3, ...base },
    { id: 'c_4', tripId: 't_1', title: '환전하기', group: '짐 꾸리기', assignee: '각자', doneBy: '', order: 4, ...base },
    { id: 'c_5', tripId: 't_1', title: '카메라', group: '짐 꾸리기', assignee: 'm_1', doneBy: 'm_1', order: 5, ...base },
    { id: 'c_6', tripId: 't_1', title: '보조 배터리', group: '짐 꾸리기', assignee: '각자', doneBy: '', order: 6, ...base },
    { id: 'c_8', tripId: 't_1', title: '원피스 3벌', group: '개인 짐', assignee: 'm_1', doneBy: '', order: 8, ...base },
    { id: 'c_9', tripId: 't_1', title: '고데기', group: '개인 짐', assignee: 'm_2', doneBy: '', order: 9, ...base },
    { id: 'c_10', tripId: 't_1', title: '유심 사기', group: '개인 할 일', assignee: 'm_2', doneBy: '', order: 10, ...base },
    { id: 'c_7', tripId: 't_1', title: '유심 사기', group: '짐 꾸리기', assignee: '각자', doneBy: '', order: 7, ...base, deleted: true, deletedBy: '친구1', deletedAt: '2026-11-15T10:00:00.000Z' },
  ],
  places: [
    { id: 'p_1', tripId: 't_1', category: '음식점', name: '이치란 라멘 도톤보리', hours: '10:00 – 22:00', breakTime: '15:00 – 17:00', waiting: '있음', address: '오사카 주오구 도톤보리 7-18, 2층', mapUrl: 'https://maps.app.goo.gl/y', memo: '웨이팅 있음, 오픈 시간에 맞춰 가기', subtitle: '一蘭 道頓堀店', phone: '06-6212-1805', parking: '근처 유료 주차장 이용', photos: 'images/flight/departure.jpg,images/flight/return.jpg', order: 1, ...base },
    { id: 'p_3', tripId: 't_1', category: '음식점', name: '쿠시카츠 다루마', hours: '11:00 – 22:30', memo: '소스 두 번 찍기 금지', order: 3, ...base },
    { id: 'p_4', tripId: 't_1', category: '디저트', name: '릭로 아저씨 치즈케이크', hours: '09:00 – 20:00', order: 4, ...base },
    { id: 'p_2', tripId: 't_1', category: '즐길거리', name: '오사카성', order: 2, ...base, deleted: true, deletedBy: '지니', deletedAt: '2026-11-14T10:00:00.000Z' },
  ],
  schedule: [
    { id: 's_1', tripId: 't_1', day: 1, time: '12:00', placeId: 'p_1', placeName: '', transport: '도보', order: 1, ...base },
    { id: 's_2', tripId: 't_1', day: 1, time: '16:00', placeId: '', placeName: '호텔 체크인', transport: '도보', memo: '짐 먼저 맡기기', order: 2, ...base },
    { id: 's_3', tripId: 't_1', day: 1, time: '19:00', placeId: 'p_3', placeName: '', transport: '지하철', order: 3, ...base },
  ],
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 360, height: 760 }, serviceWorkers: 'block' });
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('showGuide')) localStorage.setItem('hg.installGuide', '1'); } catch (e) {} }); // S-2 안내는 따로 확인
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => m.type() === 'error' && !/fonts\.g/.test(m.text()) && errors.push('console: ' + m.text()));
  // 외부 글꼴은 이 환경에서 받지 않음 (기본 글꼴로 대신 보임)
  await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  let offline = false;
  const posts = [];
  await page.route('https://script.google.com/**', async (route) => {
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
      if (body.action === 'upload') {
        await new Promise((r) => setTimeout(r, 1500)); // 느린 업로드 흉내
        return route.fulfill({ json: { ok: true, url: 'images/flight/return.jpg?up=' + posts.length } });
      }
      if (body.action === 'toggle_done' && global.failToggle) return route.abort();
      if (body.action === 'toggle_done' || body.action === 'restore' || body.action === 'delete' || body.action === 'reorder') {
        return route.fulfill({ json: { ok: true, row: {} } });
      }
      if (body.action === 'save' && body.table === 'reservations' && body.row.id === 'r_2' && !body.force && !global.conflicted) {
        global.conflicted = true;
        return route.fulfill({ json: { ok: false, error: 'conflict', message: '친구1님이 먼저 수정했어요.', current: { ...data.reservations[1], updatedBy: '친구1' } } });
      }
      if (body.action === 'save' && body.table === 'reservations') {
        const row = { ...(data.reservations.find((r) => r.id === body.row.id) || {}), ...body.row, id: body.row.id || 'r_new', tripId: 't_1', ...base, updatedAt: new Date().toISOString() };
        return route.fulfill({ json: { ok: true, row } });
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
  // 달력 시트에서 날짜 고르기
  const pickDate = async (label, day) => {
    await page.click(`[aria-label="${label}"]`); await page.waitForSelector('.cal');
    await page.click(`.cal__d >> text="${day}"`); await page.click('.sheet__foot >> text=선택 완료'); await page.waitForTimeout(150);
  };
  // 기간 달력: 시작·끝을 차례로
  // (11.22 전체 화면 달력: 이미 고른 날이 있는 달, 없으면 첫 달에서 고름)
  const pickRange = async (label, d1, d2) => {
    await page.click(`[aria-label="${label}"]`); await page.waitForSelector('.rcal__list');
    const month = async () => ((await page.$('.rcal__month:has(.rcal__d--on)')) ? '.rcal__month:has(.rcal__d--on)' : '.rcal__month >> nth=0');
    await page.click(`${await month()} >> .rcal__n >> text="${d1}"`);
    await page.click(`${await month()} >> .rcal__n >> text="${d2}"`);
    await page.click('.modal--cal .modal__foot >> text=선택 완료'); await page.waitForTimeout(150);
  };
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
  await pickRange('여행 날짜', 24, 26);
  await page.fill('input[placeholder="예) 지니"]', '지니');
  await page.click('[aria-label="멤버 추가"]'); await page.waitForSelector('.layer:nth-of-type(2) .modal');
  await page.fill('.layer:last-of-type input[placeholder="예) 도윤"]', '수아');
  await page.fill('.layer:last-of-type input[placeholder="예) 지니의 사촌"]', '대학 동기');
  await shot('13-2-member-sheet');
  await page.click('.layer:last-of-type .modal__foot >> text=추가하기'); await page.waitForTimeout(300);
  console.log('member popup closed, trip modal kept:', (await page.$$('.modal')).length === 1);
  await shot('13-new-trip');
  await page.click('text=만들고 초대 링크 받기'); await page.waitForSelector('.done-hero'); await shot('13-1-created');
  console.log('create_trip members:', JSON.stringify(posts.find((p) => p.action === 'create_trip').members.map((m) => m.name + (m.isOwner ? '*' : ''))));
  await page.click('text=나중에 보내기'); await page.waitForTimeout(600); await shot('02-1-invite-sheet');
  console.log('after later url:', page.url(), 'sheet:', !!(await page.$('.sheet')));
  await page.click('[aria-label="닫기"]'); await page.waitForTimeout(300); await shot('02-trips');
  // 다른 여행(초대받은 여행)으로: 01 프로필 선택
  await page.goto(B + '?t=CODE'); await page.waitForSelector('.member-grid'); await shot('01-profile');
  await page.click('.member-card >> nth=1'); await shot('01-1-selected');
  await page.click('text=입장하기'); await page.waitForSelector('.home-hero'); await shot('03-home');
  { // 03 홈 예약 카드: 펼치기 · 옆으로 넘기기 (11.28)
    await page.evaluate(() => document.querySelector('.tk').scrollIntoView({ block: 'start' }));
    await page.click('.tk >> nth=0'); await page.waitForTimeout(400); await shot('03-1-home-ticket-open');
    const open = await page.$$eval('.tk', (els) => els.map((e) => e.classList.contains('tk--open')));
    await page.click('.tk__more >> nth=0'); await page.waitForTimeout(350);
    await page.$eval('.tk-row', (el) => (el.scrollLeft = 400)); await page.waitForTimeout(400); await shot('03-2-home-ticket-swipe');
    console.log('home tickets open:', open, '| dots:', await page.$$eval('.tk-dots:not(.hc-dots) i', (d) => d.map((x) => x.className).join(',')));
    await page.evaluate(() => document.querySelector('.home-etc').scrollIntoView({ block: 'center' })); await page.waitForTimeout(200); await shot('03-5-home-etc');
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  await page.click('.check-row >> nth=0'); await page.waitForTimeout(200);
  console.log('toggle posted:', JSON.stringify(posts.filter((p) => p.action === 'toggle_done').map((p) => [p.id, p.done])));
  console.log('left text:', await page.textContent('.home-section__head >> nth=1'));
  await page.click('.home-members button >> nth=1'); await shot('03-8-friend');
  await page.click('.dialog [aria-label="닫기"]'); await page.waitForTimeout(200);
  await page.click('[aria-label="여행 설정"]'); await page.waitForSelector('.modal');
  await pickRange('여행 날짜', 19, 20); await shot('03-4-settings');
  await page.click('text=최근 삭제한 항목'); await page.waitForTimeout(500); await shot('03-7-deleted');
  console.log('deleted url:', page.url(), 'items:', await page.$$eval('.deleted-row', (r) => r.length));
  await page.click('.pill-btn >> nth=0'); await page.waitForTimeout(300);
  console.log('after restore items:', await page.$$eval('.deleted-row', (r) => r.length));
  await page.click('[aria-label="뒤로"]'); await page.waitForSelector('.home-hero');
  console.log('url after join:', page.url());
  await page.click('.tabbar >> text=예약'); await page.waitForSelector('.chips'); await shot('05-all'); console.log('tab→body gap:', await page.evaluate(() => { const c=[...document.querySelectorAll('.chip')].pop().getBoundingClientRect(); const h=document.querySelector('.all-group__head').getBoundingClientRect(); return Math.round(h.top - c.bottom); }));
  for (const [t, n] of [['항공권', '05-1-flight'], ['숙소', '05-2-stay'], ['기타', '05-3-other']]) {
    await page.click('.chips >> text=' + t); await page.waitForTimeout(300); await shot(n);
  }
  await page.click('.chips >> text=전체'); await page.waitForTimeout(200);
  await page.click('[aria-label="예약 추가"]'); await shot('07-0-sheet');
  await page.click('.sheet >> text=항공권'); await page.waitForSelector('.modal');
  await page.click('[aria-label="항공사"]'); await page.waitForSelector('.opt-list'); await shot('07-1-airline-picker');
  await page.click('.opt >> text=대한항공'); await page.waitForTimeout(200);
  await page.fill('[aria-label="편명 숫자"]', '724');
  await page.click('[aria-label="출발 공항"]'); await page.fill('.sheet input[aria-label="검색"]', 'kix'); await shot('07-1-airport-picker'); await page.click('.opt >> nth=0');
  await page.click('[aria-label="도착 공항"]'); await page.click('.sheet >> text=인천');
  await pickDate('날짜', 26); await shot('07-1-flight-form-top');
  await page.click('text=펼치기'); await page.waitForTimeout(100); await shot('07-1-1-flight-form');
  await page.click('.modal >> text=저장하기'); await page.waitForTimeout(400);
  const saved = posts.filter((p) => p.action === 'save' && p.table === 'reservations').pop();
  console.log('flight saved:', JSON.stringify({ title: saved.row.title, from: saved.row.fromAirport, dir: saved.row.direction, assignee: saved.row.assignee }));
  console.log('modal closed:', !(await page.$('.modal')));
  // 상세 → 상태 바꾸기 → 수정(충돌) → 삭제/되돌리기
  await page.goto(B + '?t=CODE#/reservations/r_2'); await page.waitForSelector('.place-detail'); await shot('05-4-stay-detail');
  await page.goto(B + '?t=CODE#/reservations/r_1'); await page.waitForSelector('.detail'); await shot('05-5-flight-detail');
  await page.goto(B + '?t=CODE#/reservations/r_3'); await page.waitForSelector('.place-detail'); await shot('05-6-other-detail');
  await page.click('.place-detail__sub .status'); await page.waitForSelector('.sheet'); await page.click('.sheet >> text=예약 완료'); await page.waitForTimeout(400);
  console.log('status saved:', JSON.stringify(posts.filter((p) => p.action === 'save').pop().row));
  await page.goto(B + '?t=CODE#/reservations/r_2'); await page.waitForSelector('.place-detail');
  await page.click('[aria-label="더 보기"]'); await page.click('.sheet >> text=수정'); await page.waitForSelector('.modal'); await shot('07-2-stay-edit');
  await page.click('.modal >> text=저장하기'); await page.waitForSelector('.conflict'); await shot('12-conflict');
  await page.click('text=내 글로 바꾸기'); await page.waitForTimeout(500);
  console.log('forced save:', posts.filter((p) => p.action === 'save').pop().force === true, 'modal closed:', !(await page.$('.modal')));
  await page.click('[aria-label="더 보기"]'); await page.click('.sheet >> text=삭제'); await page.waitForTimeout(500);
  console.log('after delete url:', page.url(), 'toast:', await page.textContent('.toast').catch(() => null));
  await page.click('.toast__action'); await page.waitForTimeout(300);
  console.log('restore posted:', posts.some((p) => p.action === 'restore' && p.id === 'r_2'));
  await page.goto(B + '?t=CODE#/reservations'); await page.waitForSelector('.chips');
  await page.click('.chips >> text=기타'); await page.click('[aria-label="예약 추가"]'); await page.waitForSelector('.modal');
  await page.click('.modal >> text=직접 입력'); await page.waitForTimeout(100); await shot('07-3-1-other-custom');
  console.log('custom chips:', await page.$$eval('.modal .chips >> nth=0', () => 0).catch(() => ''), await page.$$eval('.modal [role=radiogroup] >> nth=0', (g) => g.map((x) => x.textContent)));
  await page.click('[aria-label="날짜 시간"]'); await page.waitForSelector('.period-tabs'); await shot('07-3-2-period');
  await page.click('.date-days >> text=Day 2'); await page.click('.period-times >> text=오전 10시 30분'); await page.waitForTimeout(150); await shot('07-3-3-period-end');
  await page.click('.period-times >> text=오후 4시'); await page.waitForTimeout(250);
  console.log('period picked:', await page.textContent('[aria-label="날짜 시간"]'), '| closed:', !(await page.$('.period-tabs')));
  await page.click('[aria-label="닫기"]'); await page.waitForTimeout(200);
  await page.click('.tabbar >> text=일정'); await page.waitForSelector('.timeline'); await shot('08-schedule');
  console.log('timeline:', JSON.stringify(await page.$$eval('.tl', (r) => r.map((x) => x.textContent.replace(/\s+/g, ' ').trim().slice(0, 24)))));
  await page.click('text=순서 편집'); await shot('08-4-reorder');
  const h = await page.$$('.reorder__handle'); const b0 = await h[0].boundingBox(); const b2 = await h[2].boundingBox();
  await page.mouse.move(b0.x + 20, b0.y + 20); await page.mouse.down(); await page.mouse.move(b2.x + 20, b2.y + 40, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(300);
  console.log('reorder posted:', JSON.stringify((posts.filter((p) => p.action === 'reorder').pop() || {}).ids));
  await page.click('text=완료');
  await page.click('[aria-label="일정 추가"]'); await page.waitForSelector('.modal'); await shot('08-1-schedule-form');
  await shot('08-1-schedule-form-kinds');
  await page.click('.pick-kinds >> text=숙소'); await page.waitForSelector('.sheet'); await shot('08-2-1-stay-picker');
  await page.click('.sheet .pick-row >> nth=0'); await page.click('text=선택 완료'); await page.waitForTimeout(200);
  console.log('picked stay shown:', await page.textContent('.place-pick__text b'));
  await page.click('.place-pick__change'); await page.waitForSelector('.sheet'); await page.click('[aria-label="닫기"] >> nth=-1'); await page.waitForTimeout(200);
  await page.fill('[aria-label="장소 직접 입력"]', 'x'); await page.fill('[aria-label="장소 직접 입력"]', ''); await page.waitForTimeout(100);
  await page.click('.pick-kinds >> text=장소'); await page.waitForSelector('.sheet'); await page.click('.sheet >> text=쿠시카츠 다루마'); await shot('08-2-place-picker');
  await page.click('text=선택 완료'); await page.waitForTimeout(200);
  console.log('picked place shown:', await page.textContent('.place-pick__text b'));
  await page.click('.modal >> text=저장하기'); await page.waitForTimeout(400);
  console.log('schedule saved:', JSON.stringify(posts.filter((p) => p.action === 'save' && p.table === 'schedule').pop().row));
  await page.click('.tabbar >> text=장소'); await page.waitForTimeout(300); await shot('09-places');
  await page.click('.place-group .home-section__head >> nth=0'); await page.waitForTimeout(300); await shot('09-2-category');
  await page.click('.place-line .all-row__main >> nth=0'); await page.waitForSelector('.place-detail'); await shot('10-place-detail');
  await page.evaluate(() => { document.getElementById('app').scrollTop = 220; }); await page.waitForTimeout(250); await shot('10-place-detail-scroll');
  await page.evaluate(() => { document.getElementById('app').scrollTop = 0; }); await page.waitForTimeout(150);
  const src0 = await page.getAttribute('.place-detail__heroimg img', 'src');
  await page.click('.place-detail__thumbs button >> nth=1'); await page.waitForTimeout(200); await shot('10-place-detail-thumb2');
  console.log('thumb switches hero:', src0 !== await page.getAttribute('.place-detail__heroimg img', 'src'), '| pressed:', await page.getAttribute('.place-detail__thumbs button >> nth=1', 'aria-pressed'));
  { const hb = await page.$('.place-detail__heroimg').then((e) => e.boundingBox()); const before = await page.getAttribute('.place-detail__heroimg img', 'src');
    await page.mouse.move(hb.x + 260, hb.y + 150); await page.mouse.down(); await page.mouse.move(hb.x + 80, hb.y + 155, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(200);
    console.log('swipe changes hero:', before !== await page.getAttribute('.place-detail__heroimg img', 'src'), '| viewer opened by swipe:', !!(await page.$('.viewer'))); }
  await page.click('.place-detail__heroimg'); await page.waitForSelector('.viewer'); await shot('10-viewer'); console.log('viewer:', await page.textContent('.viewer__count')); await page.click('.viewer__close'); await page.waitForTimeout(200); await page.click('[aria-label="더 보기"]'); await shot('10-menu'); await page.click('.sheet >> text=수정'); await page.waitForSelector('.modal'); await shot('09-1-place-form');
  await page.click('[aria-label="운영시간"]'); await page.waitForSelector('.hours-col'); await shot('09-3-hours');
  await page.click('.hours-col >> nth=0 >> text=오전 11시 30분'); await page.click('.hours-col >> nth=1 >> text=오후 9시'); await page.waitForTimeout(300);
  console.log('hours picked:', await page.textContent('[aria-label="운영시간"]'), '| sheet closed:', !(await page.$('.hours-col')));
  await page.click('[aria-label="닫기"]'); await page.waitForTimeout(200);
  // 사진 있는 장소 등록: 저장 누르면 바로 닫히고, 사진은 뒤에서 올라가요
  await page.goto(B + '?t=CODE#/places'); await page.waitForSelector('.chips');
  await page.click('[aria-label="장소 등록"]'); await page.waitForSelector('.modal');
  await page.fill('input[placeholder="예) 자매국수"]', '사진 테스트 카페');
  await page.setInputFiles('.modal input[type=file]', 'icons/icon-512.png'); await page.waitForTimeout(300);
  const t0 = Date.now(); await page.click('.modal >> text=저장하기'); await page.waitForSelector('.modal', { state: 'detached' });
  console.log('place form closed in ms:', Date.now() - t0, '| preview shown:', await page.$eval('.place-tile >> text=사진 테스트 카페', () => true).catch(() => false));
  await page.waitForTimeout(2500);
  const ps = posts.filter((p) => p.action === 'save' && p.table === 'places').pop();
  console.log('place saved photos:', ps && ps.row.photos, '| toast:', await page.textContent('.toast').catch(() => ''));
  await page.goto(B + '?t=CODE#/friends'); await page.waitForSelector('.friends'); await shot('11-friends');
  await page.click('[aria-label="내 프로필 수정"]'); await page.waitForSelector('.modal'); await shot('11-1-profile');
  await page.click('[aria-label="프로필 사진 바꾸기"]'); await page.waitForSelector('.char-grid'); await shot('11-2-picker');
  console.log('taken chars:', await page.$$eval('.char--taken', (r) => r.length));
  await page.goto(B + '?t=CODE#/home/checklist'); await page.waitForSelector('.cl-group');
  global.failToggle = true; await page.click('.cl-row__check >> nth=0'); await page.waitForTimeout(500); await shot('S-5-save-fail');
  console.log('fail marker:', !!(await page.$('.save-fail')));
  global.failToggle = false;
  await page.click('[aria-label="체크 리스트 추가"]'); await page.waitForSelector('.sheet'); await shot('03-6-checklist-add');
  await page.click('[aria-label="닫기"]'); await page.waitForTimeout(200);
  await page.click('.cl-row__body >> nth=1'); await page.waitForSelector('.sheet'); await shot('03-6-1-checklist-edit');
  await page.click('.sheet >> text=삭제'); await page.waitForTimeout(400); await shot('03-3-1-undo');
  // 11.22 개인 탭: 내가 쓴 개인 항목만
  await page.goto(B + '?t=CODE#/home/checklist?tab=mine'); await page.waitForSelector('.cl-note'); await shot('03-3-2-mine');
  console.log('mine tab:', await page.$$eval('.cl-row__title', (r) => r.map((x) => x.textContent.trim())));
  await page.click('[aria-label="체크 리스트 추가"]'); await page.waitForSelector('.sheet'); await shot('03-6-2-mine-add');
  await page.fill('.sheet input[maxlength="40"]', '선크림'); await page.click('.sheet >> text=저장하기'); await page.waitForTimeout(500);
  console.log('mine saved:', JSON.stringify(posts.filter((p) => p.action === 'save' && p.table === 'checklist').pop().row));
  await page.goto(B + '?t=CODE#/home'); await page.waitForSelector('.hc-row'); await page.evaluate(() => document.querySelector('.hc-row').scrollIntoView({ block: 'center' })); await shot('03-home-checklist'); await page.evaluate(() => document.querySelector('.home .place-tiles').scrollIntoView({ block: 'center' })); await page.waitForTimeout(150); await shot('03-9-home-places');
  { // 11.28: 체크해도 순서 그대로, 카드 키 같음, 더 보기
    const before = await page.$$eval('.hc-card >> nth=0', () => 0).catch(() => 0);
    const titles = async () => page.$$eval('.hc-card:first-child .check-row__label', (e) => e.map((x) => x.textContent));
    const t1 = await titles(); await page.click('.hc-card:first-child .check-row >> nth=0'); await page.waitForTimeout(300); const t2 = await titles();
    console.log('home check order kept:', JSON.stringify(t1) === JSON.stringify(t2), '| card heights:', await page.$$eval('.hc-card', (c) => c.map((x) => Math.round(x.getBoundingClientRect().height))), '| more:', await page.$$eval('.hc-more', (m) => m.map((x) => x.textContent.trim())));
  }
  await page.evaluate(() => { sessionStorage.setItem('showGuide', '1'); localStorage.removeItem('hg.installGuide'); });
  await page.goto(B + '?t=CODE#/home'); await page.reload(); await page.waitForTimeout(1500); await shot('S-2-install');
  console.log('install guide:', !!(await page.$('.guide-steps')));
  await page.click('text=다음에 할게요');

  await page.goto(B + '#/home'); await page.waitForSelector('.home-hero');
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
