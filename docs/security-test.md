# 5단계 보안 테스트 결과 (2026-11-19)

실제 Supabase(`llewtihbcejijrjqpttk`)에서 테스트 계정 A·B와 비로그인 상태로 **API를 직접 호출**해,
B와 비로그인 사용자가 A의 데이터·파일에 접근할 수 있는지 시험했다. 앱 화면을 거치지 않으므로, 공개용 키를 가진 누구라도 할 수 있는 공격과 같다.

- 스크립트: `supabase/test/sec_test.py` (계정 정보는 별도 env 파일로 넘긴다. 저장소에 넣지 않는다)
- 결과: **문제 0건**

| 대상 | 시도 | 결과 | 응답 |
|---|---|---|---|
| stickers | B가 A의 행 읽기 (전체 / user_id로 콕 집어서) | ✅ 차단 | 0행 / 0행 |
| stickers | B가 A의 행 고치기 | ✅ 차단 | HTTP 200, 바뀐 행 0 |
| stickers | B가 A의 행 지우기 | ✅ 차단 | HTTP 200, 지운 행 0 |
| stickers | B가 A인 척 쓰기 / A의 행 덮어쓰기(upsert) | ✅ 차단 | HTTP 403 new row violates row-level security policy for table "sticke |
| stickers | 로그인 안 한 사람이 읽기 | ✅ 차단 | HTTP 401 |
| days | B가 A의 행 읽기 (전체 / user_id로 콕 집어서) | ✅ 차단 | 0행 / 0행 |
| days | B가 A의 행 고치기 | ✅ 차단 | HTTP 200, 바뀐 행 0 |
| days | B가 A의 행 지우기 | ✅ 차단 | HTTP 200, 지운 행 0 |
| days | B가 A인 척 쓰기 / A의 행 덮어쓰기(upsert) | ✅ 차단 | HTTP 403 new row violates row-level security policy for table "days" |
| days | 로그인 안 한 사람이 읽기 | ✅ 차단 | HTTP 401 |
| records | B가 A의 행 읽기 (전체 / user_id로 콕 집어서) | ✅ 차단 | 0행 / 0행 |
| records | B가 A의 행 고치기 | ✅ 차단 | HTTP 200, 바뀐 행 0 |
| records | B가 A의 행 지우기 | ✅ 차단 | HTTP 200, 지운 행 0 |
| records | B가 A인 척 쓰기 / A의 행 덮어쓰기(upsert) | ✅ 차단 | HTTP 403 new row violates row-level security policy for table "record |
| records | 로그인 안 한 사람이 읽기 | ✅ 차단 | HTTP 401 |
| profile | B가 A의 행 읽기 (전체 / user_id로 콕 집어서) | ✅ 차단 | 0행 / 0행 |
| profile | B가 A의 행 고치기 | ✅ 차단 | HTTP 200, 바뀐 행 0 |
| profile | B가 A의 행 지우기 | ✅ 차단 | HTTP 200, 지운 행 0 |
| profile | B가 A인 척 쓰기 / A의 행 덮어쓰기(upsert) | ✅ 차단 | HTTP 403 new row violates row-level security policy for table "profil |
| profile | 로그인 안 한 사람이 읽기 | ✅ 차단 | HTTP 401 |
| memos | B가 A의 행 읽기 (전체 / user_id로 콕 집어서) | ✅ 차단 | 0행 / 0행 |
| memos | B가 A의 행 고치기 | ✅ 차단 | HTTP 200, 바뀐 행 0 |
| memos | B가 A의 행 지우기 | ✅ 차단 | HTTP 200, 지운 행 0 |
| memos | B가 A인 척 쓰기 / A의 행 덮어쓰기(upsert) | ✅ 차단 | HTTP 403 new row violates row-level security policy for table "memos" |
| memos | 로그인 안 한 사람이 읽기 | ✅ 차단 | HTTP 401 |
| memos | B가 자기 행의 주인을 A로 바꾸기 | ✅ 차단 | HTTP 403 |
| Storage | B가 A 폴더 파일 목록 보기 | ✅ 차단 | 0개 |
| Storage | B가 A 파일 내려받기 (day-2026-11-19.png) | ✅ 차단 | HTTP 400 |
| Storage | 공개 주소로 A 파일 열기 (로그인 없이) | ✅ 차단 | HTTP 400 |
| Storage | B가 A 파일 공유 링크 만들기 | ✅ 차단 | HTTP 400 |
| Storage | B가 A 파일 덮어쓰기 | ✅ 차단 | HTTP 400 |
| Storage | B가 A 파일 지우기 | ✅ 차단 | HTTP 200, 지운 파일 0 |
| Storage | B가 A 폴더에 새 파일 올리기 | ✅ 차단 | HTTP 400 |
| 확인 | 공격 뒤 A의 DB 행이 그대로 | ✅ 정상 |  |
| 확인 | 공격 뒤 A의 파일이 그대로 (개수·내려받기) | ✅ 정상 | 1→1개 |
| 확인 | B는 자기 데이터는 정상으로 쓸 수 있음 | ✅ 정상 | HTTP 201 |

## 참고
- '고치기/지우기'가 HTTP 200인데 0행인 것은 정상이다. RLS는 남의 행을 **보이지 않게** 걸러서, 바꿀 대상이 0개가 된다.
- A의 Storage에는 시험 당시 손글씨 파일 1개(일간)가 있었다. 감정 기록·메모 손글씨와 프로필 사진도 같은 `{user_id}/` 폴더 정책을 쓴다.
- 정책 원본: `supabase/schema.sql` (RLS `own rows only`, Storage `ink: * own`)
