"""P2: gera o guia de layout (posições do manifesto) e a referência de estilo da Cozy Cottage para o Gemini.

Saída em docs/arte-p2/: guia-layout.png (1280x768 = 4x do canvas 320x192) e referencia-cozy-cottage.png.
Os números vêm do manifesto atual; se o manifesto mudar, rode de novo.
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parent.parent
ATIVOS = RAIZ / "assets" / "habitat" / "cozy-cottage"
SAIDA = RAIZ / "docs" / "arte-p2"
Z = 4
m = json.loads((ATIVOS / "habitat-manifest.json").read_text(encoding="utf-8"))


def r(d, x, y, w, h, cor, rotulo):
    d.rectangle([x * Z, y * Z, (x + w) * Z, (y + h) * Z], outline=cor + (255,), width=3, fill=cor + (40,))
    d.text((x * Z + 6, y * Z + 4), rotulo, fill=cor + (255,))


def main():
    SAIDA.mkdir(parents=True, exist_ok=True)
    base = Image.new("RGBA", (320 * Z, 192 * Z), (245, 245, 245, 255))
    guia = Image.new("RGBA", base.size, (0, 0, 0, 0))  # camada com transparência: alpha_composite no fim
    d = ImageDraw.Draw(guia)
    for x in range(0, 320, 16):
        d.line([x * Z, 0, x * Z, 192 * Z], fill=(0, 0, 0, 25), width=1)
    for y in range(0, 192, 16):
        d.line([0, y * Z, 320 * Z, y * Z], fill=(0, 0, 0, 25), width=1)
    h = m["cottageHitBox"]
    r(d, h["x"], h["y"], h["width"], h["height"], (200, 60, 60), "CASA (centro; telhado, chamine, paredes)")
    p = m["layers"]["door"]
    r(d, p["x"], p["y"], p["width"], p["height"], (60, 90, 200), "PORTA 48x52")
    s = m["layers"]["smoke"]
    r(d, s["x"], s["y"], s["width"], s["height"], (120, 120, 120), "FUMACA 32x32 (sobre a chamine)")
    cores = {"claude": (214, 112, 78), "codex": (100, 110, 220), "antigravity": (40, 160, 150)}
    for prov, st in m["stations"].items():
        pr = st["props"]
        r(d, pr["x"], pr["y"], pr["width"], pr["height"], cores[prov], f"ADERECOS {prov}")
        ax, ay = st["anchor"]["x"], st["anchor"]["y"]
        d.ellipse([ax * Z - 8, ay * Z - 8, ax * Z + 8, ay * Z + 8], fill=cores[prov] + (255,))
        d.text((ax * Z + 12, ay * Z - 6), f"pe do morador ({prov})", fill=(0, 0, 0, 255))
    da = m["doorAnchor"]
    d.ellipse([da["x"] * Z - 8, da["y"] * Z - 8, da["x"] * Z + 8, da["y"] * Z + 8], fill=(60, 90, 200, 255))
    d.text((da["x"] * Z + 12, da["y"] * Z - 6), "saida da porta", fill=(0, 0, 0, 255))
    d.rectangle([24 * Z, 118 * Z, 296 * Z, 184 * Z], outline=(40, 140, 60, 255), width=3)
    d.text((28 * Z, 120 * Z), "TERRENO CAMINHAVEL (livre de objetos altos): x 24-296, y 118-184", fill=(40, 140, 60, 255))
    base.alpha_composite(guia)
    base.convert("RGB").save(SAIDA / "guia-layout.png")

    ref = Image.new("RGBA", (320, 192), (255, 0, 255, 255))
    for nome in ["layer-0-shadow", "layer-1-backdrop", "cottage-night", "door-closed", "layer-6-foreground"]:
        im = Image.open(ATIVOS / f"{nome}.png").convert("RGBA")
        if nome == "door-closed":
            t = Image.new("RGBA", (320, 192), (0, 0, 0, 0)); t.alpha_composite(im, (p["x"], p["y"])); im = t
        ref.alpha_composite(im)
    ref.resize((320 * Z, 192 * Z), Image.NEAREST).convert("RGB").save(SAIDA / "referencia-cozy-cottage.png")
    print("ok", SAIDA)


if __name__ == "__main__":
    main()
