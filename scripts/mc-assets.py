"""
從本機的 Minecraft 原版素材（minecraft-assets/，不進 git）挑出網站用到的圖，複製到 public/mc/。

    python scripts/mc-assets.py
    # 或 npm run mc-assets

素材版權屬於 Mojang Studios / Microsoft，只挑選必要的少數幾張，不公開整份素材。
- 介面圖（按鈕、選單背景、提示框…）轉成 RGBA 原樣複製，網頁用 image-rendering: pixelated 放大。
- 太陽、月亮在遊戲裡是「疊加」混色（黑底），這裡把亮度轉成透明度，放在任何天空上都自然。
- 雲朵圖是黑白點陣，轉成白色 + 透明。
- 爆炸粒子的 16 格、煙火火花的 8 格動畫各接成一條橫向圖。
- favicon 由草地方塊側面 + 染成草綠色的覆蓋層合成。
需要 Pillow（pip install pillow）。
"""
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "minecraft-assets" / "textures"
OUTPUT = ROOT / "public" / "mc"

# 輸出路徑（相對 public/mc/） -> 來源路徑（相對 minecraft-assets/textures/）
COPIES = {
    "gui/button.png": "gui/sprites/widget/button.png",
    "gui/button_highlighted.png": "gui/sprites/widget/button_highlighted.png",
    "gui/button_disabled.png": "gui/sprites/widget/button_disabled.png",
    "gui/menu_list_background.png": "gui/menu_list_background.png",
    "gui/header_separator.png": "gui/header_separator.png",
    "gui/footer_separator.png": "gui/footer_separator.png",
    "gui/toast.png": "gui/sprites/toast/advancement.png",
    "gui/slot.png": "gui/sprites/container/slot.png",
    "gui/join.png": "gui/sprites/world_list/join.png",
    "gui/now_playing.png": "gui/sprites/toast/now_playing.png",
    "gui/slider.png": "gui/sprites/widget/slider.png",
    "gui/slider_highlighted.png": "gui/sprites/widget/slider_highlighted.png",
    "gui/slider_handle.png": "gui/sprites/widget/slider_handle.png",
    "gui/slider_handle_highlighted.png": "gui/sprites/widget/slider_handle_highlighted.png",
    "gui/language.png": "gui/sprites/icon/language.png",
    "gui/music_notes.png": "gui/sprites/icon/music_notes.png",
    "item/diamond_pickaxe.png": "item/diamond_pickaxe.png",
    "item/map.png": "item/map.png",
    "item/ender_pearl.png": "item/ender_pearl.png",
    "item/redstone.png": "item/redstone.png",
    "item/writable_book.png": "item/writable_book.png",
    "item/name_tag.png": "item/name_tag.png",
    "item/music_disc_cat.png": "item/music_disc_cat.png",
    "item/goat_horn.png": "item/goat_horn.png",
    "item/enchanted_book.png": "item/enchanted_book.png",
    "item/compass.png": "item/compass_00.png",
    "item/bundle.png": "item/bundle.png",
    "item/knowledge_book.png": "item/knowledge_book.png",
    "item/book.png": "item/book.png",
    "item/clock_night.png": "item/clock_32.png",
    "item/lead.png": "item/lead.png",
    "item/firework_rocket.png": "item/firework_rocket.png",
    "item/command_block_minecart.png": "item/command_block_minecart.png",
    "item/cake.png": "item/cake.png",
    "item/nether_star.png": "item/nether_star.png",
    "item/music_disc_13.png": "item/music_disc_13.png",
    "item/music_disc_blocks.png": "item/music_disc_blocks.png",
    "item/music_disc_chirp.png": "item/music_disc_chirp.png",
    "item/music_disc_far.png": "item/music_disc_far.png",
    "item/music_disc_mall.png": "item/music_disc_mall.png",
    "gui/hotbar.png": "gui/sprites/hud/hotbar.png",
    "gui/hotbar_selection.png": "gui/sprites/hud/hotbar_selection.png",
    "gui/experience_bar_background.png": "gui/sprites/hud/experience_bar_background.png",
    "gui/experience_bar_progress.png": "gui/sprites/hud/experience_bar_progress.png",
    "block/dirt.png": "block/dirt.png",
    "item/water_bucket.png": "item/water_bucket.png",
    "block/bookshelf.png": "block/bookshelf.png",
    "item/experience_bottle.png": "item/experience_bottle.png",
    "item/brush.png": "item/brush.png",
    "item/globe_banner_pattern.png": "item/globe_banner_pattern.png",
    "block/structure_block.png": "block/structure_block.png",
    "item/skull_banner_pattern.png": "item/skull_banner_pattern.png",
    "item/gold_ingot.png": "item/gold_ingot.png",
    "item/bell.png": "item/bell.png",
    "block/destroy_stage_0.png": "block/destroy_stage_0.png",
    "block/destroy_stage_1.png": "block/destroy_stage_1.png",
    "block/destroy_stage_2.png": "block/destroy_stage_2.png",
    "block/destroy_stage_3.png": "block/destroy_stage_3.png",
    "block/destroy_stage_4.png": "block/destroy_stage_4.png",
    "block/destroy_stage_5.png": "block/destroy_stage_5.png",
    "block/destroy_stage_6.png": "block/destroy_stage_6.png",
    "block/destroy_stage_7.png": "block/destroy_stage_7.png",
    "block/destroy_stage_8.png": "block/destroy_stage_8.png",
    "block/destroy_stage_9.png": "block/destroy_stage_9.png",
    "misc/enchanted_glint_item.png": "misc/enchanted_glint_item.png",
    "map/map_background.png": "map/map_background.png",
    "map/player.png": "map/decorations/player.png",
    "map/white_banner.png": "map/decorations/white_banner.png",
    "map/red_x.png": "map/decorations/red_x.png",
    "entity/experience_orb.png": "entity/experience/experience_orb.png",
    "item/phantom_membrane.png": "item/phantom_membrane.png",
    "item/diamond.png": "item/diamond.png",
    "item/echo_shard.png": "item/echo_shard.png",
    "item/totem_of_undying.png": "item/totem_of_undying.png",
    "block/jukebox_side.png": "block/jukebox_side.png",
    "item/gunpowder.png": "item/gunpowder.png",
}
ADDITIVE = {
    "sky/sun.png": "environment/celestial/sun.png",
    "sky/moon.png": "environment/celestial/moon/full_moon.png",
}
CLOUDS = ("sky/clouds.png", "environment/clouds.png")
# 爆炸粒子的 16 格動畫接成一條橫向圖，網頁用 background-position 逐格播放
EXPLOSION = ("particle/explosion.png", [f"particle/explosion_{i}.png" for i in range(16)])
# 煙火火花：遊戲裡從 spark_7 播到 spark_0（由大變小），灰階圖，網頁上再染成煙火的顏色
SPARK = ("particle/spark.png", [f"particle/spark_{i}.png" for i in range(7, -1, -1)])
# 藥水碎裂的粒子（經驗瓶）：同樣是灰階，從 effect_7 播到 effect_0
# 按鈕上的閃光（終界燭的粒子）：從 glitter_7 播到 glitter_0
GLITTER = ("particle/glitter.png", [f"particle/glitter_{i}.png" for i in range(7, -1, -1)])
EFFECT = ("particle/effect.png", [f"particle/effect_{i}.png" for i in range(7, -1, -1)])
GRASS_TINT = (0x91, 0xBD, 0x59)  # 平原生態域的草地顏色
FAVICON_SCALE = 4


