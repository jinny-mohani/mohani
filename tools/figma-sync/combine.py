"""캡처한 화면 HTML들을 묶어서 피그마로 보낼 문서 만들기 (한 문서 최대 20화면)."""
import re, sys, os
from bs4 import BeautifulSoup

D = os.path.dirname(os.path.abspath(__file__)) + '/cap'
# (파일, 피그마 이름) — 순서대로. 알림(토스트)은 KEEP_TOAST 화면만 남겨요
SCREENS = [
    ('00-start', '00 시작'), ('trip-not-found', '00-1 여행을 찾을 수 없음'),
    ('01-profile', '01 프로필 선택'), ('01-1-selected', '01-1 프로필 선택됨'),
    ('02-trips', '02 여행 목록'), ('02-1-invite-sheet', '02-1 초대 안내'),
    ('03-home', '03 홈'), ('03-3-1-undo', '03-3-1 삭제 되돌리기 알림'), ('03-4-settings', '03-4 여행 설정'),
    ('03-6-checklist-add', '03-6 체크 리스트 추가'), ('03-6-1-checklist-edit', '03-6-1 체크 리스트 수정'),
    ('03-7-deleted', '03-7 삭제한 항목'), ('03-8-friend', '03-8 친구 프로필'),
    ('05-all', '05 예약 – 전체'), ('05-1-flight', '05-1 예약 – 항공권'), ('05-2-stay', '05-2 예약 – 숙소'),
    ('05-3-other', '05-3 예약 – 기타'), ('05-4-stay-detail', '05-4 숙소 상세'), ('05-5-flight-detail', '05-5 항공권 상세'),
    ('05-6-other-detail', '05-6 기타 상세'),
    ('07-0-sheet', '07 예약 종류 선택'), ('07-1-1-flight-form', '07-1 항공권 추가'), ('07-1-airline-picker', '07-1-1 항공사 고르기'),
    ('07-1-airport-picker', '07-1-2 공항 고르기'), ('07-2-stay-edit', '07-2 숙소 수정'), ('07-3-1-other-custom', '07-3 기타 추가 (직접 입력)'),
    ('08-schedule', '08 일정'), ('08-1-schedule-form', '08-1 일정 추가'), ('08-2-place-picker', '08-2 장소 고르기'), ('08-4-reorder', '08-4 순서 편집'),
    ('09-places', '09 장소 – 전체'), ('09-2-category', '09-2 장소 – 카테고리'), ('09-1-place-form', '09-1 장소 등록'),
    ('10-place-detail', '10 장소 상세'), ('10-menu', '10-1 장소 메뉴'), ('10-viewer', '10-2 사진 크게 보기'),
    ('11-friends', '11 친구들'), ('11-1-profile', '11-1 내 프로필 수정'), ('11-2-picker', '11-2 캐릭터 고르기'),
    ('12-conflict', '12 동시 수정 알림'),
    ('13-new-trip', '13 새 여행 만들기'), ('13-2-member-sheet', '13-2 멤버 추가'), ('13-1-created', '13-1 초대 링크 공유'),
    ('S-2-install', 'S-2 홈 화면에 추가 안내'), ('S-3-offline', 'S-3 오프라인'), ('S-5-save-fail', 'S-5 저장 실패'),
]
KEEP_TOAST = {'03-3-1-undo', 'S-5-save-fail', 'S-3-offline'}

css = None
items = []
for f, name in SCREENS:
    s = open(f'{D}/{f}.html').read()
    if css is None:
        css = re.search(r'<style>(.*?)</style><style>', s, re.S).group(1)
    H = int(re.search(r'#app \{[^}]*height: (\d+)px', s).group(1))
    body = re.search(r'<body>(.*)</body>', s, re.S).group(1)
    soup = BeautifulSoup(body, 'html.parser')
    if f not in KEEP_TOAST:
        for t in soup.select('.toast'):
            t.decompose()
    app = soup.find(id='app')
    del app['id']
    app['class'] = 'app'
    items.append((name, H, str(app)))

# #app 규칙이 클래스에도 걸리도록
css = css.replace('#app', '.app')
extra = """
html, body { height: auto !important; overflow: visible !important; margin: 0; background: #e5e5e5; }
body { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 80px; padding: 80px; width: 2400px; }
.cap { position: relative; width: 360px; overflow: hidden; background: #fff; flex: 0 0 360px; }
.cap > .app { position: relative !important; width: 360px !important; max-width: 360px !important; height: 100% !important; overflow: hidden !important; margin: 0 !important; display: flow-root !important; }
.cap [data-was-fixed] { position: absolute !important; }
.cap .layer { position: static !important; }
.cap .screen { min-height: 100% !important; }
*, *::before, *::after { transition: none !important; animation: none !important; }
/* 화면 너비(vw·dvh) 기준 값을 360×760 앱 기준으로 */
.cap .toast { width: 320px !important; }
.cap .fab { right: 20px !important; }
.cap .sheet { max-height: 669px !important; }
.cap .full { min-height: 100% !important; }
.cap .dialog, .cap [role="alertdialog"] { width: 328px !important; max-height: 646px !important; }
"""
os.makedirs(D + '/batch', exist_ok=True)
for b in range(0, len(items), 12):
    part = items[b:b + 12]
    html = ['<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>batch</title><style>', css, '</style><style>', extra, '</style></head><body>']
    for name, H, app in part:
        html.append(f'<div class="cap" data-name="{name}" style="height:{H}px">{app}</div>')
    html.append('</body></html>')
    p = f'{D}/batch/b{b // 12 + 1}.html'
    open(p, 'w').write(''.join(html))
    print(p, len(part), round(os.path.getsize(p) / 1e6, 1), 'MB', [n for n, _, _ in part][0], '…')
