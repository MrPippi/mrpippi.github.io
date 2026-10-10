"""
把 Chiron GoRound TC（可變粗細字型）裁成網站介面用到的字，固定成 700 與 900 兩種粗細，
輸出 public/fonts/chiron-goround-700.woff2、chiron-goround-900.woff2。
自己提供字型檔，不再從 Google Fonts 載入：少一個會擋住畫面繪製的外部 CSS，也只下載用得到的字。

    python scripts/ui-font.py PATH/TO/ChironGoRoundTC[wght].ttf [PATH/TO/OFL.txt]
    # 或 npm run ui-font -- PATH/TO/ChironGoRoundTC[wght].ttf

字型與授權（SIL OFL 1.1）可從 https://github.com/google/fonts/tree/main/ofl/chirongoroundtc 下載。
會掃描 src/i18n/ 翻譯檔的字串與文章的標題、標籤；改了介面文字或新增文章後重新執行一次。
沒收錄到的字會改用裝置內建的中文字型顯示。需要 fonttools 與 brotli（pip install fonttools brotli）。
"""
import re
import shutil
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
# 圓體只用在介面文字（標題、按鈕、標籤、通知）：來源是翻譯檔，加上文章的標題與標籤
DICTIONARIES = sorted((ROOT / "src" / "i18n").glob("*.ts"))
POSTS = sorted((ROOT / "src" / "content" / "blog").rglob("*.md"))
FRONTMATTER = re.compile(r"\A---\n(.*?)\n---", re.S)
FIELDS = re.compile(r"^(?:title|tags):(.*)$", re.M)
STRING = re.compile(r"'((?:[^'\\\n]|\\.)*)'|`([^`]*)`")
OUT_DIR = ROOT / "public" / "fonts"
LICENSE_OUT = OUT_DIR / "ChironGoRoundTC-OFL.txt"
WEIGHTS = (700, 900)
EXTRA = "".join(chr(c) for c in range(0x20, 0x7F)) + "·—…「」『』（）：；，。、！？＆％＃"


def dictionary_strings(path: Path) -> str:
    """只取翻譯檔裡的字串常值（不含註解）"""
    code = path.read_text(encoding="utf8")
    return "".join(a or b for a, b in STRING.findall(code))


def post_titles(path: Path) -> str:
    match = FRONTMATTER.match(path.read_text(encoding="utf8").replace("\r\n", "\n"))
    return "".join(FIELDS.findall(match.group(1))) if match else ""


def required_text() -> str:
    return EXTRA + "".join(map(dictionary_strings, DICTIONARIES)) + "".join(map(post_titles, POSTS))


def subset_options() -> subset.Options:
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.name_IDs = ["*"]  # 保留版權與授權資訊
    return options


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    source = Path(sys.argv[1])
    if not source.is_file():
        raise SystemExit(f"找不到字型檔：{source}")

    cmap = TTFont(source, lazy=True).getBestCmap()
    wanted = sorted({ch for ch in required_text() if not ch.isspace() or ch == " "})
    covered = "".join(ch for ch in wanted if ord(ch) in cmap)
    missing = [ch for ch in wanted if ord(ch) not in cmap and ch.isprintable()]

    # 先裁字再固定粗細：可變字型很大，先裁掉用不到的字能大幅加快
    font = subset.load_font(str(source), subset_options())
    subsetter = subset.Subsetter(subset_options())
    subsetter.populate(text=covered)
    subsetter.subset(font)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for weight in WEIGHTS:
        static = instancer.instantiateVariableFont(font, {"wght": weight}, inplace=False)
        out = OUT_DIR / f"chiron-goround-{weight}.woff2"
        static.flavor = "woff2"
        static.save(out)
        print(f"{weight}：{len(covered)} 字 -> {out.relative_to(ROOT)} ({out.stat().st_size / 1024:.1f} KB)")

    if len(sys.argv) > 2:
        shutil.copyfile(sys.argv[2], LICENSE_OUT)
    if missing:
        print(f"字型未收錄 {len(missing)} 字（會改用系統字型）：{''.join(missing)[:80]}")


if __name__ == "__main__":
    main()