def load(rel: str) -> Image.Image:
    path = SOURCE / rel
    if not path.is_file():
        raise SystemExit(f"找不到素材：{path}")
    return Image.open(path).convert("RGBA")


def save(img: Image.Image, rel: str) -> None:
    out = OUTPUT / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, optimize=True)


def rgba_pixels(img: Image.Image):
    """Pillow 12+ 改用 get_flattened_data，舊版沿用 getdata。"""
    getter = getattr(img, "get_flattened_data", None) or img.getdata
    return getter()


def brightness_to_alpha(img: Image.Image) -> Image.Image:
    """黑底疊加圖 -> 透明底：透明度 = 最亮的色版，顏色等比例放大回原亮度。"""
    pixels = [
        (0, 0, 0, 0)
        if (peak := max(r, g, b)) == 0
        else (r * 255 // peak, g * 255 // peak, b * 255 // peak, peak * a // 255)
        for r, g, b, a in rgba_pixels(img)
    ]
    out = Image.new("RGBA", img.size)
    out.putdata(pixels)
    return out


def white_mask(img: Image.Image) -> Image.Image:
    pixels = [(255, 255, 255, 255) if r > 127 else (0, 0, 0, 0) for r, _, _, _ in rgba_pixels(img)]
    out = Image.new("RGBA", img.size)
    out.putdata(pixels)
    return out


def tint(img: Image.Image, color: tuple[int, int, int]) -> Image.Image:
    pixels = [(r * color[0] // 255, g * color[1] // 255, b * color[2] // 255, a) for r, g, b, a in rgba_pixels(img)]
    out = Image.new("RGBA", img.size)
    out.putdata(pixels)
    return out


def strip(frames: list[str]) -> Image.Image:
    images = [load(f) for f in frames]
    width, height = images[0].size
    out = Image.new("RGBA", (width * len(images), height))
    for i, img in enumerate(images):
        out.paste(img, (i * width, 0))
    return out


def favicon() -> Image.Image:
    block = load("block/grass_block_side.png")
    block.alpha_composite(tint(load("block/grass_block_side_overlay.png"), GRASS_TINT))
    return block.resize((block.width * FAVICON_SCALE, block.height * FAVICON_SCALE), Image.NEAREST)


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    if not SOURCE.is_dir():
        raise SystemExit(f"找不到 {SOURCE}，請先把 Minecraft 素材放進 minecraft-assets/")

    for out, src in COPIES.items():
        save(load(src), out)
    for out, src in ADDITIVE.items():
        save(brightness_to_alpha(load(src)), out)
    save(white_mask(load(CLOUDS[1])), CLOUDS[0])
    save(strip(EXPLOSION[1]), EXPLOSION[0])
    save(strip(SPARK[1]), SPARK[0])
    save(strip(EFFECT[1]), EFFECT[0])
    save(strip(GLITTER[1]), GLITTER[0])
    favicon().save(ROOT / "public" / "favicon.png", optimize=True)

    files = sorted(OUTPUT.rglob("*.png"))
    total = sum(f.stat().st_size for f in files) / 1024
    print(f"{len(files)} 張 -> {OUTPUT.relative_to(ROOT)} ({total:.1f} KB) + public/favicon.png")



if __name__ == "__main__":
    main()
