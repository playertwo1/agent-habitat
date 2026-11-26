"""P1.4.1 — objetos do jardim (banco, fogueira, gatinho, caixa de correio): pixel art novo, 24x24, RGBA com alfa real.

Gera assets/habitat/cozy-cottage/garden-objects.png (96x24, 4 quadros) e, em docs/prototipos/p1.4/,
capturas da cabana de dia e de noite com os objetos. Não recolore Clawd, Cloudling nem Atom.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance

RAIZ = Path(__file__).resolve().parent.parent
ATIVOS = RAIZ / "assets" / "habitat" / "cozy-cottage"
SAIDA = RAIZ / "docs" / "prototipos" / "p1.4"
K = (52, 40, 48, 255)
MADEIRA, MADEIRA_S = (176, 120, 72, 255), (128, 84, 52, 255)
PEDRA, PEDRA_S = (160, 160, 168, 255), (110, 110, 122, 255)
CH1, CH2, CH3 = (232, 84, 48, 255), (250, 160, 56, 255), (255, 228, 120, 255)
GATO, GATO_S, BRANCO = (230, 156, 84, 255), (190, 112, 56, 255), (252, 244, 232, 255)
AZUL, AZUL_S, VERM = (84, 128, 200, 255), (52, 88, 152, 255), (216, 60, 56, 255)


def tela():
    im = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def banco():
    im, d = tela()
    d.rectangle([2, 8, 21, 11], fill=MADEIRA, outline=K)      # encosto
    d.rectangle([2, 13, 21, 16], fill=MADEIRA, outline=K)     # assento
    d.rectangle([3, 17, 5, 21], fill=MADEIRA_S, outline=K)    # pés
    d.rectangle([18, 17, 20, 21], fill=MADEIRA_S, outline=K)
    d.line([3, 14, 20, 14], fill=MADEIRA_S)
    return im


def fogueira():
    im, d = tela()
    d.ellipse([3, 17, 8, 21], fill=PEDRA, outline=K)
    d.ellipse([15, 17, 20, 21], fill=PEDRA_S, outline=K)
    d.ellipse([9, 18, 14, 22], fill=PEDRA, outline=K)
    d.polygon([(12, 3), (17, 11), (16, 18), (8, 18), (7, 11)], fill=CH1, outline=K)
    d.polygon([(12, 7), (15, 12), (14, 17), (10, 17), (9, 12)], fill=CH2)
    d.polygon([(12, 11), (13, 14), (12, 17), (11, 14)], fill=CH3)
    return im


def gatinho():
    im, d = tela()
    d.ellipse([3, 11, 19, 21], fill=GATO, outline=K)          # corpo enrolado
    d.polygon([(15, 9), (17, 5), (19, 9)], fill=GATO, outline=K)  # orelhas
    d.polygon([(10, 9), (12, 5), (14, 9)], fill=GATO, outline=K)
    d.ellipse([9, 8, 20, 16], fill=GATO, outline=K)           # cabeça
    d.line([11, 12, 13, 12], fill=K)                          # olhos fechados
    d.line([16, 12, 18, 12], fill=K)
    d.arc([2, 14, 12, 23], 90, 270, fill=GATO_S)              # cauda
    d.rectangle([5, 19, 14, 20], fill=GATO_S)
    return im


def correio():
    im, d = tela()
    d.rectangle([11, 12, 13, 22], fill=MADEIRA_S, outline=K)  # poste
    d.rectangle([4, 4, 19, 12], fill=AZUL, outline=K)         # caixa
    d.rectangle([4, 4, 19, 6], fill=AZUL_S)
    d.rectangle([17, 1, 18, 5], fill=VERM, outline=K)         # bandeirinha
    d.rectangle([7, 8, 14, 10], fill=BRANCO)                  # carta
    return im


def noite(im):
    # mesmo filtro do renderer: escurece e puxa para o azul (aproximação para o protótipo)
    base = ImageEnhance.Brightness(im.convert("RGB")).enhance(0.6)
    return Image.blend(base, Image.new("RGB", im.size, (40, 60, 120)), 0.12).convert("RGBA")


def main():
    SAIDA.mkdir(parents=True, exist_ok=True)
    folha = Image.new("RGBA", (96, 24), (0, 0, 0, 0))
    spr = [banco(), fogueira(), gatinho(), correio()]
    for i, s in enumerate(spr):
        folha.alpha_composite(s, (i * 24, 0))
    folha.save(ATIVOS / "garden-objects.png")
    camadas = ["layer-0-shadow", "layer-1-backdrop", "cottage-night", "door-closed", "layer-6-foreground"]
    pos = [(276, 168), (232, 174), (100, 176), (36, 170)]  # âncora: base-centro do sprite
    for nome, f in (("dia", lambda x: x), ("noite", noite)):
        cena = Image.new("RGBA", (320, 192), (0, 0, 0, 0))
        for c in camadas:
            im = Image.open(ATIVOS / f"{c}.png").convert("RGBA")
            if c == "door-closed":
                tmp = Image.new("RGBA", (320, 192), (0, 0, 0, 0)); tmp.alpha_composite(im, (136, 84)); im = tmp
            if c != "layer-0-shadow":
                rgb = f(im); rgb.putalpha(im.getchannel("A")); im = rgb
            cena.alpha_composite(im)
            if c == "door-closed":
                for s, (x, y) in zip(spr, pos):
                    o = f(s); o.putalpha(s.getchannel("A")); cena.alpha_composite(o, (x - 12, y - 24))
        fundo = Image.new("RGBA", (320, 192), (36, 35, 42, 255)); fundo.alpha_composite(cena)
        fundo.resize((640, 384), Image.NEAREST).save(SAIDA / f"jardim-{nome}.png")
    print("ok")


if __name__ == "__main__":
    main()
