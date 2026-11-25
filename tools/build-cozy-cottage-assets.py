import math
import os
import random
from PIL import Image

OUT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "assets",
    "habitat",
    "cozy-cottage",
)


def rgba(hex_str: str, alpha: int = 255) -> tuple[int, int, int, int]:
    h = hex_str.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), alpha)


# Official Cozy Cottage palette + tonal ramps
OUTLINE = rgba("#302638")

WOOD_DEEP = rgba("#3B221B")
WOOD_DARK = rgba("#56352C")
WOOD_MID = rgba("#A96B45")
WOOD_LIGHT = rgba("#C98B5E")
WOOD_HI = rgba("#E0AA7C")

PLASTER_DEEP = rgba("#B58558")
PLASTER_SH = rgba("#D8AC79")
PLASTER_MID = rgba("#F1CFA2")
PLASTER_HI = rgba("#FCE4C2")

ROOF_DEEP = rgba("#1C273A")
ROOF_SH = rgba("#293A54")
ROOF_MID = rgba("#456487")
ROOF_LIGHT = rgba("#6688AD")
ROOF_HI = rgba("#89AACD")

MOSS_SH = rgba("#485B24")
MOSS_MID = rgba("#71883E")
MOSS_LIGHT = rgba("#B5C45C")
MOSS_HI = rgba("#D6E27B")

ROSE_DEEP = rgba("#883C57")
ROSE_SH = rgba("#B85D7A")
ROSE_MID = rgba("#E68BA7")
ROSE_HI = rgba("#FFD1E0")

AMBER_DEEP = rgba("#B5651E")
AMBER_WARM = rgba("#E69934")
AMBER_MID = rgba("#FFC45C")
AMBER_CORE = rgba("#FFF0B3")
AMBER_WHITE = rgba("#FFFBE0")

NIGHT_SH = rgba("#282C40")
NIGHT_MID = rgba("#3C425C")
NIGHT_REFL = rgba("#5E6A91")

STONE_DEEP = rgba("#4B4346")
STONE_SH = rgba("#6E6462")
STONE_MID = rgba("#9E938B")
STONE_HI = rgba("#CFC4BA")

BRICK_SH = rgba("#7A5752")
BRICK_MID = rgba("#A67E75")
BRICK_HI = rgba("#CCA89B")

CREAM_WHITE = rgba("#FFF5E6")
CREAM_SH = rgba("#DFCBB8")


