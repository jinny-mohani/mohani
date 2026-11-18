import json,base64,re
t=open('template.html',encoding='utf-8').read()
def uri(fn): return 'data:image/webp;base64,'+base64.b64encode(open(fn,'rb').read()).decode()
st=json.load(open('assets/stickers_png.json',encoding='utf-8'))
t=t.replace('__STICKERS__',json.dumps(st,ensure_ascii=False))
for th in ['nov','dec']:
  for k in ['bg','paper','title','gnb','tape1','tape2','header','cell','daily']:
    t=t.replace(f'__{th}_{k}__',uri(f'assets/{th}_{k}.webp'))
t=t.replace('__REC_LINES__','[[[80, 262], [80, 370], [80, 478], [80, 587], [380, 145], [380, 256], [380, 366], [380, 476], [380, 587], [680, 145], [680, 256], [680, 366], [680, 476], [680, 587]], [[80, 256], [80, 366], [80, 476], [80, 587], [380, 145], [380, 256], [380, 366], [380, 476], [380, 587], [680, 145], [680, 256], [680, 366], [680, 476], [680, 587]], [[80, 180], [80, 291], [80, 401], [80, 564], [380, 180], [380, 291], [380, 401], [380, 511], [680, 180], [680, 291], [680, 401], [680, 511]]]')
for i in (1,2,3): t=t.replace(f'__rec{i}__',uri(f'assets/rec{i}.webp'))
for i in (1,2): t=t.replace(f'__intro{i}__',uri(f'assets/intro{i}.webp'))
for k in ['cover','profile','memoLine','memoDot']:
  t=t.replace(f'__{k}__',uri(f'assets/{k}.webp'))
  for s in 'LR': t=t.replace(f'__{k}_edge{s}__','data:image/png;base64,'+base64.b64encode(open(f'assets/{k}_edge{s}.png','rb').read()).decode())
t=t.replace('__rec_bg__',uri('assets/rec_bg.webp'))
assert '__' not in re.sub(r'data:[^"\)]+','',t).replace('__proto__',''), re.findall(r'__\w+__',t)[:5]
open('index.html','w',encoding='utf-8').write(t)
print(len(t))
