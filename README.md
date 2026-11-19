# 2026 감정 일기

아이패드 가로형 감정 일기 플래너 웹앱.

- `original/` — Claude(Cowork)에서 만든 시제품 원본. `original/index.html`이 화면 기준본이다.
  `cd original && python3 build.py` 로 `template.html + assets/` → `index.html`을 다시 만들 수 있다.
- 작업 안내: `CLAUDE.md`, `HANDOFF.md`, `PROMPT.md`

## 개발

```bash
npm install
npm run dev      # http://localhost:5173 (같은 와이파이의 아이패드에서는 터미널에 나오는 Network 주소로)
npm run build    # dist/ 에 배포용 파일
```

- `index.html` — 화면 뼈대(마크업)
- `src/style.css` — 스타일
- `src/app.js` — 동작 전체
- `src/stickers.json` — 감정 스티커 40개(이름·정중앙 정렬 값), 이미지는 `public/assets/stickers/`
- `public/assets/` — 화면 배경·가장자리 이미지
- `src/supabase.js` — Supabase 연결(로그인 상태 유지)
- `.env` — Supabase 주소와 공개용(publishable) 키. Secret 키는 절대 넣지 않는다
- `supabase/schema.sql` — 테이블·RLS·Storage 정책 (SQL Editor에 붙여 넣어 실행)