def blend_pixel(
    dst: tuple[int, int, int, int], src: tuple[int, int, int, int]
) -> tuple[int, int, int, int]:
    sa = src[3]
    if sa == 0:
        return dst
    if sa == 255 or dst[3] == 0:
        return src
    da = dst[3]
    inv_sa = 255 - sa
    out_a = sa + (da * inv_sa) // 255
    if out_a == 0:
        return (0, 0, 0, 0)
    r = (src[0] * sa + dst[0] * da * inv_sa // 255) // out_a
    g = (src[1] * sa + dst[1] * da * inv_sa // 255) // out_a
    b = (src[2] * sa + dst[2] * da * inv_sa // 255) // out_a
    return (min(255, r), min(255, g), min(255, b), min(255, out_a))


class PixelCanvas:
    """Integer-grid RGBA pixel buffer for crisp pixel-art synthesis."""

    def __init__(self, width: int, height: int):
        self.w = width
        self.h = height
        self.img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        self.px = self.img.load()

    def in_bounds(self, x: int, y: int) -> bool:
        return 0 <= x < self.w and 0 <= y < self.h

    def get(self, x: int, y: int) -> tuple[int, int, int, int]:
        if not self.in_bounds(x, y):
            return (0, 0, 0, 0)
        return self.px[x, y]

    def set(self, x: int, y: int, col: tuple[int, int, int, int], overwrite: bool = False):
        if not self.in_bounds(x, y):
            return
        if overwrite or col[3] == 255:
            self.px[x, y] = col
        elif col[3] > 0:
            self.px[x, y] = blend_pixel(self.px[x, y], col)

    def rect(self, x0: int, y0: int, x1: int, y1: int, col: tuple[int, int, int, int], overwrite: bool = False):
        for y in range(max(0, y0), min(self.h, y1 + 1)):
            for x in range(max(0, x0), min(self.w, x1 + 1)):
                self.set(x, y, col, overwrite=overwrite)

    def line(self, x0: int, y0: int, x1: int, y1: int, col: tuple[int, int, int, int]):
        dx = abs(x1 - x0)
        dy = -abs(y1 - y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx + dy
        x, y = x0, y0
        while True:
            self.set(x, y, col)
            if x == x1 and y == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x += sx
            if e2 <= dx:
                err += dx
                y += sy

    def disk(self, cx: float, cy: float, r: float, col: tuple[int, int, int, int]):
        r2 = r * r
        for y in range(int(math.floor(cy - r)), int(math.ceil(cy + r)) + 1):
            for x in range(int(math.floor(cx - r)), int(math.ceil(cx + r)) + 1):
                if (x - cx) ** 2 + (y - cy) ** 2 <= r2:
                    self.set(x, y, col)

    def apply_outline(
        self,
        outline_col: tuple[int, int, int, int] = OUTLINE,
        alpha_thresh: int = 128,
        diagonal: bool = False,
    ):
        neighbors = [(-1, 0), (1, 0), (0, -1), (0, 1)]
        if diagonal:
            neighbors += [(-1, -1), (1, -1), (-1, 1), (1, 1)]
        to_mark: list[tuple[int, int]] = []
        for y in range(self.h):
            for x in range(self.w):
                if self.px[x, y][3] == 0:
                    for dx, dy in neighbors:
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < self.w and 0 <= ny < self.h:
                            if self.px[nx, ny][3] >= alpha_thresh:
                                to_mark.append((x, y))
                                break
        for x, y in to_mark:
            self.px[x, y] = outline_col

    def blit(self, src: "PixelCanvas", dx: int = 0, dy: int = 0):
        for y in range(src.h):
            ty = y + dy
            if ty < 0 or ty >= self.h:
                continue
            for x in range(src.w):
                tx = x + dx
                if tx < 0 or tx >= self.w:
                    continue
                c = src.px[x, y]
                if c[3] > 0:
                    self.set(tx, ty, c)

    def save(self, filename: str):
        path = os.path.join(OUT_DIR, filename)
        self.img.save(path, format="PNG")


def bayer2(x: int, y: int) -> int:
    """2x2 Bayer pattern value in {0, 1, 2, 3} for crisp pixel dithering."""
    return ((x & 1) << 1) ^ (y & 1)


def draw_foliage_cluster(
    target: PixelCanvas,
    blobs: list[tuple[float, float, float]],
    palette: tuple[tuple[int, int, int, int], tuple[int, int, int, int], tuple[int, int, int, int], tuple[int, int, int, int]],
    rng: random.Random,
    with_flowers: list[tuple[int, int, tuple[int, int, int, int]]] | None = None,
    outline: tuple[int, int, int, int] = OUTLINE,
):
    """Draw an organic multi-blob pixel foliage cluster with 4-tone directional shading + outline."""
    deep_sh, mid, light, hi = palette
    min_x = max(0, int(min(cx - r for cx, _, r in blobs)) - 2)
    max_x = min(target.w - 1, int(max(cx + r for cx, _, r in blobs)) + 2)
    min_y = max(0, int(min(cy - r for _, cy, r in blobs)) - 2)
    max_y = min(target.h - 1, int(max(cy + r for _, cy, r in blobs)) + 2)
    if max_x < min_x or max_y < min_y:
        return

    w = max_x - min_x + 1
    h = max_y - min_y + 1
    buf = PixelCanvas(w, h)

    # First pass: compute membership and lighting score per pixel
    for gy in range(min_y, max_y + 1):
        for gx in range(min_x, max_x + 1):
            best_score = -999.0
            best_blob = None
            for cx, cy, r in blobs:
                dx = gx - cx
                dy = gy - cy
                # Subtle scalloped edge wobble
                ang = math.atan2(dy, dx)
                wobble = 0.65 * math.sin(ang * 5.0 + cx * 0.3)
                d = math.hypot(dx, dy)
                norm = (r + wobble - d) / max(1.0, r)
                if norm >= 0 and norm > best_score:
                    best_score = norm
                    best_blob = (cx, cy, r, dx, dy)
            if best_blob is not None:
                cx, cy, r, dx, dy = best_blob
                # Top-left sun direction (-0.65, -0.75)
                sun = (-dx * 0.65 - dy * 0.75) / max(1.0, r)
                # Edge darkening near lower-right rim
                dith = (bayer2(gx, gy) - 1.5) * 0.12
                val = sun + dith + best_score * 0.35
                if val > 0.68:
                    col = hi
                elif val > 0.18:
                    col = light
                elif val > -0.32:
                    col = mid
                else:
                    col = deep_sh
                buf.set(gx - min_x, gy - min_y, col)

    # Sprinkle crisp leaf-pixel clusters inside lit zone
    for gy in range(min_y + 1, max_y):
        for gx in range(min_x + 1, max_x):
            lx, ly = gx - min_x, gy - min_y
            c = buf.get(lx, ly)
            if c == light and rng.random() < 0.08:
                buf.set(lx, ly, hi)
            elif c == mid and rng.random() < 0.06:
                buf.set(lx, ly, deep_sh)

    if with_flowers:
        for fx, fy, fcol in with_flowers:
            lx, ly = fx - min_x, fy - min_y
            if buf.get(lx, ly)[3] > 0:
                buf.set(lx, ly, AMBER_MID)
                for ox, oy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    buf.set(lx + ox, ly + oy, fcol)

    buf.apply_outline(outline)
    target.blit(buf, min_x, min_y)


def draw_tiny_flower(c: PixelCanvas, x: int, y: int, petal_col: tuple[int, int, int, int], outline: bool = True):
    """Draw a 5px cross blossom with optional dark pixel outline."""
    if outline:
        for ox, oy in [(-2, 0), (2, 0), (0, -2), (0, 2), (-1, -1), (1, -1), (-1, 1), (1, 1)]:
            c.set(x + ox, y + oy, OUTLINE)
    c.set(x, y, AMBER_MID)
    for ox, oy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        c.set(x + ox, y + oy, petal_col)


def draw_mushroom(c: PixelCanvas, bx: int, by: int, size: str = "med"):
    """Draw a red-capped spotted pixel mushroom with base at (bx, by)."""
    m = PixelCanvas(15, 16)
    cx, cy = 7, 13
    if size == "small":
        # Stem
        m.rect(cx - 1, cy - 3, cx + 1, cy, CREAM_SH)
        m.set(cx - 1, cy - 2, CREAM_WHITE)
        m.set(cx - 1, cy - 1, CREAM_WHITE)
        # Cap
        for dx in range(-3, 4):
            m.set(cx + dx, cy - 4, rgba("#B3323B"))
        for dx in range(-3, 4):
            m.set(cx + dx, cy - 5, rgba("#D94A4A"))
        for dx in range(-2, 3):
            m.set(cx + dx, cy - 6, rgba("#E8665E"))
        for dx in range(-1, 2):
            m.set(cx + dx, cy - 7, rgba("#E8665E"))
        # Spots
        m.set(cx - 2, cy - 5, CREAM_WHITE)
        m.set(cx + 1, cy - 6, CREAM_WHITE)
        m.set(cx + 2, cy - 4, CREAM_WHITE)
    else:
        # Stem
        m.rect(cx - 2, cy - 5, cx + 2, cy, CREAM_SH)
        m.rect(cx - 1, cy - 4, cx, cy - 1, CREAM_WHITE)
        m.rect(cx - 1, cy - 5, cx + 1, cy - 5, rgba("#B89E8A"))
        # Cap dome
        for dx in range(-5, 6):
            m.set(cx + dx, cy - 6, rgba("#A62B35"))
        for dx in range(-5, 6):
            m.set(cx + dx, cy - 7, rgba("#D94A4A"))
        for dx in range(-4, 5):
            m.set(cx + dx, cy - 8, rgba("#D94A4A"))
        for dx in range(-3, 4):
            m.set(cx + dx, cy - 9, rgba("#ED6B5E"))
        for dx in range(-2, 3):
            m.set(cx + dx, cy - 10, rgba("#ED6B5E"))
        # White dots
        m.rect(cx - 3, cy - 8, cx - 2, cy - 7, CREAM_WHITE)
        m.set(cx + 1, cy - 9, CREAM_WHITE)
        m.set(cx + 2, cy - 8, CREAM_WHITE)
        m.set(cx + 3, cy - 7, CREAM_WHITE)
    m.apply_outline(OUTLINE)
    c.blit(m, bx - cx, by - cy)


def draw_stepping_stone(c: PixelCanvas, cx: int, cy: int, rx: int, ry: int, rng: random.Random):
    """Draw a beveled, outlined irregular cobblestone centered at (cx, cy)."""
    w, h = rx * 2 + 7, ry * 2 + 7
    ox, oy = w // 2, h // 2
    s = PixelCanvas(w, h)
    phase = (cx * 0.37 + cy * 0.19)
    for y in range(h):
        for x in range(w):
            dx = (x - ox) / max(1, rx)
            dy = (y - oy) / max(1, ry)
            ang = math.atan2(dy, dx)
            r_mod = 1.0 + 0.12 * math.sin(ang * 3.0 + phase) + 0.08 * math.cos(ang * 2.0 - phase)
            d = math.hypot(dx, dy) / r_mod
            if d <= 1.0:
                if dy > 0.42:
                    col = STONE_DEEP
                elif dy > 0.12:
                    col = STONE_SH
                elif dy < -0.32 or (dx < -0.38 and dy < 0.2):
                    col = STONE_HI
                else:
                    col = STONE_MID if bayer2(x, y) < 3 else STONE_SH
                if d > 0.84 and dy > 0.1:
                    col = STONE_DEEP
                s.set(x, y, col)
    # Tiny moss pixel accent on one corner
    s.set(ox - rx + 1, oy, MOSS_MID)
    s.apply_outline(OUTLINE)
    c.blit(s, cx - ox, cy - oy)


def draw_book_stack(c: PixelCanvas, bx: int, by: int, books: list[tuple[int, tuple, tuple, tuple]], outline: bool = True):
    """Draw stacked hardcover pixel books with spines, pages, and shading.

    books: list from bottom to top of (width, cover_mid, cover_hi, cover_sh).
    """
    b_canvas = PixelCanvas(32, 32)
    cur_y = 29
    for idx, (bw, cmid, chi, csh) in enumerate(books):
        x0 = 4 + (idx % 2)
        x1 = x0 + bw - 1
        # 5px tall book: top cover, pages, bottom cover
        b_canvas.rect(x0, cur_y - 4, x1, cur_y - 3, chi)
        b_canvas.rect(x0 + 1, cur_y - 2, x1 - 1, cur_y - 1, CREAM_WHITE)
        b_canvas.set(x0 + 1, cur_y - 2, CREAM_SH)
        b_canvas.rect(x0, cur_y - 1, x1, cur_y - 1, csh)
        # Spine on left
        b_canvas.rect(x0, cur_y - 4, x0 + 2, cur_y - 1, cmid)
        b_canvas.set(x0 + 1, cur_y - 3, AMBER_MID)
        # Page edge lines
        for px_i in range(x0 + 4, x1 - 1, 3):
            b_canvas.set(px_i, cur_y - 2, CREAM_SH)
        cur_y -= 4
    if outline:
        b_canvas.apply_outline(OUTLINE)
    c.blit(b_canvas, bx - 4, by - 29)


def draw_mug(c: PixelCanvas, x: int, y: int, with_heart: bool = True, steam: bool = True):
    """Draw a cozy ceramic mug with heart motif and optional steam wisps; bottom at y."""
    m = PixelCanvas(16, 18)
    mx, my = 4, 15
    # Body (7x7)
    m.rect(mx, my - 6, mx + 6, my, CREAM_WHITE)
    m.rect(mx + 5, my - 5, mx + 6, my, CREAM_SH)
    m.rect(mx + 1, my - 6, mx + 5, my - 6, rgba("#6E4432"))  # coffee rim
    m.set(mx + 2, my - 6, rgba("#9E6445"))
    # Handle on right
    m.set(mx + 7, my - 5, CREAM_SH)
    m.set(mx + 8, my - 4, CREAM_SH)
    m.set(mx + 8, my - 3, CREAM_SH)
    m.set(mx + 7, my - 2, CREAM_SH)
    # Heart
    if with_heart:
        hcol = rgba("#D94A4A")
        m.set(mx + 2, my - 4, hcol)
        m.set(mx + 4, my - 4, hcol)
        m.rect(mx + 2, my - 3, mx + 4, my - 3, hcol)
        m.set(mx + 3, my - 2, hcol)
    m.apply_outline(OUTLINE)
    if steam:
        s1 = rgba("#FFF5E6", 170)
        s2 = rgba("#FFF5E6", 110)
        m.set(mx + 2, my - 8, s1)
        m.set(mx + 3, my - 9, s1)
        m.set(mx + 2, my - 10, s2)
        m.set(mx + 5, my - 9, s1)
        m.set(mx + 4, my - 11, s2)
    c.blit(m, x - mx, y - my)


def draw_mini_lantern(c: PixelCanvas, cx: int, by: int, warm: bool = True):
    """Draw a standing/low cozy lantern with base at (cx, by)."""
    l = PixelCanvas(16, 20)
    lx, ly = 7, 17
    # Base
    l.rect(lx - 3, ly - 1, lx + 3, ly, WOOD_DARK)
    l.rect(lx - 2, ly - 2, lx + 2, ly - 2, WOOD_MID)
    # Glass chamber
    l.rect(lx - 2, ly - 8, lx + 2, ly - 3, AMBER_MID if warm else NIGHT_MID)
    if warm:
        l.rect(lx - 1, ly - 7, lx + 1, ly - 4, AMBER_CORE)
        l.set(lx, ly - 6, AMBER_WHITE)
    else:
        l.set(lx - 1, ly - 7, NIGHT_REFL)
    # Side struts
    l.line(lx - 3, ly - 8, lx - 3, ly - 2, WOOD_DARK)
    l.line(lx + 3, ly - 8, lx + 3, ly - 2, WOOD_DARK)
    # Roof cap + ring
    l.rect(lx - 4, ly - 9, lx + 4, ly - 9, WOOD_MID)
    l.rect(lx - 3, ly - 10, lx + 3, ly - 10, WOOD_DARK)
    l.rect(lx - 2, ly - 11, lx + 2, ly - 11, WOOD_MID)
    l.set(lx, ly - 12, AMBER_WARM)
    l.apply_outline(OUTLINE)
    c.blit(l, cx - lx, by - ly)


# ---------------------------------------------------------------------------
# 1. layer-0-shadow.png
# ---------------------------------------------------------------------------
def build_layer_0_shadow():
    c = PixelCanvas(320, 192)
    outer_col = (20, 16, 24, 45)
    inner_col = (20, 16, 24, 90)
    cx, cy = 160, 173
    for y in range(152, 191):
        for x in range(14, 306):
            dx = (x - cx) / 142.0
            dy = (y - cy) / 16.0
            d2 = dx * dx + dy * dy
            # Pixel-stepped organic irregularity
            if d2 <= 0.72:
                c.set(x, y, inner_col, overwrite=True)
            elif d2 <= 1.0:
                c.set(x, y, outer_col, overwrite=True)
    c.save("layer-0-shadow.png")


# ---------------------------------------------------------------------------
# 2. layer-1-backdrop.png (cherry tree left, leafy oak right, brick chimney)
# ---------------------------------------------------------------------------
def build_layer_1_backdrop():
    rng = random.Random(101)
    c = PixelCanvas(320, 192)

    # --- Left: Cherry Blossom Tree (behind cottage left eaves) ---
    trunk = PixelCanvas(320, 192)
    for y in range(64, 140):
        t = (y - 64) / 76.0
        flare = 3 if y > 130 else (1 if y > 122 else 0)
        half_w = int(4 + t * 4.5 + flare)
        bend = int(math.sin(t * 2.8) * 3)
        cx = 72 + bend
        for x in range(cx - half_w, cx + half_w + 1):
            rel = x - cx
            if x <= cx - half_w + 2:
                col = WOOD_LIGHT
            elif x >= cx + half_w - 2:
                col = WOOD_DEEP
            elif abs(rel) in (1, 4) and ((y + abs(rel) * 3) % 7 < 4):
                col = WOOD_DARK
            else:
                col = WOOD_MID
            trunk.set(x, y, col)
    # Branching limbs into canopy
    for (x0, y0, x1, y1, w) in [
        (71, 74, 44, 52, 3),
        (75, 72, 95, 48, 3),
        (68, 86, 38, 72, 2),
    ]:
        steps = 28
        for i in range(steps + 1):
            f = i / steps
            px = int(x0 + (x1 - x0) * f)
            py = int(y0 + (y1 - y0) * f)
            trunk.disk(px, py, max(1.2, w * (1 - f * 0.45)), WOOD_DARK)
            trunk.disk(px - 1, py - 1, max(0.8, w * 0.4), WOOD_MID)
    trunk.apply_outline(OUTLINE)
    c.blit(trunk)

    cherry_pal = (ROSE_DEEP, ROSE_SH, ROSE_MID, ROSE_HI)
    cherry_blobs = [
        (54, 34, 17), (76, 26, 20), (98, 34, 17),
        (36, 48, 16), (60, 44, 19), (86, 48, 19), (108, 52, 16),
        (28, 66, 14), (47, 66, 15), (72, 62, 16),
        (98, 66, 14),
    ]
    cherry_flowers = [
        (44, 38, CREAM_WHITE), (76, 20, CREAM_WHITE), (92, 40, CREAM_WHITE),
        (54, 54, ROSE_HI), (32, 60, CREAM_WHITE), (66, 34, CREAM_WHITE),
    ]
    draw_foliage_cluster(c, cherry_blobs, cherry_pal, rng, with_flowers=cherry_flowers)

    # --- Right: Lush Moss-Green Oak Tree (behind cottage right) ---
    r_trunk = PixelCanvas(320, 192)
    for y in range(66, 138):
        t = (y - 66) / 72.0
        flare = 3 if y > 128 else (1 if y > 120 else 0)
        half_w = int(4 + t * 4 + flare)
        cx = 248 - int(math.sin(t * 2.4) * 3)
        for x in range(cx - half_w, cx + half_w + 1):
            rel = x - cx
            if x <= cx - half_w + 2:
                col = WOOD_LIGHT
            elif x >= cx + half_w - 2:
                col = WOOD_DEEP
            elif abs(rel) in (1, 3) and ((y + abs(rel) * 2) % 6 < 3):
                col = WOOD_DARK
            else:
                col = WOOD_MID
            r_trunk.set(x, y, col)
    for (x0, y0, x1, y1, w) in [(246, 76, 224, 50, 3), (250, 74, 276, 52, 3), (254, 88, 284, 72, 2)]:
        for i in range(25):
            f = i / 24.0
            px = int(x0 + (x1 - x0) * f)
            py = int(y0 + (y1 - y0) * f)
            r_trunk.disk(px, py, max(1.2, w * (1 - f * 0.4)), WOOD_DARK)
    r_trunk.apply_outline(OUTLINE)
    c.blit(r_trunk)

    oak_pal = (MOSS_SH, MOSS_MID, MOSS_LIGHT, MOSS_HI)
    oak_blobs = [
        (232, 36, 17), (255, 29, 20), (276, 39, 17),
        (216, 52, 16), (242, 48, 19), (268, 52, 19), (286, 58, 15),
        (230, 66, 16), (256, 66, 16), (278, 72, 14),
    ]
    draw_foliage_cluster(c, oak_blobs, oak_pal, rng)

    # --- Brick Chimney at top-right of roof (x=179..198, y=24..56, rises cleanly above roof ridge y=38) ---
    chim = PixelCanvas(320, 192)
    # Chimney shaft (x=181..196, y=29..55)
    for y in range(29, 56):
        row_idx = (y - 29) // 4
        is_mortar_h = (y - 29) % 4 == 3
        for x in range(181, 197):
            offset = 4 if (row_idx % 2 == 1) else 0
            is_mortar_v = ((x - 181 + offset) % 7 == 0)
            if is_mortar_h or is_mortar_v:
                col = WOOD_DARK
            else:
                brick_id = (x - 181 + offset) // 7 + row_idx * 3
                if x >= 193:
                    col = BRICK_SH
                elif x <= 184 or brick_id % 3 == 0:
                    col = BRICK_HI if x <= 188 else BRICK_MID
                else:
                    col = BRICK_MID
            chim.set(x, y, col)
    # Stone cap rim (x=179..198, y=25..28)
    chim.rect(179, 25, 198, 28, BRICK_MID)
    chim.rect(179, 25, 198, 25, BRICK_HI)
    chim.rect(194, 25, 198, 28, BRICK_SH)
    chim.rect(180, 29, 197, 29, BRICK_SH)
    # Dark flue rim at top center
    chim.rect(183, 24, 194, 24, BRICK_HI)
    chim.rect(185, 25, 192, 25, OUTLINE)
    # Touch of moss on left cap corner
    chim.rect(179, 26, 181, 28, MOSS_MID)
    chim.set(180, 26, MOSS_LIGHT)
    chim.apply_outline(OUTLINE)
    c.blit(chim)

    c.save("layer-1-backdrop.png")


# ---------------------------------------------------------------------------
# 3 & 4. cottage-night.png + cottage-amber-lights.png (shared exact geometry)
# ---------------------------------------------------------------------------
def build_cottage_and_lights():
    rng = random.Random(202)
    c = PixelCanvas(320, 192)

    # --- A. Irregular Grass Island + Earth Cliff Base ---
    island = PixelCanvas(320, 192)
    # Grass top silhouette boundary y_top(x) and y_bot(x)
    # Spans x=16..303
    def island_bounds(x: int) -> tuple[int, int, int]:
        norm = (x - 160) / 144.0
        if abs(norm) > 1.0:
            return (0, -1, -1)
        curve = math.sqrt(max(0.0, 1.0 - norm * norm))
        wobble_t = int(2.5 * math.sin(x * 0.14) + 1.5 * math.cos(x * 0.31))
        wobble_b = int(2.5 * math.sin(x * 0.18 + 1.1) + 1.5 * math.cos(x * 0.37))
        y_top = int(146 - 24 * curve) + wobble_t
        y_grass_end = int(148 + 26 * curve) + wobble_b
        y_earth_end = y_grass_end + int(6 + 5 * curve)
        return (y_top, y_grass_end, y_earth_end)

    for x in range(16, 305):
        yt, yg, ye = island_bounds(x)
        if yg < yt:
            continue
        # Earth cliff face first
        for y in range(yg - 2, ye + 1):
            lump = ((x // 7) + (y // 4)) % 3
            if y >= ye - 2:
                col = WOOD_DEEP
            elif y >= yg + 3:
                col = WOOD_DARK if lump != 0 else WOOD_MID
            else:
                col = WOOD_MID if lump == 0 else WOOD_DARK
            island.set(x, y, col)
        # Pebbles embedded in soil rim
        if x % 17 == 5 and yg + 3 < ye - 1:
            island.rect(x, yg + 3, x + 2, yg + 4, STONE_MID)
            island.set(x, yg + 3, STONE_HI)

        # Textured 3-tone grass surface
        for y in range(yt, yg + 1):
            dy_edge = yg - y
            dith = bayer2(x, y)
            # Overhanging grass tuft scallops at the bottom edge
            if dy_edge <= 2 and (x % 6 in (0, 5)):
                col = MOSS_SH
            elif dy_edge <= 1:
                col = MOSS_MID
            elif y < yt + 4:
                col = MOSS_MID if dith < 2 else MOSS_SH
            else:
                # Bright sunny lawn patch near center/front
                center_dist = math.hypot((x - 160) / 110.0, (y - 150) / 22.0)
                if center_dist < 0.72 and (dith >= 1 or rng.random() < 0.45):
                    col = MOSS_LIGHT if dith < 3 else MOSS_HI
                elif center_dist < 0.92 and dith >= 2:
                    col = MOSS_LIGHT
                else:
                    col = MOSS_MID if dith < 3 else MOSS_LIGHT
                # Occasional grass blade flecks
                if rng.random() < 0.055 and dy_edge > 4:
                    col = MOSS_HI
            island.set(x, y, col)

    # Extra overhanging grass tufts along front rim
    for x in range(28, 294, 9):
        _, yg, _ = island_bounds(x)
        if yg > 140:
            island.rect(x, yg - 2, x + 3, yg + 1, MOSS_MID)
            island.rect(x + 1, yg - 2, x + 2, yg, MOSS_LIGHT)
            island.set(x + 1, yg + 1, MOSS_SH)

    island.apply_outline(OUTLINE)
    c.blit(island)

    # --- B. Stepping Stones Path from door (160, 134) down-front ---
    draw_stepping_stone(c, 158, 139, 9, 3, rng)
    draw_stepping_stone(c, 165, 148, 10, 4, rng)
    draw_stepping_stone(c, 155, 158, 11, 4, rng)
    draw_stepping_stone(c, 163, 168, 9, 3, rng)

    # --- C. Rustic Wooden Picket Fences & Garden Bushes ---
    def draw_fence_run(x_start: int, x_end: int, y_base: int, post_step: int = 12):
        f = PixelCanvas(320, 192)
        # Rails behind posts
        f.rect(x_start, y_base - 13, x_end, y_base - 11, WOOD_MID)
        f.rect(x_start, y_base - 13, x_end, y_base - 13, WOOD_LIGHT)
        f.rect(x_start, y_base - 11, x_end, y_base - 11, WOOD_DARK)
        f.rect(x_start, y_base - 6, x_end, y_base - 4, WOOD_MID)
        f.rect(x_start, y_base - 6, x_end, y_base - 6, WOOD_LIGHT)
        f.rect(x_start, y_base - 4, x_end, y_base - 4, WOOD_DARK)
        for px in range(x_start, x_end + 1, post_step):
            # Pointed rustic board
            f.rect(px, y_base - 16, px + 4, y_base, WOOD_MID)
            f.rect(px + 1, y_base - 18, px + 3, y_base - 17, WOOD_LIGHT)
            f.set(px + 2, y_base - 19, WOOD_HI)
            f.rect(px, y_base - 16, px + 1, y_base - 1, WOOD_LIGHT)
            f.rect(px + 4, y_base - 16, px + 4, y_base, WOOD_DARK)
            # Nail / wood knot details
            f.set(px + 2, y_base - 12, WOOD_DARK)
            f.set(px + 2, y_base - 5, WOOD_DARK)
        f.apply_outline(OUTLINE)
        c.blit(f)

    # Flower shrubs behind left & right fences
    draw_foliage_cluster(
        c,
        [(44, 128, 12), (58, 124, 11), (72, 129, 10)],
        (MOSS_SH, MOSS_MID, MOSS_LIGHT, MOSS_HI),
        rng,
        with_flowers=[(42, 124, ROSE_MID), (54, 120, ROSE_HI), (64, 126, CREAM_WHITE)],
    )
    draw_foliage_cluster(
        c,
        [(246, 126, 11), (262, 124, 12), (276, 129, 10)],
        (MOSS_SH, MOSS_MID, MOSS_LIGHT, MOSS_HI),
        rng,
        with_flowers=[(248, 124, CREAM_WHITE), (262, 120, ROSE_MID), (274, 126, ROSE_HI)],
    )

    draw_fence_run(28, 88, 139, post_step=12)
    draw_fence_run(228, 288, 138, post_step=12)

    # Small flower tufts along the lawn edges
    draw_tiny_flower(c, 42, 152, CREAM_WHITE)
    draw_tiny_flower(c, 52, 156, ROSE_MID)
    draw_tiny_flower(c, 98, 136, CREAM_WHITE)
    draw_tiny_flower(c, 224, 156, ROSE_MID)
    draw_tiny_flower(c, 282, 150, CREAM_WHITE)

    # --- D. Cottage Structure (Gable + Shingled Roof + Walls + Windows + Lantern Post) ---
    cottage = PixelCanvas(320, 192)

    # 1) Main front plaster wall (x=108..208, y=74..132) + triangular gable peak (158, 41)
    # Right side wall wrap/return (x=209..214, y=74..130) for 3/4 depth
    for y in range(41, 133):
        if y < 74:
            # Gable triangle from apex (158, 41) widening down to y=74 (108..208)
            half = int((y - 41) * (50.0 / 33.0))
            lx0, lx1 = 158 - half, 158 + half
        else:
            lx0, lx1 = 108, 208
        for x in range(lx0, lx1 + 1):
            dist_from_gable_edge = min(x - lx0, lx1 - x) if y < 74 else 99
            if y < 74 and dist_from_gable_edge < 4:
                col = PLASTER_DEEP
            elif 74 <= y <= 79:
                col = PLASTER_SH if y > 76 else PLASTER_DEEP
            elif y >= 127:
                col = PLASTER_SH
            elif x <= 112 or x >= 204:
                col = PLASTER_SH
            else:
                d = bayer2(x, y)
                if y < 86 and d == 0:
                    col = PLASTER_SH
                elif 92 <= y <= 120 and 126 <= x <= 194 and rng.random() < 0.25:
                    col = PLASTER_HI
                else:
                    col = PLASTER_MID
            cottage.set(x, y, col)

    # Subtle plaster masonry speckles
    for _ in range(28):
        px = rng.randint(112, 202)
        py = rng.randint(78, 126)
        cottage.rect(px, py, px + 2, py + 1, PLASTER_SH)

    # Right 3/4 return wall (x=209..213, y=74..130)
    for y in range(74, 131):
        for x in range(209, 214):
            cottage.set(x, y, PLASTER_DEEP if x > 210 else PLASTER_SH)

    # Stone foundation skirt at bottom of cottage walls (y=128..133)
    for x in range(107, 214):
        if 141 <= x <= 178:
            continue  # door step occupies here
        stone_col = STONE_MID if ((x // 5) % 2 == 0) else STONE_SH
        cottage.rect(x, 128, x, 132, stone_col)
        cottage.set(x, 128, STONE_HI if (x % 5 != 0) else STONE_SH)
        cottage.set(x, 132, STONE_DEEP)

    # Timber-frame beams (enxaimel)
    # Horizontal crossbeam below gable (y=72..76)
    cottage.rect(107, 72, 209, 76, WOOD_MID)
    cottage.rect(107, 72, 209, 72, WOOD_LIGHT)
    cottage.rect(107, 76, 209, 76, WOOD_DARK)
    # Vertical corner posts + inner timber posts
    for vx in (107, 138, 178, 206):
        w_post = 4 if vx in (107, 206) else 3
        top_y = 75 if vx in (107, 206) else 77
        cottage.rect(vx, top_y, vx + w_post - 1, 129, WOOD_MID)
        cottage.rect(vx, top_y, vx, 129, WOOD_LIGHT)
        cottage.rect(vx + w_post - 1, top_y, vx + w_post - 1, 129, WOOD_DARK)
    # Vertical beam inside gable above & below attic window
    cottage.rect(157, 43, 159, 49, WOOD_DARK)
    cottage.rect(157, 65, 159, 72, WOOD_MID)
    # Diagonal gable braces
    cottage.line(130, 72, 144, 56, WOOD_MID)
    cottage.line(131, 72, 145, 56, WOOD_DARK)
    cottage.line(186, 72, 172, 56, WOOD_MID)
    cottage.line(185, 72, 171, 56, WOOD_DARK)

    # 2) Slate-Blue Shingled Roof (peak y=37 so chimney at y=24..40 rises visibly above ridge!)
    roof = PixelCanvas(320, 192)
    # Back-right pitched roof slope: ridge from (158, 37) to (200, 39), eave from (212, 74) to (228, 70)
    for y in range(37, 76):
        t = (y - 37) / 38.0
        slope_left = int(158 + t * (212 - 158))
        slope_right = int(200 + t * (228 - 200))
        shingle_row = (y - 37) // 5
        in_seam_h = (y - 37) % 5 == 4
        for x in range(slope_left, slope_right + 1):
            shingle_w = 7
            offset = 3 if (shingle_row % 2 == 1) else 0
            local_x = (x - slope_left + offset)
            in_seam_v = (local_x % shingle_w == 0)
            if in_seam_h or in_seam_v:
                col = ROOF_DEEP
            elif (y - 37) % 5 == 0:
                col = ROOF_LIGHT if x < slope_right - 5 else ROOF_MID
            elif x >= slope_right - 4 or y >= 72:
                col = ROOF_SH
            else:
                tile_var = ((local_x // shingle_w) + shingle_row * 2) % 3
                col = ROOF_MID if tile_var != 0 else ROOF_SH
                if (y - 37) % 5 == 1 and tile_var == 1:
                    col = ROOF_LIGHT
            roof.set(x, y, col)
    # Scalloped bottom eave edge on right roof slope
    for x in range(211, 229, 4):
        ey = int(74 - (x - 212) * 0.25)
        roof.rect(x, ey, x + 2, ey + 1, ROOF_SH)

    # Left outer roof overhang & front gable bargeboards (timber rafters framing the gable)
    # Left roof edge slope from (158, 37) to (96, 76)
    for i in range(65):
        f = i / 64.0
        gx = int(158 - f * 62)
        gy = int(37 + f * 39)
        for dy in range(-6, 1):
            if dy == -6:
                col = ROOF_LIGHT
            elif dy == -3 and (i % 7 < 2):
                col = ROOF_DEEP
            else:
                col = ROOF_MID if dy < -1 else ROOF_SH
            roof.set(gx, gy + dy, col)
        for dy in range(1, 5):
            roof.set(gx, gy + dy, WOOD_LIGHT if dy == 1 else (WOOD_MID if dy < 4 else WOOD_DARK))
    # Right front gable bargeboard from (158, 37) to (213, 74)
    for i in range(60):
        f = i / 59.0
        gx = int(158 + f * 55)
        gy = int(37 + f * 37)
        for dy in range(-3, 1):
            roof.set(gx, gy + dy, ROOF_SH if dy > -2 else ROOF_MID)
        for dy in range(1, 5):
            roof.set(gx, gy + dy, WOOD_MID if dy < 4 else WOOD_DARK)

    # Ridge beam & circular end-grain log cap at apex (158, 41)
    roof.rect(158, 35, 200, 39, WOOD_MID)
    roof.rect(158, 35, 200, 36, WOOD_LIGHT)
    roof.disk(158, 40, 4.2, WOOD_MID)
    roof.disk(158, 40, 2.2, WOOD_LIGHT)
    roof.set(158, 40, WOOD_DARK)

    roof.apply_outline(OUTLINE)
    cottage.blit(roof)

    # Curved blue-shingle eyebrow hood above the door (x=142..174, y=77..85)
    hood = PixelCanvas(320, 192)
    for x in range(142, 175):
        dx = (x - 158) / 16.0
        arch_y = int(78 + dx * dx * 5.0)
        for dy in range(0, 5):
            if dy == 0:
                col = ROOF_LIGHT
            elif dy < 3:
                col = ROOF_MID if ((x + dy) % 4 != 0) else ROOF_SH
            elif dy == 3:
                col = ROOF_SH
            else:
                col = ROOF_DEEP
            hood.set(x, arch_y + dy, col)
    hood.apply_outline(OUTLINE)
    cottage.blit(hood)

    # 3) Lush Continuous Moss & Vine Clusters on Roof (overlapping organic blanket, leaving slate tiles readable)
    moss_pal = (MOSS_SH, MOSS_MID, MOSS_LIGHT, MOSS_HI)
    moss_blobs = [
        # Continuous draped blanket down left gable edge
        (150, 37, 6.5), (144, 41, 6.0), (137, 45, 6.5), (130, 50, 6.0),
        (122, 55, 6.5), (114, 60, 6.0), (106, 65, 5.5), (100, 69, 4.5),
        # Peak & gentle cascade down upper-right ridge (stops before chimney x=181)
        (166, 38, 6.0), (173, 41, 5.5), (168, 45, 5.0),
        # Lush floral cluster on lower-right eave
        (214, 59, 7.0), (221, 62, 6.5), (208, 63, 5.5), (224, 68, 5.0),
    ]
    moss_flowers = [
        (140, 42, rgba("#FFE875")), (120, 54, CREAM_WHITE),
        (213, 58, CREAM_WHITE), (221, 63, ROSE_MID),
    ]
    draw_foliage_cluster(cottage, moss_blobs, moss_pal, rng, with_flowers=moss_flowers)

    # Hanging ivy vine tendrils over left gable beam & right roof eave
    for vx, vy, vlen in [(128, 60, 10), (134, 63, 8), (212, 69, 9), (222, 71, 7)]:
        for dy in range(vlen):
            sway = int(math.sin(dy * 0.6) * 1.2)
            cottage.set(vx + sway, vy + dy, OUTLINE)
            cottage.set(vx + sway + 1, vy + dy, MOSS_MID if dy % 2 == 0 else MOSS_LIGHT)

    # 4) Windows (unlit night glass) + Shutters + Flower Boxes
    # Attic round window centered at (158, 56)
    attic_cx, attic_cy = 158, 56
    attic = PixelCanvas(320, 192)
    attic.disk(attic_cx, attic_cy, 8.2, WOOD_MID)
    attic.disk(attic_cx, attic_cy, 7.0, WOOD_DARK)
    attic.disk(attic_cx, attic_cy, 5.8, NIGHT_MID)
    # Crossbars
    attic.rect(attic_cx - 1, attic_cy - 6, attic_cx, attic_cy + 6, WOOD_MID)
    attic.rect(attic_cx - 6, attic_cy - 1, attic_cx + 6, attic_cy, WOOD_MID)
    # Subtle glass reflection on upper-left pane
    attic.set(attic_cx - 4, attic_cy - 3, NIGHT_REFL)
    attic.set(attic_cx - 3, attic_cy - 4, NIGHT_REFL)
    attic.set(attic_cx - 3, attic_cy - 3, NIGHT_REFL)
    attic.apply_outline(OUTLINE)
    cottage.blit(attic)

    # Side rectangular windows: left (x=117..129, y=89..103), right (x=191..203, y=89..103)
    side_windows = [
        (117, 89, 129, 103),
        (191, 89, 203, 103),
    ]
    for wx0, wy0, wx1, wy1 in side_windows:
        win = PixelCanvas(320, 192)
        # Outer frame
        win.rect(wx0 - 2, wy0 - 2, wx1 + 2, wy1 + 2, WOOD_DARK)
        win.rect(wx0 - 1, wy0 - 1, wx1 + 1, wy1 + 1, WOOD_MID)
        # Glass
        win.rect(wx0, wy0, wx1, wy1, NIGHT_MID)
        # Subtle diagonal reflection
        win.line(wx0 + 1, wy0 + 3, wx0 + 3, wy0 + 1, NIGHT_REFL)
        win.line(wx0 + 2, wy0 + 4, wx0 + 4, wy0 + 2, NIGHT_REFL)
        # Wooden crossbars
        mid_x = (wx0 + wx1) // 2
        mid_y = (wy0 + wy1) // 2
        win.rect(mid_x, wy0, mid_x, wy1, WOOD_MID)
        win.rect(wx0, mid_y, wx1, mid_y, WOOD_MID)
        # Slatted shutters left & right
        for sx0, sx1 in [(wx0 - 6, wx0 - 3), (wx1 + 3, wx1 + 6)]:
            win.rect(sx0, wy0, sx1, wy1, WOOD_MID)
            for sy in range(wy0 + 2, wy1, 3):
                win.rect(sx0, sy, sx1, sy, WOOD_DARK)
        # Wooden flower box underneath
        win.rect(wx0 - 5, wy1 + 3, wx1 + 5, wy1 + 8, WOOD_MID)
        win.rect(wx0 - 5, wy1 + 8, wx1 + 5, wy1 + 8, WOOD_DARK)
        win.rect(wx0 - 5, wy1 + 3, wx1 + 5, wy1 + 3, WOOD_LIGHT)
        win.apply_outline(OUTLINE)
        cottage.blit(win)

        # Foliage & flowers spilling out of flower box
        box_mid_x = (wx0 + wx1) // 2
        draw_foliage_cluster(
            cottage,
            [(box_mid_x - 6, wy1 + 2, 4), (box_mid_x, wy1 + 1, 4.5), (box_mid_x + 6, wy1 + 2, 4)],
            moss_pal,
            rng,
            with_flowers=[(box_mid_x - 5, wy1 + 1, CREAM_WHITE), (box_mid_x + 1, wy1, ROSE_MID), (box_mid_x + 6, wy1 + 2, CREAM_WHITE)],
        )

    # 5) Side Wooden Post with Hanging Lantern (right of cottage: x=214..232, y=75..131)
    post = PixelCanvas(320, 192)
    # Post
    post.rect(215, 75, 218, 130, WOOD_MID)
    post.rect(215, 75, 215, 130, WOOD_LIGHT)
    post.rect(218, 75, 218, 130, WOOD_DARK)
    # Top horizontal arm
    post.rect(214, 76, 229, 78, WOOD_MID)
    post.rect(214, 76, 229, 76, WOOD_LIGHT)
    post.set(229, 75, WOOD_LIGHT)
    post.set(229, 79, WOOD_DARK)
    # Diagonal support brace
    post.line(218, 84, 224, 78, WOOD_DARK)
    post.line(218, 83, 223, 78, WOOD_MID)
    # Hanging chain + lantern at x=226, y=80..97
    post.set(226, 79, STONE_SH)
    post.set(226, 80, STONE_MID)
    # Lantern cap
    post.rect(223, 81, 229, 81, WOOD_DARK)
    post.rect(222, 82, 230, 83, STONE_SH)
    post.rect(223, 82, 227, 82, STONE_MID)
    # Glass chamber (x=223..229, y=84..92)
    post.rect(223, 84, 229, 92, NIGHT_MID)
    post.line(223, 84, 223, 92, STONE_DEEP)
    post.line(229, 84, 229, 92, STONE_DEEP)
    post.set(225, 86, NIGHT_REFL)
    post.set(225, 87, NIGHT_REFL)
    # Bottom base
    post.rect(222, 93, 230, 94, STONE_SH)
    post.rect(224, 95, 228, 95, STONE_DEEP)
    post.apply_outline(OUTLINE)
    cottage.blit(post)

    # Small mossy tuft at base of lantern post
    draw_foliage_cluster(cottage, [(216, 130, 4), (221, 132, 3.5)], moss_pal, rng)

    c.blit(cottage)
    c.save("cottage-night.png")

    # -----------------------------------------------------------------------
    # 4. cottage-amber-lights.png (exact pixel-aligned lit panes + warm halo)
    # -----------------------------------------------------------------------
    lights = PixelCanvas(320, 192)

    def add_amber_halo(cx: float, cy: float, max_r: float, peak_alpha: int):
        r2 = max_r * max_r
        for y in range(max(1, int(cy - max_r)), min(192, int(cy + max_r) + 1)):
            for x in range(max(1, int(cx - max_r)), min(320, int(cx + max_r) + 1)):
                d2 = (x - cx) ** 2 + (y - cy) ** 2
                if d2 <= r2:
                    falloff = 1.0 - math.sqrt(d2) / max_r
                    a = int(peak_alpha * (falloff ** 1.6))
                    if a > 4:
                        lights.set(x, y, (255, 196, 92, a))

    # Soft halos behind/around windows & lantern (skipping (0,0) automatically via max(1, ...))
    add_amber_halo(attic_cx, attic_cy, 15.0, 95)
    for wx0, wy0, wx1, wy1 in side_windows:
        add_amber_halo((wx0 + wx1) / 2.0, (wy0 + wy1) / 2.0, 16.0, 95)
    add_amber_halo(226.0, 88.0, 15.0, 115)

    # Exact pixel-matched lit glass: Attic round window (4 quadrants)
    for y in range(attic_cy - 6, attic_cy + 7):
        for x in range(attic_cx - 6, attic_cx + 7):
            dx = x - attic_cx
            dy = y - attic_cy
            if dx * dx + dy * dy <= 33.6:
                # Preserve wooden crossbars
                if x in (attic_cx - 1, attic_cx) or y in (attic_cy - 1, attic_cy):
                    lights.set(x, y, rgba("#A96B45", 140), overwrite=True)
                elif dx * dx + dy * dy <= 12.0:
                    lights.set(x, y, AMBER_CORE, overwrite=True)
                else:
                    lights.set(x, y, AMBER_MID, overwrite=True)

    # Exact pixel-matched lit glass: Side rectangular windows
    for wx0, wy0, wx1, wy1 in side_windows:
        mid_x = (wx0 + wx1) // 2
        mid_y = (wy0 + wy1) // 2
        for y in range(wy0, wy1 + 1):
            for x in range(wx0, wx1 + 1):
                if x == mid_x or y == mid_y:
                    lights.set(x, y, rgba("#8F5534", 150), overwrite=True)
                elif abs(x - mid_x) <= 3 and abs(y - mid_y) <= 4:
                    lights.set(x, y, AMBER_CORE, overwrite=True)
                else:
                    lights.set(x, y, AMBER_MID, overwrite=True)
        # Warm light spill onto top of flower boxes
        for x in range(wx0, wx1 + 1):
            lights.set(x, wy1 + 2, rgba("#FFC45C", 90))

    # Exact pixel-matched lit glass: Hanging Lantern (x=224..228, y=84..92)
    for y in range(84, 93):
        for x in range(224, 229):
            if 86 <= y <= 90 and 225 <= x <= 227:
                lights.set(x, y, AMBER_WHITE if (x == 226 and y == 88) else AMBER_CORE, overwrite=True)
            else:
                lights.set(x, y, AMBER_MID, overwrite=True)

    lights.save("cottage-amber-lights.png")


# ---------------------------------------------------------------------------
# 5. Door frames (48x52, anchored at x=136, y=84)
# ---------------------------------------------------------------------------
def build_doors():
    w, h = 48, 52
    cx = 23.5
    arch_cy = 17.5
    outer_r = 15.0
    inner_r = 10.5
    x_in_l, x_in_r = 13, 34
    y_bot = 43

    def make_frame_and_step() -> PixelCanvas:
        d = PixelCanvas(w, h)
        # Arched timber/stone surround
        for y in range(2, y_bot + 1):
            for x in range(7, 41):
                if y < arch_cy:
                    dist = math.hypot(x - cx, y - arch_cy)
                    in_outer = dist <= outer_r
                    in_inner = dist < inner_r
                else:
                    in_outer = 9 <= x <= 38
                    in_inner = x_in_l <= x <= x_in_r
                if in_outer and not in_inner:
                    # Stone voussoir segments along top arch, warm timber jambs below
                    if y < arch_cy + 1:
                        ang = math.atan2(y - arch_cy, x - cx)
                        seg = int((ang + math.pi) / 0.42)
                        if abs((ang + math.pi) % 0.42) < 0.06:
                            col = WOOD_DARK
                        elif seg % 2 == 0:
                            col = WOOD_MID
                        else:
                            col = WOOD_LIGHT if y < 11 else WOOD_MID
                    else:
                        if x in (9, 38):
                            col = WOOD_DARK
                        elif x in (10, 37):
                            col = WOOD_LIGHT if x == 10 else WOOD_DARK
                        else:
                            col = WOOD_MID
                    d.set(x, y, col)
        # Beveled stone step at base (x=7..40, y=44..49)
        for y in range(44, 50):
            for x in range(7, 41):
                if y == 44:
                    col = STONE_HI
                elif y <= 46:
                    col = STONE_MID if ((x + y) % 7 != 0) else STONE_HI
                elif y <= 48:
                    col = STONE_SH
                else:
                    col = STONE_DEEP
                d.set(x, y, col)
        # Step joints
        d.line(18, 44, 17, 49, STONE_DEEP)
        d.line(30, 44, 31, 49, STONE_DEEP)
        return d

    def is_inside_opening(x: int, y: int) -> bool:
        if y < 6 or y > y_bot:
            return False
        if y < arch_cy:
            return math.hypot(x - cx, y - arch_cy) < inner_r
        return x_in_l <= x <= x_in_r

    def fill_amber_interior(d: PixelCanvas):
        for y in range(6, y_bot + 1):
            for x in range(x_in_l, x_in_r + 1):
                if is_inside_opening(x, y):
                    dist = math.hypot((x - cx) / 10.0, (y - 26) / 17.0)
                    if dist < 0.45:
                        col = AMBER_WHITE
                    elif dist < 0.85:
                        col = AMBER_CORE
                    elif y >= y_bot - 3:
                        col = AMBER_WARM
                    else:
                        col = AMBER_MID
                    d.set(x, y, col)
        # Subtle warm interior floorboard horizon hint
        d.rect(x_in_l + 2, y_bot - 2, x_in_r - 2, y_bot - 2, AMBER_WARM)

    def draw_door_leaf(d: PixelCanvas, x_left: int, x_right: int, foreshorten: float = 1.0):
        """Draw planked wooden door leaf with arched top window and brass ring knob."""
        leaf_w = max(3, x_right - x_left + 1)
        win_w = max(2, int(round(6 * foreshorten)))
        win_cx = (x_left + x_right) // 2
        for y in range(6, y_bot + 1):
            for x in range(x_left, x_right + 1):
                if not is_inside_opening(x, y):
                    continue
                # Plank seams
                rel_x = x - x_left
                plank_step = max(2, int(round(4 * foreshorten)))
                if rel_x == 0 or x == x_right:
                    col = WOOD_DARK
                elif rel_x % plank_step == 0:
                    col = WOOD_DARK
                elif rel_x % plank_step == 1:
                    col = WOOD_LIGHT
                elif y >= y_bot - 2:
                    col = WOOD_DARK
                else:
                    col = WOOD_MID
                # Arched small window near top of door (y=13..20)
                if 13 <= y <= 20 and abs(x - win_cx) <= win_w // 2:
                    if y == 13 and abs(x - win_cx) == win_w // 2:
                        col = WOOD_DARK
                    elif x == win_cx or y == 17:
                        col = WOOD_DARK
                    else:
                        col = AMBER_MID if foreshorten < 0.99 else NIGHT_MID
                d.set(x, y, col)
        # Brass ring handle
        hx = x_right - max(2, int(round(4 * foreshorten)))
        hy = 29
        if is_inside_opening(hx, hy):
            d.set(hx, hy - 1, AMBER_CORE)
            d.set(hx, hy, AMBER_MID)
            d.set(hx, hy + 1, AMBER_WARM)
            if leaf_w >= 8:
                d.set(hx - 1, hy, AMBER_MID)
                d.set(hx + 1, hy, AMBER_WARM)

    # 1) closed
    d_closed = make_frame_and_step()
    draw_door_leaf(d_closed, x_in_l, x_in_r, foreshorten=1.0)
    d_closed.apply_outline(OUTLINE)
    d_closed.save("door-closed.png")

    # 2) opening (leaf half-swung to right, revealing warm interior on left)
    d_opening = make_frame_and_step()
    fill_amber_interior(d_opening)
    draw_door_leaf(d_opening, 23, x_in_r, foreshorten=0.55)
    d_opening.apply_outline(OUTLINE)
    d_opening.save("door-opening.png")

    # 3) open (full cozy amber interior, leaf tucked cleanly on right edge)
    d_open = make_frame_and_step()
    fill_amber_interior(d_open)
    # Tucked open leaf edge
    for y in range(10, y_bot + 1):
        if is_inside_opening(x_in_r - 2, y):
            d_open.set(x_in_r - 3, y, WOOD_DARK)
            d_open.set(x_in_r - 2, y, WOOD_MID)
            d_open.set(x_in_r - 1, y, WOOD_LIGHT)
            d_open.set(x_in_r, y, WOOD_DARK)
    d_open.apply_outline(OUTLINE)
    d_open.save("door-open.png")

    # 4) closing (leaf mostly closed, narrow warm interior slit on left)
    d_closing = make_frame_and_step()
    fill_amber_interior(d_closing)
    draw_door_leaf(d_closing, 18, x_in_r, foreshorten=0.78)
    d_closing.apply_outline(OUTLINE)
    d_closing.save("door-closing.png")


# ---------------------------------------------------------------------------
# 6. Smoke frames (32x32 each)
# ---------------------------------------------------------------------------
def build_smoke():
    smoke_hi = rgba("#FFF6EE")
    smoke_mid = rgba("#EAD3C8")
    smoke_sh = rgba("#C7AA9F")
    smoke_rim = rgba("#705B63")

    # 4 progressive rising & dissipating pixel-art cloud puffs
    specs = [
        # frame 0: dense small puff emerging near chimney mouth
        ([(15, 25, 4.2), (18, 23, 3.6), (13, 23, 3.0)], 235),
        # frame 1: rising slightly higher and fuller
        ([(16, 20, 4.8), (19, 17, 4.0), (13, 18, 3.6)], 215),
        # frame 2: splitting into main cloud + trailing wisp
        ([(17, 14, 5.2), (21, 11, 4.2), (14, 13, 3.8), (16, 23, 2.4)], 175),
        # frame 3: high soft dissipating wisps
        ([(18, 9, 4.6), (23, 7, 3.6), (14, 11, 3.2), (19, 18, 2.2)], 125),
    ]

    for idx, (blobs, alpha_cap) in enumerate(specs):
        c = PixelCanvas(32, 32)
        buf = PixelCanvas(32, 32)
        for y in range(1, 31):
            for x in range(1, 31):
                best = -1.0
                best_dy = 0.0
                for cx, cy, r in blobs:
                    d = math.hypot(x - cx, y - cy)
                    if d <= r and (r - d) > best:
                        best = r - d
                        best_dy = (y - cy) / r
                if best >= 0:
                    if best_dy < -0.2:
                        col = smoke_hi
                    elif best_dy < 0.35:
                        col = smoke_mid
                    else:
                        col = smoke_sh
                    buf.set(x, y, col)
        buf.apply_outline(smoke_rim)
        # Apply frame-specific global translucency while preserving (0,0) alpha=0
        for y in range(1, 31):
            for x in range(1, 31):
                r, g, b, a = buf.get(x, y)
                if a > 0:
                    new_a = (a * alpha_cap) // 255
                    c.set(x, y, (r, g, b, new_a), overwrite=True)
        c.save(f"smoke-{idx}.png")


# ---------------------------------------------------------------------------
# 7. Station Props (leaving mascot anchor zones clean!)
# ---------------------------------------------------------------------------
def build_station_props():
    rng = random.Random(303)

    # --- Left Station (96x56 at x=26, y=116): Clawd center (x_local 32..64) CLEAR ---
    left = PixelCanvas(96, 56)
    # Left: low mossy wood pallet/mat + colorful book stack (x=4..28, y=20..48)
    pallet = PixelCanvas(96, 56)
    pallet.rect(6, 40, 26, 44, WOOD_MID)
    pallet.rect(6, 40, 26, 40, WOOD_LIGHT)
    pallet.rect(6, 44, 26, 44, WOOD_DARK)
    pallet.apply_outline(OUTLINE)
    left.blit(pallet)

    draw_book_stack(
        left,
        8,
        40,
        [
            (17, ROOF_MID, ROOF_LIGHT, ROOF_SH),
            (15, ROSE_SH, ROSE_MID, ROSE_DEEP),
            (13, MOSS_MID, MOSS_LIGHT, MOSS_SH),
        ],
    )
    # Tiny open bookmark ribbon & flower beside books
    draw_tiny_flower(left, 28, 45, CREAM_WHITE)

    # Right: sturdy rustic wooden side-table + mug with heart & steam (x=66..90, y=16..48)
    stool = PixelCanvas(96, 56)
    # Four legs (front pair + recessed darker back pair) & apron stretcher
    stool.rect(72, 36, 73, 44, WOOD_DEEP)
    stool.rect(83, 36, 84, 44, WOOD_DEEP)
    stool.rect(69, 36, 71, 46, WOOD_MID)
    stool.rect(85, 36, 87, 46, WOOD_MID)
    stool.rect(71, 41, 85, 42, WOOD_DARK)
    # Table top
    stool.rect(67, 32, 89, 36, WOOD_MID)
    stool.rect(67, 32, 89, 33, WOOD_LIGHT)
    stool.rect(67, 36, 89, 36, WOOD_DARK)
    stool.apply_outline(OUTLINE)
    left.blit(stool)
    draw_mug(left, 75, 32, with_heart=True, steam=True)

    # Tiny pebbles/clover far from center (32..64 kept open)
    left.set(30, 48, MOSS_LIGHT)
    left.set(66, 47, MOSS_LIGHT)
    left.save("station-left-props.png")

    # --- Center Station (96x54 at x=116, y=132): Cloudling anchor (48, 34) CLEAR ---
    center = PixelCanvas(96, 54)

    # Left (x=3..29): Wooden toolbox with wrench & screwdriver
    tb = PixelCanvas(96, 54)
    # Wrench sticking out top-left
    tb.line(9, 24, 15, 30, STONE_MID)
    tb.line(10, 24, 16, 30, STONE_HI)
    tb.rect(7, 22, 10, 25, STONE_HI)
    tb.set(8, 23, OUTLINE)  # wrench jaw notch
    # Screwdriver handle sticking out right
    tb.line(21, 23, 18, 30, AMBER_WARM)
    tb.rect(20, 21, 22, 24, AMBER_MID)
    # Toolbox body (x=6..26, y=30..42)
    tb.rect(6, 30, 26, 42, WOOD_MID)
    tb.rect(6, 30, 26, 32, WOOD_LIGHT)
    tb.rect(6, 40, 26, 42, WOOD_DARK)
    tb.rect(7, 34, 25, 35, WOOD_DARK)  # rim shadow
    # Metal clasp
    tb.rect(15, 33, 17, 36, AMBER_MID)
    tb.apply_outline(OUTLINE)
    center.blit(tb)

    # Right (x=65..93): Mini rustic workbench with open notepad & mug
    bench = PixelCanvas(96, 54)
    # Legs
    bench.rect(68, 32, 70, 44, WOOD_DARK)
    bench.rect(88, 32, 90, 44, WOOD_DARK)
    # Stretcher bar
    bench.rect(70, 40, 88, 41, WOOD_MID)
    # Bench top (x=65..93, y=27..32)
    bench.rect(65, 27, 93, 32, WOOD_MID)
    bench.rect(65, 27, 93, 28, WOOD_LIGHT)
    bench.rect(65, 32, 93, 32, WOOD_DARK)
    # Open notebook/blueprint on left of bench
    bench.rect(68, 23, 78, 27, CREAM_WHITE)
    bench.rect(68, 26, 78, 27, CREAM_SH)
    bench.line(70, 24, 75, 24, ROOF_MID)
    bench.line(70, 25, 73, 25, ROOF_SH)
    bench.apply_outline(OUTLINE)
    center.blit(bench)
    draw_mug(center, 81, 27, with_heart=False, steam=True)

    center.save("station-center-props.png")

    # --- Right Station (96x56 at x=204, y=112): Atom anchor (48, 32) CLEAR ---
    right = PixelCanvas(96, 56)

    # Left (x=3..30): Stack of magic tomes + low glowing lantern
    draw_book_stack(
        right,
        4,
        45,
        [
            (16, rgba("#664882"), rgba("#8B67AD"), rgba("#47305E")),
            (14, ROOF_MID, ROOF_LIGHT, ROOF_SH),
        ],
    )
    draw_mini_lantern(right, 24, 46, warm=True)

    # Right (x=67..93): Mossy stone pedestal with glowing lavender/cyan crystal orb
    ped = PixelCanvas(96, 56)
    # Base plinth & shaft (x=72..88, y=28..46)
    ped.rect(72, 42, 88, 46, STONE_SH)
    ped.rect(72, 42, 88, 43, STONE_MID)
    ped.rect(75, 31, 85, 42, STONE_MID)
    ped.rect(75, 31, 77, 42, STONE_HI)
    ped.rect(83, 31, 85, 42, STONE_SH)
    # Pedestal top cap
    ped.rect(73, 27, 87, 31, STONE_MID)
    ped.rect(73, 27, 87, 28, STONE_HI)
    # Moss touch on pedestal
    ped.rect(73, 41, 76, 44, MOSS_MID)
    ped.set(74, 41, MOSS_LIGHT)
    ped.apply_outline(OUTLINE)
    right.blit(ped)

    # Soft cyan/lavender aura around crystal orb at (80, 19)
    orb_cx, orb_cy = 80, 19
    for y in range(10, 29):
        for x in range(70, 91):
            d = math.hypot(x - orb_cx, y - orb_cy)
            if 5.5 < d <= 9.5:
                a = int(95 * (1.0 - (d - 5.5) / 4.0))
                right.set(x, y, (165, 220, 255, a))

    # Crystal orb sprite with internal nebula shading + crescent highlight + sparkles
    orb = PixelCanvas(96, 56)
    for y in range(13, 26):
        for x in range(74, 87):
            dx = x - orb_cx
            dy = y - orb_cy
            r2 = dx * dx + dy * dy
            if r2 <= 27.0:
                if r2 > 18.0 and (dx > 0 or dy > 1):
                    col = rgba("#5D409E")  # deep violet rim shadow
                elif abs(dx + 1.5) + abs(dy + 1.5) < 3.0:
                    col = rgba("#A2F4FF")  # inner cyan glow
                elif dy > 1.5:
                    col = rgba("#8862D1")  # mid violet
                else:
                    col = rgba("#C4A1FF")  # lavender body
                orb.set(x, y, col)
    # Specular crescent & core glint
    orb.set(77, 16, rgba("#FFFFFF"))
    orb.set(78, 15, rgba("#FFFFFF"))
    orb.set(77, 17, rgba("#D9FBFF"))
    orb.set(82, 20, rgba("#D9FBFF"))
    # Brass cradle under orb
    orb.rect(77, 25, 83, 26, AMBER_WARM)
    orb.rect(78, 25, 81, 25, AMBER_MID)
    orb.apply_outline(OUTLINE)
    right.blit(orb)
    # Floating tiny 4-point star sparkles around orb
    for sx, sy in [(72, 13), (88, 15)]:
        right.set(sx, sy, rgba("#FFFFFF", 220))
        right.set(sx - 1, sy, rgba("#A2F4FF", 150))
        right.set(sx + 1, sy, rgba("#A2F4FF", 150))
        right.set(sx, sy - 1, rgba("#A2F4FF", 150))
        right.set(sx, sy + 1, rgba("#A2F4FF", 150))

    right.save("station-right-props.png")


# ---------------------------------------------------------------------------
# 8. layer-6-foreground.png (strictly y > 168: mushrooms, grass tufts, pebbles)
# ---------------------------------------------------------------------------
def build_layer_6_foreground():
    rng = random.Random(404)
    c = PixelCanvas(320, 192)

    # Bottom lip grass tufts & pebbles strictly at y >= 169
    tuft_positions = [
        (42, 179), (88, 181), (118, 182), (144, 184),
        (178, 184), (206, 182), (236, 180), (278, 178),
    ]
    for tx, ty in tuft_positions:
        t = PixelCanvas(16, 14)
        # Multi-blade grass tuft (max height 8px -> top >= 170)
        t.line(6, 11, 3, 6, MOSS_LIGHT)
        t.line(7, 11, 6, 4, MOSS_HI)
        t.line(8, 11, 9, 5, MOSS_LIGHT)
        t.line(9, 11, 12, 7, MOSS_MID)
        t.rect(5, 10, 10, 11, MOSS_SH)
        t.apply_outline(OUTLINE)
        c.blit(t, tx - 7, ty - 11)

    # Mushrooms on lower-left and lower-right rim (all pixels strictly y >= 169)
    draw_mushroom(c, 64, 180, size="med")
    draw_mushroom(c, 73, 182, size="small")
    draw_mushroom(c, 254, 180, size="med")
    draw_mushroom(c, 244, 182, size="small")

    # Small foreground pebbles & tiny blossoms
    draw_stepping_stone(c, 104, 181, 4, 2, rng)
    draw_stepping_stone(c, 220, 181, 4, 2, rng)
    draw_tiny_flower(c, 130, 182, CREAM_WHITE)
    draw_tiny_flower(c, 192, 182, ROSE_MID)

    # Safety clamp: ensure nothing leaks into y <= 168
    for y in range(0, 169):
        for x in range(320):
            c.set(x, y, (0, 0, 0, 0), overwrite=True)

    c.save("layer-6-foreground.png")


def generate_assets():
    os.makedirs(OUT_DIR, exist_ok=True)
    build_layer_0_shadow()
    build_layer_1_backdrop()
    build_cottage_and_lights()
    build_doors()
    build_smoke()
    build_station_props()
    build_layer_6_foreground()
    print("All cozy-cottage pixel-art assets generated successfully!")


def run_asserts():
    files_to_check = [
        ("layer-0-shadow.png", 320, 192),
        ("layer-1-backdrop.png", 320, 192),
        ("cottage-night.png", 320, 192),
        ("cottage-amber-lights.png", 320, 192),
        ("door-closed.png", 48, 52),
        ("door-opening.png", 48, 52),
        ("door-open.png", 48, 52),
        ("door-closing.png", 48, 52),
        ("smoke-0.png", 32, 32),
        ("smoke-1.png", 32, 32),
        ("smoke-2.png", 32, 32),
        ("smoke-3.png", 32, 32),
        ("station-left-props.png", 96, 56),
        ("station-center-props.png", 96, 54),
        ("station-right-props.png", 96, 56),
        ("layer-6-foreground.png", 320, 192),
    ]

    for name, expected_w, expected_h in files_to_check:
        path = os.path.join(OUT_DIR, name)
        im = Image.open(path)
        assert im.mode == "RGBA", f"{name} is {im.mode}, expected RGBA"
        assert im.size == (expected_w, expected_h), f"{name} size {im.size} != {(expected_w, expected_h)}"
        px0 = im.getpixel((0, 0))
        assert px0[3] == 0, f"{name} pixel (0,0) alpha is {px0[3]}, expected 0"
        alpha_band = im.getchannel("A")
        bbox = alpha_band.getbbox()
        assert bbox is not None, f"{name} has no visible pixels"
        raw_alpha = (
            alpha_band.get_flattened_data()
            if hasattr(alpha_band, "get_flattened_data")
            else alpha_band.getdata()
        )
        non_zero = sum(1 for a in raw_alpha if a > 0)
        assert non_zero > 0, f"{name} non-zero pixel count is 0"
        print(f"  OK {name}: {im.mode} {im.size} non_zero={non_zero} bbox={bbox}")

    print("All 16 image asserts passed successfully!")


if __name__ == "__main__":
    generate_assets()
    run_asserts()
