"""스타일 시안 HTML에 픽셀 글꼴(갈무리)을 부분 글꼴로 넣어 한 파일로 만든다.

사용법:
  pip install fonttools brotli
  npm pack galmuri@2.40.3 && tar xzf galmuri-2.40.3.tgz   # package/dist/ 에 글꼴이 생김
  python3 tools/build_prototype.py <galmuri dist 폴더>

입력:  prototype/style-candidates.src.html  (/*FONT_R*/, /*FONT_B*/ 자리표시)
출력:  prototype/style-candidates.html
"""
import base64
import io
import pathlib
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "prototype" / "style-candidates.src.html"
OUT = ROOT / "prototype" / "style-candidates.html"


def subset_b64(font_path: pathlib.Path, text: str) -> str:
    font = TTFont(str(font_path))
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    sub = subset.Subsetter(opts)
    sub.populate(text=text)
    sub.subset(font)
    buf = io.BytesIO()
    font.flavor = "woff2"
    font.save(buf)
    return base64.b64encode(buf.getvalue()).decode()


def main() -> None:
    dist = pathlib.Path(sys.argv[1])
    html = SRC.read_text(encoding="utf-8")
    chars = set(html) | {chr(c) for c in range(32, 127)} | set("×÷□←▶★☆·…!?")
    text = "".join(sorted(chars))
    html = html.replace("/*FONT_R*/", subset_b64(dist / "Galmuri11.woff2", text))
    html = html.replace("/*FONT_B*/", subset_b64(dist / "Galmuri11-Bold.woff2", text))
    OUT.write_text(html, encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB, {len(chars)} glyphs requested)")


if __name__ == "__main__":
    main()
