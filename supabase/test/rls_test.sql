\set A 'aaaaaaaa-0000-0000-0000-000000000001'
\set B 'bbbbbbbb-0000-0000-0000-000000000002'
\pset footer off
-- ===== A writes =====
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001"}', false) \g /dev/null
insert into stickers(date, sticker_id, updated_at) values ('2026-11-05','pos01','2026-11-05 10:00');
insert into days(date, feel, tags, minis, ink_path, updated_at) values ('2026-11-05','A의 비밀 일기','{a,b}','{pos02}',:'A'||'/day-2026-11-05.png','2026-11-05 10:00');
insert into records(page, fields) values (1,'{"0":"A 기록"}');
insert into profile(name) values ('에이');
insert into memos(id, text) values ('m1','A 메모');
insert into storage.objects(bucket_id, name) values ('ink', :'A'||'/day-2026-11-05.png');
\echo [A] own rows visible (expect 1 1 1 1 1 1):
select (select count(*) from stickers) s,(select count(*) from days) d,(select count(*) from records) r,(select count(*) from profile) p,(select count(*) from memos) m,(select count(*) from storage.objects) f;

-- ===== B tries =====
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002"}', false) \g /dev/null
\echo [B] read A data (expect 0 0 0 0 0 0):
select (select count(*) from stickers) s,(select count(*) from days) d,(select count(*) from records) r,(select count(*) from profile) p,(select count(*) from memos) m,(select count(*) from storage.objects) f;
\echo [B] update/delete A rows (expect UPDATE 0 / DELETE 0):
update days set feel='해킹' where user_id=:'A';
delete from stickers where user_id=:'A';
delete from storage.objects where name like :'A'||'/%';
update storage.objects set name = :'B'||'/stolen.png' where name like :'A'||'/%';
\echo [B] insert row as A (expect ERROR row-level security):
insert into memos(user_id, id, text) values (:'A','evil','B가 A인 척');
\echo [B] upload into A folder (expect ERROR row-level security):
insert into storage.objects(bucket_id, name) values ('ink', :'A'||'/evil.png');
\echo [B] upsert-steal A primary key (expect ERROR):
insert into profile(user_id, name) values (:'A','x') on conflict (user_id) do update set name='x';
\echo [B] own folder upload (expect INSERT 0 1):
insert into storage.objects(bucket_id, name) values ('ink', :'B'||'/day-2026-11-06.png');
\echo [B] change own row user_id to A (expect ERROR):
insert into memos(id, text) values ('b1','B 메모');
update memos set user_id=:'A' where id='b1';

-- ===== anon =====
reset role; set role anon;
select set_config('request.jwt.claims', '', false) \g /dev/null
\echo [anon] read (expect ERROR permission denied):
select count(*) from days;
\echo [anon] storage read (expect 0):
select count(*) from storage.objects;

-- ===== newest wins =====
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001"}', false) \g /dev/null
update days set feel='옛날 오프라인 글', updated_at='2026-11-04 09:00' where date='2026-11-05';
update days set feel='최신 글', updated_at='2026-11-06 09:00' where date='2026-11-06';
\echo [A] older edit ignored (expect A의 비밀 일기):
select feel from days where date='2026-11-05';
update days set feel='더 최신 글', updated_at='2026-11-07 09:00' where date='2026-11-05';
\echo [A] newer edit applied (expect 더 최신 글):
select feel from days where date='2026-11-05';
\echo [A] sticker removal as null (expect UPDATE 1, then null):
update stickers set sticker_id=null, updated_at='2026-11-07 09:00' where date='2026-11-05';
select sticker_id is null as removed from stickers;
\echo [A] invalid sticker id (expect ERROR check):
insert into stickers(date, sticker_id) values ('2026-11-09','hack');
\echo [A] A still sees only A (expect 1 file, A path):
select name from storage.objects;
reset role;
\echo [admin] A data intact after B attacks:
select user_id, feel from days; select count(*) as a_stickers from stickers where user_id=:'A';
