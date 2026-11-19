-- 일간 일기의 날씨 칸 (sun / cloud / rain / snow, 비어 있으면 '')
-- Supabase › SQL Editor › New query 에 붙여 넣고 Run. 여러 번 실행해도 안전하다.
alter table public.days
  add column if not exists weather text not null default ''
  check (weather in ('', 'sun', 'cloud', 'rain', 'snow'));

-- 확인: weather 한 줄이 나오면 성공
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'days' and column_name = 'weather';
