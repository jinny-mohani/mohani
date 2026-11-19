-- =====================================================================
-- 감정 일기 — Supabase 테이블 · RLS · Storage 정책
--
-- 사용법: Supabase 대시보드 › SQL Editor › New query 에 이 파일 전체를
--         붙여 넣고 Run. 여러 번 실행해도 안전하다(이미 있으면 건너뜀).
--
-- 원칙
--   1) 모든 행에 user_id 가 있고, 기본값은 로그인한 사람(auth.uid()).
--   2) RLS: user_id = auth.uid() 인 행만 읽기·쓰기·지우기.
--   3) 로그인하지 않은 사람(anon)은 어떤 테이블에도 권한이 없다.
--   4) 손글씨·사진은 비공개 버킷 ink 의 {user_id}/... 폴더에만 저장.
--   5) 오프라인에서 쓴 옛날 글이 최신 글을 덮지 않도록,
--      updated_at 이 더 오래된 수정은 DB가 무시한다(최신 우선).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. 테이블
-- ---------------------------------------------------------------------

-- 월간 달력의 날짜별 스티커 (= 일간의 대표 감정)
-- sticker_id 가 null 이면 '스티커를 뗐다'는 뜻. 행을 지우지 않고 null 로 남겨야
-- 다른 기기가 오프라인일 때 뗀 것도 동기화된다.
create table if not exists public.stickers (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  date       date        not null,
  sticker_id text        check (sticker_id ~ '^(pos|neg|mix)[0-9]{2}$'),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

-- 일간 일기
create table if not exists public.days (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  date       date        not null,
  tags       text[]      not null default '{}' check (cardinality(tags)  <= 3),
  feel       text        not null default ''   check (char_length(feel) <= 1000),
  tmr        text        not null default ''   check (char_length(tmr)  <= 500),
  minis      text[]      not null default '{}' check (cardinality(minis) <= 4),   -- (안 씀: 예전 '함께 느낀 감정')
  weather    text        not null default '' check (weather in ('', 'sun', 'cloud', 'rain', 'snow')),
  ink_path   text,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

-- 감정 기록 (3쪽)
create table if not exists public.records (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  page       int         not null check (page between 1 and 3),
  fields     jsonb       not null default '{}' check (pg_column_size(fields) <= 20000),
  ink_path   text,
  updated_at timestamptz not null default now(),
  primary key (user_id, page)
);

-- 내 소개 (한 사람에 한 행)
create table if not exists public.profile (
  user_id    uuid        primary key default auth.uid() references auth.users (id) on delete cascade,
  name       text        not null default '' check (char_length(name) <= 12),
  answers    text[]      not null default '{}' check (cardinality(answers) <= 4),
  photo_path text,
  updated_at timestamptz not null default now()
);

-- 메모 (여러 장)
create table if not exists public.memos (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id         text        not null check (char_length(id) <= 40),
  sort       int         not null default 0,
  type       text        not null default 'line' check (type in ('line', 'dot')),
  text       text        not null default '' check (char_length(text) <= 5000),
  ink_path   text,
  deleted    boolean     not null default false,  -- 나중에 '장 지우기'를 만들 때 쓴다
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);


-- ---------------------------------------------------------------------
-- 2. 최신 우선: 더 오래된 수정은 무시
--    (오프라인 아이패드가 늦게 연결되어 옛 내용을 올려도 최신 글이 지켜진다)
-- ---------------------------------------------------------------------
create or replace function public.keep_newest()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.updated_at < old.updated_at then
    return null;   -- 이 수정은 건너뛴다(에러 없이)
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['stickers', 'days', 'records', 'profile', 'memos'] loop
    execute format('drop trigger if exists keep_newest on public.%I', t);
    execute format('create trigger keep_newest before update on public.%I
                    for each row execute function public.keep_newest()', t);
  end loop;
end $$;


-- ---------------------------------------------------------------------
-- 3. 권한 + RLS (가장 중요)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['stickers', 'days', 'records', 'profile', 'memos'] loop
    -- 로그인 안 한 사람은 아무것도 못 한다
    -- (Supabase 기본 설정이 authenticated 에 TRUNCATE 등 모든 권한을 줄 수 있어서 함께 걷어낸다.
    --  TRUNCATE 는 RLS 검사를 받지 않으므로 반드시 막는다)
    execute format('revoke all on public.%I from anon, authenticated, public', t);
    -- 로그인한 사람은 읽기·쓰기·고치기·지우기 4가지만, 그것도 아래 RLS 정책을 통과한 행만
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);

    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "own rows only" on public.%I', t);
    execute format('create policy "own rows only" on public.%I
                    for all to authenticated
                    using      (user_id = (select auth.uid()))
                    with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;


-- ---------------------------------------------------------------------
-- 4. Storage: 비공개 버킷 ink
--    경로: {user_id}/day-2026-11-05.png, {user_id}/rec-1.png,
--          {user_id}/memo-<id>.png, {user_id}/profile.jpg
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ink', 'ink', false, 2097152, array['image/png', 'image/jpeg'])   -- 파일 하나 2MB까지
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 경로의 첫 폴더가 내 user_id 인 파일만 (읽기 · 올리기 · 덮어쓰기 · 지우기)
drop policy if exists "ink: read own"   on storage.objects;
drop policy if exists "ink: insert own" on storage.objects;
drop policy if exists "ink: update own" on storage.objects;
drop policy if exists "ink: delete own" on storage.objects;

create policy "ink: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'ink' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "ink: insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ink' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "ink: update own" on storage.objects
  for update to authenticated
  using      (bucket_id = 'ink' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'ink' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "ink: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'ink' and (storage.foldername(name))[1] = (select auth.uid())::text);


-- ---------------------------------------------------------------------
-- 5. 확인 (실행 결과 표에 5줄이 모두 rls = true, policies = 1 이어야 한다)
-- ---------------------------------------------------------------------
select c.relname                                   as "table",
       c.relrowsecurity                            as rls,
       (select count(*) from pg_policies p
         where p.schemaname = 'public' and p.tablename = c.relname) as policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('stickers', 'days', 'records', 'profile', 'memos')
order by 1;
