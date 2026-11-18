import { defineConfig } from "vite";

export default defineConfig({
  server: { host: true },          // 같은 와이파이의 아이패드에서 열어볼 수 있게
  build: { assetsInlineLimit: 0 }, // 이미지는 파일 그대로 둔다
});
