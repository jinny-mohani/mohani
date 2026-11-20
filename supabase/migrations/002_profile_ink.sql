-- 내 소개 손글씨: profile 표에 손글씨 파일 위치(ink_path) 칸 추가
-- 파일은 ink 버킷의 {user_id}/profile-ink.png 에 저장 (기존 Storage 정책 그대로 적용)
alter table public.profile add column if not exists ink_path text;
