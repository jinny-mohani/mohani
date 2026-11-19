# 로컬 RLS 테스트

진짜 Supabase 없이, 로컬 Postgres에 Supabase의 `auth`·`storage`를 흉내 낸 뒤
`schema.sql`이 계정 A/B를 제대로 나누는지 확인한다.

```bash
createdb t
psql -d t -f supabase/test/mock_supabase.sql
psql -d t -f supabase/schema.sql
psql -d t -f supabase/test/rls_test.sql   # 각 줄의 (expect ...)와 결과가 같아야 한다
```
