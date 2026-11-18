import re, sys
s = open(sys.argv[1]).read()
blk = s[s.index('SCREENS = ['):s.index('KEEP_TOAST = ')]
pairs = re.findall(r"\('([^']+)', '([^']+)'\)", blk)
if len(sys.argv) > 2:
    import json; print(json.dumps(dict(pairs), ensure_ascii=False))
else:
    print(' '.join(p[0] for p in pairs))
