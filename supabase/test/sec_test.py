# 5단계: B 계정과 비로그인(anon)으로 A의 데이터에 접근을 시도한다. 모두 실패해야 정상.
import json, sys, requests
env = dict(l.split('=', 1) for l in open(sys.argv[1]).read().split('\n') if '=' in l)
U, K = env['SB_URL'], env['SB_KEY']
def login(e, p):
    r = requests.post(f'{U}/auth/v1/token?grant_type=password', headers={'apikey': K}, json={'email': e, 'password': p}); r.raise_for_status(); j = r.json()
    return j['access_token'], j['user']['id']
TA, A = login(env['A_EMAIL'], env['A_PASS']); TB, B = login(env['B_EMAIL'], env['B_PASS'])
H = lambda t=None, **x: {'apikey': K, 'Authorization': f'Bearer {t or K}', 'Content-Type': 'application/json', **x}
rest = lambda path: f'{U}/rest/v1/{path}'
rows = []
def row(group, attempt, ok, detail): rows.append((group, attempt, '✅ 차단' if ok else '❌ 뚫림', detail)); 
TABLES = {'stickers': 'date', 'days': 'date', 'records': 'page', 'profile': 'user_id', 'memos': 'id'}

# 0) A의 데이터가 실제로 있는지 (A 본인은 보여야 함)
have = {}
for t in TABLES:
    r = requests.get(rest(f'{t}?select=*'), headers=H(TA)); have[t] = r.json() if r.ok else []
files = requests.post(f'{U}/storage/v1/object/list/ink', headers=H(TA), json={'prefix': A, 'limit': 100}).json()
print('A 본인 확인 —', {t: len(v) for t, v in have.items()}, '파일', len(files))

for t, pk in TABLES.items():
    a_rows = have[t]; sample = a_rows[0] if a_rows else None
    # 읽기
    r = requests.get(rest(f'{t}?select=*'), headers=H(TB)); seen = [x for x in r.json() if x.get('user_id') == A] if r.ok else []
    r2 = requests.get(rest(f'{t}?select=*&user_id=eq.{A}'), headers=H(TB)); seen2 = r2.json() if r2.ok else []
    row(t, 'B가 A의 행 읽기 (전체 / user_id로 콕 집어서)', not seen and not seen2, f'{len(seen)}행 / {len(seen2)}행')
    # 고치기
    patch = {'feel': '해킹'} if t == 'days' else {'name': '해킹'} if t == 'profile' else {'text': '해킹'} if t == 'memos' else {'fields': {'0': '해킹'}} if t == 'records' else {'sticker_id': None}
    r = requests.patch(rest(f'{t}?user_id=eq.{A}'), headers=H(TB, Prefer='return=representation'), json=patch)
    row(t, 'B가 A의 행 고치기', r.ok and r.json() == [] or not r.ok, f'HTTP {r.status_code}, 바뀐 행 {len(r.json()) if r.ok else 0}')
    # 지우기
    r = requests.delete(rest(f'{t}?user_id=eq.{A}'), headers=H(TB, Prefer='return=representation'))
    row(t, 'B가 A의 행 지우기', r.ok and r.json() == [] or not r.ok, f'HTTP {r.status_code}, 지운 행 {len(r.json()) if r.ok else 0}')
    # A인 척 새로 쓰기 / A의 행 덮어쓰기(upsert)
    if sample:
        fake = {k: v for k, v in sample.items() if k not in ('updated_at',)}; fake['user_id'] = A
        if t == 'days': fake['feel'] = '해킹'
        r = requests.post(rest(t), headers=H(TB, Prefer='resolution=merge-duplicates'), json=fake)
        row(t, 'B가 A인 척 쓰기 / A의 행 덮어쓰기(upsert)', not r.ok, f'HTTP {r.status_code} {r.json().get("message","")[:60] if not r.ok else ""}')
    # 비로그인
    r = requests.get(rest(f'{t}?select=*'), headers=H())
    row(t, '로그인 안 한 사람이 읽기', not r.ok or r.json() == [], f'HTTP {r.status_code}')

