# 앱 아이콘(src/ui/icons.js) 만들기 — Solar 아이콘 (480 Design, CC BY 4.0)
# 사용: npm 의 @iconify-json/solar 를 받아 푼 뒤
#   python3 tools/icons/build.py <압축 푼 폴더>/package/icons.json
# 아이콘을 바꾸거나 더하려면 아래 MAP 에서 '앱 이름: Solar 이름'을 고치고 다시 실행.
# Solar 이름은 https://icones.js.org/collection/solar 에서 찾기 (뒤에 붙는 -linear 는 빼고 적기)
import json, re, sys

MAP = {  # 앱에서 쓰는 이름 → Solar 이름(선: -linear)
  'house': 'home-2', 'ticket': 'ticket', 'calendar-days': 'calendar', 'map-pin': 'map-point', 'users': 'users-group-rounded',
  'chevron-left': 'alt-arrow-left', 'chevron-right': 'alt-arrow-right', 'chevron-down': 'alt-arrow-down', 'chevron-up': 'alt-arrow-up',
  'x': 'close', 'plus': 'add', 'settings': 'settings', 'plane': 'airplane', 'bed-double': 'bed', 'car': 'car',
  'bus': 'bus', 'luggage': 'suitcase', 'ellipsis': 'menu-dots', 'refresh-cw': 'refresh', 'rotate-ccw': 'restart',
  'wifi-off': 'wi-fi-off', 'image': 'gallery', 'image-plus': 'gallery-add', 'check': 'check', 'circle': 'circle',
  'circle-check': 'check-circle', 'circle-pause': 'pause-circle', 'pause': 'pause', 'circle-alert': 'danger-circle',
  'info': 'info-circle', 'link': 'link', 'copy': 'copy', 'external-link': 'square-share-line', 'pencil': 'pen',
  'trash': 'trash-bin-minimalistic', 'trash-2': 'trash-bin-minimalistic', 'undo-2': 'undo-left-round', 'clock': 'clock-circle',
  'user': 'user', 'share': 'export', 'share-2': 'share', 'map': 'map', 'hash': 'hashtag',
  'clipboard-list': 'clipboard-list', 'list-checks': 'checklist', 'grip-vertical': 'reorder', 'search': 'magnifier',
  'file-text': 'document-text', 'arrow-up-down': 'sort-vertical', 'lock': 'lock', 'square-plus': 'add-square',
  'phone': 'phone', 'memo': 'clipboard-text',
}
TAB_FILLED = ['house', 'ticket', 'calendar-days', 'map-pin', 'users']  # 하단 탭 선택 상태(채움: -bold)

# 채운(Bold) 작은 아이콘: 입력 제목 왼쪽(회색), 장소 상세 정보 줄(초록). 앱 이름 = Solar 이름
BOLD = ['widget', 'airplane', 'map-point', 'calendar', 'clock-circle', 'cup-hot', 'hashtag', 'check-circle',
  'user', 'user-circle', 'shop', 'buildings', 'armchair', 'clipboard-text', 'pen', 'gallery', 'map', 'bus',
  'users-group-rounded', 'wallet', 'ruler', 'bed', 'ticket', 'phone', 'car', 'tag', 'global', 'checklist',
  'trash-bin-minimalistic', 'pause-circle']  # 11.22: 고르기 팝업 아이콘 칸

# 피그마에서 직접 그린 아이콘 (Solar 아님): 입력칸·접기의 작은 화살표 ico/chevron-down·up (18px 기준 10.5×5.5, 선 1.4)
CUSTOM = {
  'select-down': '<path d="M5 8.33L12 15.67L19 8.33"/>',
  'select-up': '<path d="M5 15.67L12 8.33L19 15.67"/>',
  # 친구들 멤버 추가 (피그마 ico / user-plus 8255:3471): 머리 원 + 몸 타원 + 오른쪽 위 +
  'user-plus': '<circle cx="9.34" cy="6.3" r="4.12"/><ellipse cx="9.34" cy="18.27" rx="8.25" ry="4.64"/><path d="M16.37 10.26H21.61M18.99 7.64V12.88"/>',
  'select-right': '<path d="M8.33 5L15.67 12L8.33 19"/>',  # 홈 각 항목 제목 오른쪽 › (11.22: ico/chevron-Up 회전)
  # 장소 상세 위쪽 흐림 버튼 (피그마 8210:11473): 뒤로 화살표 7×14, 점 3개 — 선 2
  'glass-back': '<path d="M15.5 19L8.5 12L15.5 5"/>',
  'glass-more': '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
}

icons = json.load(open(sys.argv[1]))['icons']
def body(name, line=True):
  b = icons[name]['body']
  if line:  # 기본 굵기(1.5)는 빼서 Icon의 stroke 값으로 조절되게
    b = b.replace(' stroke-width="1.5"', '')
  return b.replace("'", '&#39;')

def obj(pairs):
  return '{\n' + ''.join(f"  '{k}': '{v}',\n" for k, v in pairs) + '}'

out = ("// Solar 아이콘 (480 Design, CC BY 4.0 — https://www.figma.com/community/file/1166831539721848736). tools/icons/build.py 로 만든 파일 — 직접 고치지 말고 거기서 바꾸기.\n"
       f"export const ICONS = {obj([(k, body(v + '-linear')) for k, v in MAP.items()] + list(CUSTOM.items()))};\n\n"
       "// 하단 탭 선택 상태(채운 아이콘)\n"
       f"export const FILLED = {obj((k, body(MAP[k] + '-bold', False)) for k in TAB_FILLED)};\n\n"
       "// 채운 작은 아이콘 (Icon bold) — 입력 제목, 장소 정보 줄\n"
       f"export const BOLD = {obj((k, body(k + '-bold', False)) for k in BOLD)};\n")
open('src/ui/icons.js', 'w').write(out)
print('ok', len(MAP))
