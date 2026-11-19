import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: { host: true },          // 같은 와이파이의 아이패드에서 열어볼 수 있게
  build: { assetsInlineLimit: 0 }, // 이미지는 파일 그대로 둔다
  plugins: [
    // 오프라인: 앱 화면(코드·그림·글꼴)을 기기에 저장해 두고, 인터넷이 없어도 연다.
    // 일기 데이터는 앱이 따로 기기에 저장하고 Supabase와 동기화한다(서비스워커는 Supabase 요청을 건드리지 않음).
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      manifest: false,               // public/manifest.webmanifest 를 그대로 쓴다
      workbox: {
        globPatterns: ["**/*.{html,js,css,webp,png,svg,json,webmanifest}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/privacy\.html$/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          { urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i, handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-css" } },
          { urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i, handler: "CacheFirst",
            options: { cacheName: "google-fonts-files", expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 365 },
                       cacheableResponse: { statuses: [0, 200] } } },
        ],
      },
    }),
  ],
});
