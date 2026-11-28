// 서비스 워커: 앱 파일을 휴대폰에 저장해 두어, 인터넷이 약해도 앱이 열리게 해요.
// 시트 데이터는 여기서 다루지 않고 앱이 따로 저장해요 (src/store.js).
// 앱 파일을 바꾸면 VERSION을 올려 주세요. (네트워크 우선이라 안 올려도 새 파일을 받지만, 옛 캐시 정리용)
const VERSION = 'v3-48';
const CACHE = 'hamkke-' + VERSION;
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/favicon-32.png',
  'images/characters/1.png',
  'images/characters/2.png',
  'images/characters/3.png',
  'images/characters/4.png',
  'images/characters/5.png',
  'images/characters/6.png',
  'images/flight/departure.jpg',
  'images/flight/return.jpg',
  'src/main.js',
  'src/config.js',
  'src/api.js',
  'src/store.js',
  'src/router.js',
  'src/overlay.js',
  'src/date.js',
  'src/share.js',
  'src/image.js',
  'src/members.js',
  'src/ui/toast.js',
  'src/screens/profile.js',
  'src/screens/trips.js',
  'src/screens/newtrip.js',
  'src/screens/member-add.js',
  'src/screens/trip-settings.js',
  'src/screens/deleted.js',
  'src/screens/checklist.js',
  'src/screens/install-guide.js',
  'src/checklist.js',
  'src/save.js',
  'src/airports.js',
  'src/ui/pickers.js',
  'src/ui/viewer.js',
  'src/ui/hero-detail.js',
  'src/reservation-util.js',
  'src/ui/conflict.js',
  'src/screens/reservation-form.js',
  'src/vendor/preact-htm.js',
  'src/ui/icons.js',
  'src/ui/components.js',
  'src/screens/home.js',
  'src/screens/home-res.js',
  'src/screens/home-check.js',
  'src/screens/reservations.js',
  'src/screens/schedule.js',
  'src/screens/places.js',
  'src/screens/friends.js',
  'src/screens/entry.js',
  'src/fonts/pretendard/pretendard.css',
  'src/styles/tokens.css',
  'src/styles/base.css',
  'src/styles/components.css',
  'src/styles/screens.css',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('hamkke-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 글꼴(프리텐다드 조각 파일): 내용이 안 바뀌므로 한 번 받으면 저장해 두고 재사용
  if (url.origin === self.location.origin && url.pathname.endsWith('.woff2')) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }))
    );
    return;
  }

  // 앱 파일: 새 버전을 먼저 받고, 안 되면 저장해 둔 것
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req, { ignoreSearch: req.mode === 'navigate' })
            .then((hit) => hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined))
        )
    );
  }
  // 시트(script.google.com) 요청은 그대로 통과
});
