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
  'user': 'user', 'user-plus': 'user-plus', 'share': 'export', 'share-2': 'share', 'map': 'map', 'hash': 'hashtag',
  'clipboard-list': 'clipboard-list', 'list-checks': 'checklist', 'grip-vertical': 'reorder', 'search': 'magnifier',
  'file-text': 'document-text', 'arrow-up-down': 'sort-vertical', 'lock': 'lock', 'square-plus': 'add-square',
}
TAB_FILLED = ['house', 'ticket', 'calendar-days', 'map-pin', 'users']  # 하단 탭 선택 상태(채움: -bold)

icons = json.load(open(sys.argv[1]))['icons']
def body(name, line=True):
  b = icons[name]['body']
  if line:  # 기본 굵기(1.5)는 빼서 Icon의 stroke 값으로 조절되게
    b = b.replace(' stroke-width="1.5"', '')
  return b.replace("'", '&#39;')

def obj(pairs):
  return '{\n' + ''.join(f"  '{k}': '{v}',\n" for k, v in pairs) + '}'

out = ("// Solar 아이콘 (480 Design, CC BY 4.0 — https://www.figma.com/community/file/1166831539721848736). tools/icons/build.py 로 만든 파일 — 직접 고치지 말고 거기서 바꾸기.\n"
       f"export const ICONS = {obj((k, body(v + '-linear')) for k, v in MAP.items())};\n\n"
       "// 하단 탭 선택 상태(채운 아이콘)\n"
       f"export const FILLED = {obj((k, body(MAP[k] + '-bold', False)) for k in TAB_FILLED)};\n")
open('src/ui/icons.js', 'w').write(out)
print('ok', len(MAP))
