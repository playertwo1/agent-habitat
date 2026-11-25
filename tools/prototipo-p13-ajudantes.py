"""P1.3.1 — protótipo dos mini-ajudantes de subagente (pixel art novo, 16x16, RGBA com alfa real).

Gera, em docs/prototipos/p1.3/:
  - ajudantes-folha.png  : folha ampliada (3 provedores x 2 quadros)
  - ajudantes-sprites.png: sprites 16x16 reais (sem ampliar)
  - ajudantes-cabana.png : captura da cabana (combo 111) com ajudantes junto às estações
Não recolore Clawd, Cloudling nem Atom: os ajudantes são cogumelinhos novos.
"""
from pathlib import Path
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "docs" / "prototipos" / "p1.3"
BASE = RAIZ / "dist" / "g1-previews" / "combo-111-dark.png"

# chapéu por provedor (acento do provedor, sem copiar a cor exata do mascote)
CHAPEU = {"claude": (214, 112, 78), "codex": (120, 132, 220), "antigravity": (64, 178, 168)}
CHAPEU_SOMBRA = {"claude": (160, 76, 52), "codex": (82, 92, 170), "antigravity": (38, 128, 120)}
CREME = (250, 236, 210)
CREME_SOMBRA = (222, 200, 166)
CONTORNO = (52, 40, 48)
BRANCO = (255, 250, 240)

# 16x16: c=chapéu, s=sombra do chapéu, p=pinta, k=contorno, b=corpo, d=sombra do corpo, o=olho
MOLDE = [
    "................",
    "................",
    "....kkkkkkkk....",
    "...kcccpcccck...",
    "..kccpppcccccck.",
    "..kcccpcccppcck.",
    ".kcccccccccpcsck",
    ".kcppcccccccssck",
    ".kssssssssssssk.",
    "..kkkkkkkkkkkk..",
    "...kbbbbbbbbk...",
    "...kbobbbbobk...",
    "...kbbbbbbbbk...",
    "....kddddddk....",
    "....kk....kk....",
    "................",
]


def sprite(provedor, quadro):
    cores = {
        "c": CHAPEU[provedor], "s": CHAPEU_SOMBRA[provedor], "p": BRANCO,
        "k": CONTORNO, "b": CREME, "d": CREME_SOMBRA, "o": CONTORNO,
    }
    im = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for y, linha in enumerate(MOLDE):
        for x, ch in enumerate(linha):
            if ch in cores:
                im.putpixel((x, y - quadro), cores[ch] + (255,))  # quadro 1 sobe 1 px (pulinho)
    return im


def main():
    SAIDA.mkdir(parents=True, exist_ok=True)
    provedores = list(CHAPEU)

    real = Image.new("RGBA", (16 * 2 * 3 + 8, 16), (0, 0, 0, 0))
    folha = Image.new("RGBA", (6 * 16 * 8 + 70, 16 * 8 + 20), (36, 35, 42, 255))
    for i, p in enumerate(provedores):
        for q in range(2):
            s = sprite(p, q)
            real.alpha_composite(s, (i * 34 + q * 16, 0))
            folha.alpha_composite(s.resize((128, 128), Image.NEAREST), (10 + (i * 2 + q) * 138, 10))
    real.save(SAIDA / "ajudantes-sprites.png")

    # folha de produção: 2 quadros (colunas) x 3 provedores (linhas), 32x48, usada pelo Stage
    prod = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
    for i, p in enumerate(provedores):
        for q in range(2):
            prod.alpha_composite(sprite(p, q), (q * 16, i * 16))
    prod.save(RAIZ / "assets" / "habitat" / "cozy-cottage" / "helpers.png")
    folha.save(SAIDA / "ajudantes-folha.png")

    if BASE.exists():
        cena = Image.open(BASE).convert("RGBA")
        # (provedor, âncora da estação em px de 320x192, quantidade)
        estacoes = [("claude", (74, 148), 1), ("codex", (164, 166), 2), ("antigravity", (252, 144), 1)]
        for p, (ax, ay), n in estacoes:
            for k in range(n):
                s = sprite(p, k % 2).resize((32, 32), Image.NEAREST)
                x = (ax + 26 + k * 18) * 2 - 16
                y = ay * 2 + 22 - 32
                cena.alpha_composite(s, (x, y))
        cena.save(SAIDA / "ajudantes-cabana.png")
    print("ok", SAIDA)


if __name__ == "__main__":
    main()