# 내 행을 A 것으로 바꾸기
r = requests.post(rest('memos'), headers=H(TB, Prefer='return=representation'), json={'id': 'b-own', 'text': 'B 메모'})
r2 = requests.patch(rest('memos?id=eq.b-own'), headers=H(TB, Prefer='return=representation'), json={'user_id': A})
row('memos', 'B가 자기 행의 주인을 A로 바꾸기', not r2.ok, f'HTTP {r2.status_code}')
requests.delete(rest('memos?id=eq.b-own'), headers=H(TB))

# Storage
paths = [f'{A}/{f["name"]}' for f in files if f.get('id')]
r = requests.post(f'{U}/storage/v1/object/list/ink', headers=H(TB), json={'prefix': A, 'limit': 100})
row('Storage', 'B가 A 폴더 파일 목록 보기', r.ok and r.json() == [] or not r.ok, f'{len(r.json()) if r.ok else 0}개')
for pth in paths[:3]:
    r = requests.get(f'{U}/storage/v1/object/authenticated/ink/{pth}', headers=H(TB))
    row('Storage', f'B가 A 파일 내려받기 ({pth.split("/")[1]})', not r.ok, f'HTTP {r.status_code}')
    r = requests.get(f'{U}/storage/v1/object/public/ink/{pth}')
    row('Storage', '공개 주소로 A 파일 열기 (로그인 없이)', not r.ok, f'HTTP {r.status_code}')
    r = requests.post(f'{U}/storage/v1/object/sign/ink/{pth}', headers=H(TB), json={'expiresIn': 60})
    row('Storage', 'B가 A 파일 공유 링크 만들기', not r.ok, f'HTTP {r.status_code}')
if paths:
    r = requests.post(f'{U}/storage/v1/object/ink/{paths[0]}', headers={**H(TB), 'Content-Type': 'image/png', 'x-upsert': 'true'}, data=b'\x89PNG fake')
    row('Storage', 'B가 A 파일 덮어쓰기', not r.ok, f'HTTP {r.status_code}')
    r = requests.delete(f'{U}/storage/v1/object/ink', headers=H(TB), json={'prefixes': paths})
    row('Storage', 'B가 A 파일 지우기', r.ok and r.json() == [] or not r.ok, f'HTTP {r.status_code}, 지운 파일 {len(r.json()) if r.ok else 0}')
r = requests.post(f'{U}/storage/v1/object/ink/{A}/evil.png', headers={**H(TB), 'Content-Type': 'image/png'}, data=b'\x89PNG fake')
row('Storage', 'B가 A 폴더에 새 파일 올리기', not r.ok, f'HTTP {r.status_code}')

# 공격 뒤 A의 데이터가 그대로인지
after = {t: requests.get(rest(f'{t}?select=*'), headers=H(TA)).json() for t in TABLES}
same = all(json.dumps(sorted(have[t], key=str), sort_keys=True) == json.dumps(sorted(after[t], key=str), sort_keys=True) for t in TABLES)
files2 = requests.post(f'{U}/storage/v1/object/list/ink', headers=H(TA), json={'prefix': A, 'limit': 100}).json()
ok_dl = all(requests.get(f'{U}/storage/v1/object/authenticated/ink/{p}', headers=H(TA)).ok for p in paths)
row('확인', '공격 뒤 A의 DB 행이 그대로', same, '')
row('확인', '공격 뒤 A의 파일이 그대로 (개수·내려받기)', len(files2) == len(files) and ok_dl, f'{len(files)}→{len(files2)}개')
# B 본인은 자기 것 쓰기 가능 (정상 동작 확인)
r = requests.post(rest('stickers'), headers=H(TB, Prefer='return=representation'), json={'date': '2026-12-01', 'sticker_id': 'pos01'})
row('확인', 'B는 자기 데이터는 정상으로 쓸 수 있음', r.ok, f'HTTP {r.status_code}'); requests.delete(rest('stickers?date=eq.2026-12-01'), headers=H(TB))

json.dump(rows, open(sys.argv[2], 'w'), ensure_ascii=False)
bad = [x for x in rows if '뚫림' in x[2] and x[0] != '확인'] + [x for x in rows if x[0] == '확인' and '뚫림' in x[2]]
for x in rows: print(' | '.join(map(str, x)))
print('\n문제', len(bad), '건')
