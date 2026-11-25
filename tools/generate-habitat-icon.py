"""Gera os ícones oficiais do Agent Habitat a partir das camadas RGBA da Cozy Cottage.

Uso, na raiz do repositório:
    python tools/generate-habitat-icon.py

Saídas (sobrescritas):
    assets/icon.png            1024x1024 (ampliação NEAREST 8x do recorte 128)
    assets/icon.ico            16, 24, 32, 48, 64, 128 e 256 px
    assets/icons/512x512.png   NEAREST 4x
    assets/icons/256x256.png   NEAREST 2x

O fundo fica transparente de verdade (alfa 0). Não usa layer-0-shadow nem layer-6-foreground.
"""

from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parents[1]
PASTA_CAMADAS = RAIZ / "assets" / "habitat" / "cozy-cottage"
PASTA_ASSETS = RAIZ / "assets"

# Ordem de composição com alpha_composite: (arquivo, posição no canvas 320x192).
CAMADAS = [
    ("layer-1-backdrop.png", (0, 0)),
    ("cottage-night.png", (0, 0)),
    ("cottage-amber-lights.png", (0, 0)),
    ("door-closed.png", (136, 84)),
    ("smoke-0.png", (174, 4)),
]

# Centro da hitbox da cabana: x = 104 + 112/2, y = 24 + 116/2.
CENTRO = (160, 82)
LADO = 128
TAMANHOS_ICO = [16, 24, 32, 48, 64, 128, 256]


def compor_cena():
    cena = Image.new("RGBA", (320, 192), (0, 0, 0, 0))
    for nome, posicao in CAMADAS:
        camada = Image.open(PASTA_CAMADAS / nome).convert("RGBA")
        cena.alpha_composite(camada, posicao)
    return cena


def recortar(cena):
    # Fora do canvas, o crop preenche com (0, 0, 0, 0): transparente.
    cx, cy = CENTRO
    meio = LADO // 2
    return cena.crop((cx - meio, cy - meio, cx + meio, cy + meio))


def quadro(recorte, tamanho):
    # Redução suave para tamanhos pequenos (legibilidade); pixel art nítido nos grandes.
    filtro = Image.Resampling.LANCZOS if tamanho < 128 else Image.Resampling.NEAREST
    return recorte.resize((tamanho, tamanho), filtro)


def gerar():
    recorte = recortar(compor_cena())
    assert recorte.size == (LADO, LADO), recorte.size

    recorte.resize((1024, 1024), Image.Resampling.NEAREST).save(PASTA_ASSETS / "icon.png")
    print("Gerado assets/icon.png (1024x1024)")

    recorte.resize((512, 512), Image.Resampling.NEAREST).save(PASTA_ASSETS / "icons" / "512x512.png")
    recorte.resize((256, 256), Image.Resampling.NEAREST).save(PASTA_ASSETS / "icons" / "256x256.png")
    print("Gerados assets/icons/512x512.png e assets/icons/256x256.png")

    # Quadros explícitos: o Pillow usa cada um sem redimensionar de novo.
    quadros = [quadro(recorte, t) for t in TAMANHOS_ICO]
    quadros[-1].save(
        PASTA_ASSETS / "icon.ico",
        format="ICO",
        sizes=[(t, t) for t in TAMANHOS_ICO],
        append_images=quadros[:-1],
    )

    # Autoverificação: o .ico precisa ter todas as entradas pedidas.
    obtidos = set(Image.open(PASTA_ASSETS / "icon.ico").info["sizes"])
    esperado = {(t, t) for t in TAMANHOS_ICO}
    assert obtidos == esperado, f"entradas do ICO inesperadas: {sorted(obtidos)}"
    print(f"Gerado assets/icon.ico com {len(obtidos)} tamanhos")


if __name__ == "__main__":
    gerar()
