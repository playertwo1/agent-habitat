"""P2.1 — gera 8 peças sintéticas (A1…A8, 4x, fundo magenta) a partir da arte da cozy-cottage.

Serve para testar o processador sem esperar o Gemini: uso  python tools/p2-entrada-sintetica.py <pasta de saída>
A casa acesa (A3) é a casa com um quadrado âmbar nas janelas, para exercitar a extração de luz.
"""
import sys
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
B = RAIZ / "assets" / "habitat" / "cozy-cottage"
MAGENTA = (255, 0, 255, 255)


def sobre_magenta(img, ampliar=4):
    fundo = Image.new("RGBA", img.size, MAGENTA)
    fundo.alpha_composite(img.convert("RGBA"))
    return fundo.resize((img.width * ampliar, img.height * ampliar), Image.NEAREST)


def abrir(n):
    return Image.open(B / n).convert("RGBA")


def folha(imagens, largura, altura):
    f = Image.new("RGBA", (largura * len(imagens), altura), (0, 0, 0, 0))
    for i, im in enumerate(imagens):
        f.alpha_composite(im, (i * largura, 0))
    return f


def main(saida):
    saida = Path(saida)
    saida.mkdir(parents=True, exist_ok=True)
    cenario = abrir("layer-1-backdrop.png")
    casa = abrir("cottage-night.png")
    acesa = casa.copy()
    for x in range(140, 150):
        for y in range(70, 80):
            acesa.putpixel((x, y), (255, 190, 80, 255))
    sobre_magenta(cenario).save(saida / "A1-base.png")
    sobre_magenta(casa).save(saida / "A2-casa.png")
    sobre_magenta(acesa).save(saida / "A3-casa-acesa.png")
    sobre_magenta(abrir("layer-6-foreground.png")).save(saida / "A4-primeiro-plano.png")
    portas = folha([abrir(f"door-{n}.png") for n in ("closed", "opening", "open", "closing")], 48, 52)
    sobre_magenta(portas).save(saida / "A5-porta.png")
    props = [abrir(f"station-{n}-props.png") for n in ("left", "center", "right")]
    quadros = []
    for p in props:  # cada quadro 96x56 com o objeto apoiado na base
        q = Image.new("RGBA", (96, 56), (0, 0, 0, 0))
        q.alpha_composite(p, (0, 56 - p.height))
        quadros.append(q)
    sobre_magenta(folha(quadros, 96, 56)).save(saida / "A6-aderecos.png")
    h = abrir("helpers.png")  # 2 quadros x 3 linhas; repete para 4 colunas
    quatro = Image.new("RGBA", (64, 48), (0, 0, 0, 0))
    for c in range(4):
        quatro.alpha_composite(h.crop((16 * (c % 2), 0, 16 * (c % 2) + 16, 48)), (c * 16, 0))
    sobre_magenta(quatro).save(saida / "A7-ajudantes.png")
    sobre_magenta(abrir("garden-objects.png")).save(saida / "A8-objetos.png")
    print("ok", saida)


if __name__ == "__main__":
    main(sys.argv[1])
