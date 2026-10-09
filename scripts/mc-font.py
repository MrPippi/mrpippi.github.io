"""
把 Minecraft 的點陣字型圖（minecraft-assets/textures/font/ascii.png、ascii_sga.png）轉成網頁字型，輸出到 public/fonts/。

    python scripts/mc-font.py
    # 或 npm run mc-font

ascii.png 是 16×16 格、每格 8×8 像素的字元表，格子位置 = 字元碼（同 CP437）。
每個像素轉成向量方塊，相鄰方塊合併成外框；字寬取最右邊有像素的欄 +1，再加 1 像素字距，
與遊戲內的排版規則相同。

座標：1 像素 = 128 單位，1 em = 9 像素（8 像素字形 + 1 像素行距），
所以 font-size 為 9 的倍數（18px、27px…）時每個像素剛好落在整數 CSS 像素上。
需要 fonttools、brotli、Pillow（pip install fonttools brotli pillow）。
"""
import sys
from collections import defaultdict
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
# 原版字型圖放在本機的 minecraft-assets/（不進 git）
FONT_DIR = ROOT / "minecraft-assets" / "textures" / "font"
OUT_DIR = ROOT / "public" / "fonts"
# (字元表, 輸出檔, 字型名稱)：一般文字，以及附魔台用的標準銀河字母（只有英文字母）
FONTS = [
    ("ascii.png", "minecraft-ascii.woff2", "MrPippi Minecraft"),
    ("ascii_sga.png", "minecraft-sga.woff2", "MrPippi Minecraft SGA"),
]

CELL = 8  # 每格像素數
GRID = 16  # 每列格數
PX = 128  # 每像素的字型單位
UPM = 9 * PX
ASCENT = 8 * PX  # 第 0–6 列在基線上方，再留 1 像素頂部空間
DESCENT = PX  # 第 7 列是下伸部（g、p、y…）
BASELINE_ROW = 7
SPACE_ADVANCE = 4  # 空白字寬（像素）
CODEPOINTS = range(0x20, 0x7F)

Point = tuple[int, int]
Edge = tuple[Point, Point]


def glyph_pixels(sheet: Image.Image, code: int) -> frozenset[Point]:
    """回傳該字元有顏色的像素 (x, y)，y 向下。"""
    left, top = (code % GRID) * CELL, (code // GRID) * CELL
    return frozenset(
        (x, y)
        for y in range(CELL)
        for x in range(CELL)
        if sheet.getpixel((left + x, top + y))[3] > 0
    )


def pixel_edges(x: int, y: int) -> list[Edge]:
    """單一像素的四條邊，以 y 向上的格點座標、順時針方向（TrueType 外框方向）。"""
    top, bottom = BASELINE_ROW - y, BASELINE_ROW - y - 1
    return [
        ((x, top), (x + 1, top)),
        ((x + 1, top), (x + 1, bottom)),
        ((x + 1, bottom), (x, bottom)),
        ((x, bottom), (x, top)),
    ]


def trace_outlines(pixels: frozenset[Point]) -> list[list[Point]]:
    """相鄰像素共用的邊方向相反會互相抵銷，剩下的邊串成封閉外框（內洞自動為逆時針）。"""
    edges: set[Edge] = set()
    for x, y in pixels:
        for edge in pixel_edges(x, y):
            reverse = (edge[1], edge[0])
            if reverse in edges:
                edges.remove(reverse)
            else:
                edges.add(edge)

    outgoing: dict[Point, list[Point]] = defaultdict(list)
    for start, end in sorted(edges):
        outgoing[start].append(end)

    loops: list[list[Point]] = []
    while outgoing:
        start = next(iter(outgoing))
        loop = [start]
        current = start
        while True:
            nxt = outgoing[current].pop()
            if not outgoing[current]:
                del outgoing[current]
            if nxt == start:
                break
            loop.append(nxt)
            current = nxt
        loops.append(drop_collinear(loop))
    return loops


def drop_collinear(loop: list[Point]) -> list[Point]:
    def is_corner(i: int) -> bool:
        (ax, ay), (bx, by), (cx, cy) = loop[i - 1], loop[i], loop[(i + 1) % len(loop)]
        return (bx - ax) * (cy - by) != (by - ay) * (cx - bx)

    return [p for i, p in enumerate(loop) if is_corner(i)]


def draw_glyph(loops: list[list[Point]]):
    pen = TTGlyphPen(None)
    for loop in loops:
        pen.moveTo((loop[0][0] * PX, loop[0][1] * PX))
        for gx, gy in loop[1:]:
            pen.lineTo((gx * PX, gy * PX))
        pen.closePath()
    return pen.glyph()


def glyph_name(code: int) -> str:
    return "space" if code == 0x20 else f"uni{code:04X}"


def build(source: Path, output: Path, family: str) -> tuple[int, int]:
    sheet = Image.open(source).convert("RGBA")
    if sheet.size != (CELL * GRID, CELL * GRID):
        raise SystemExit(f"{source.name} 尺寸應為 128×128，實際為 {sheet.size}")

    glyphs = {".notdef": TTGlyphPen(None).glyph()}
    advances = {".notdef": SPACE_ADVANCE * PX}
    cmap: dict[int, str] = {}

    for code in CODEPOINTS:
        pixels = glyph_pixels(sheet, code)
        if code != 0x20 and not pixels:
            continue
        name = glyph_name(code)
        glyphs[name] = draw_glyph(trace_outlines(pixels))
        width = max(x for x, _ in pixels) + 1 if pixels else SPACE_ADVANCE - 1
        advances[name] = (width + 1) * PX
        cmap[code] = name

    order = list(glyphs)
    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyphs)
    glyf = fb.font["glyf"]
    fb.setupHorizontalMetrics({n: (advances[n], getattr(glyf[n], "xMin", 0)) for n in order})
    fb.setupHorizontalHeader(ascent=ASCENT, descent=-DESCENT)
    fb.setupNameTable({"familyName": family, "styleName": "Regular"})
    fb.setupOS2(
        sTypoAscender=ASCENT,
        sTypoDescender=-DESCENT,
        sTypoLineGap=0,
        usWinAscent=ASCENT,
        usWinDescent=DESCENT,
    )
    fb.setupPost()

    output.parent.mkdir(parents=True, exist_ok=True)
    tmp = output.with_suffix(".ttf")
    fb.save(str(tmp))
    font = TTFont(str(tmp))
    font.flavor = "woff2"
    font.save(str(output))
    tmp.unlink()
    return len(cmap), output.stat().st_size


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    for sheet_name, out_name, family in FONTS:
        source, output = FONT_DIR / sheet_name, OUT_DIR / out_name
        if not source.is_file():
            raise SystemExit(f"找不到字型圖：{source}")
        count, size = build(source, output, family)
        print(f"{count} 字 -> {output.relative_to(ROOT)} ({size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
