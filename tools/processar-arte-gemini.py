"""P2.1 — transforma as 8 peças do Gemini em camadas RGBA de um tema do Habitat.

Uso:  python tools/processar-arte-gemini.py <tema> [--entrada assets-novos/<tema>] [--cores 64]

Entrada (um PNG por peça, nome começando pelo código): A1 cenário, A2 casa, A3 casa com janelas acesas,
A4 primeiro plano, A5 porta (4 quadros), A6 adereços (3), A7 ajudantes (4x3), A8 objetos (4).
Saída: assets/habitat/<tema>/ (ou --saida) com as mesmas camadas da cozy-cottage e um habitat-manifest.json.

Regras: fundo magenta #FF00FF vira alfa real (nunca xadrez); a redução usa média por bloco e limita a paleta;
nada aqui toca em Clawd, Cloudling ou Atom (os moradores vêm do manifesto da cozy-cottage).
"""
import argparse
import json
import shutil
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
BASE = RAIZ / "assets" / "habitat" / "cozy-cottage"
NOMES = {"japanese-garden": "Japanese Garden", "fantasy-village": "Fantasy Village"}
LIMIAR_MAGENTA = 90  # distância RGB até #FF00FF para contar como fundo


def achar(pasta, codigo):
    achados = sorted(pasta.glob(f"{codigo}*.png"))
    if not achados:
        raise SystemExit(f"peça {codigo} não encontrada em {pasta} (esperado {codigo}*.png)")
    return achados[0]


def para_jogo(caminho, largura, altura, cores):
    """Lê a peça, tira o magenta, reduz para o tamanho do jogo e devolve RGBA (numpy altura x largura x 4)."""
    im = Image.open(caminho).convert("RGB")
    rgb = np.asarray(im, dtype=np.float32)
    dist = np.sqrt(((rgb - np.array([255, 0, 255], dtype=np.float32)) ** 2).sum(axis=2))
    solido = (dist > LIMIAR_MAGENTA).astype(np.float32)
    # média ponderada pela cobertura: o magenta nunca contamina a cor das bordas
    cobertura = Image.fromarray((solido * 255).astype(np.uint8)).resize((largura, altura), Image.BOX)
    pesos = (rgb * solido[..., None]).astype(np.float32)
    canais = [np.asarray(Image.fromarray(pesos[..., c]).resize((largura, altura), Image.BOX), dtype=np.float32) for c in range(3)]
    cob = np.asarray(cobertura, dtype=np.float32) / 255.0
    cor = np.stack([c / np.maximum(cob, 1e-3) for c in canais], axis=2).clip(0, 255)
    alfa = np.where(cob >= 0.5, 255, 0).astype(np.uint8)
    rgb8 = Image.fromarray(cor.astype(np.uint8), "RGB")
    if cores:
        rgb8 = rgb8.quantize(colors=cores, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    out = np.dstack([np.asarray(rgb8), alfa])
    out[alfa == 0, :3] = 0
    return out


def salvar(arr, destino):
    Image.fromarray(arr.astype(np.uint8), "RGBA").save(destino)


def recortar(arr, x, y, w, h):
    return arr[y:y + h, x:x + w]


def luz_ambar(casa, acesa):
    """Pixels que mudaram entre a casa apagada e a acesa viram a camada de luz âmbar."""
    diff = np.abs(casa[..., :3].astype(int) - acesa[..., :3].astype(int)).sum(axis=2)
    mudou = (diff > 40) & (acesa[..., 3] > 0)
    out = np.zeros_like(acesa)
    out[mudou] = acesa[mudou]
    out[mudou, 3] = 150
    return out


def sombra(cenario):
    """Sombra de chão: silhueta do cenário deslocada para baixo, em dois tons (45 e 90 de alfa)."""
    mask = cenario[..., 3] > 0
    out = np.zeros_like(cenario)
    for desloc, a in ((8, 45), (4, 90)):
        m = np.zeros_like(mask)
        m[desloc:] = mask[:-desloc]
        out[m & ~mask, :3] = (20, 16, 24)
        out[m & ~mask, 3] = np.maximum(out[m & ~mask, 3], a)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("tema", choices=sorted(NOMES))
    ap.add_argument("--entrada", default=None)
    ap.add_argument("--saida", default=None, help="padrão: assets/habitat/<tema>")
    ap.add_argument("--cores", type=int, default=64, help="paleta máxima por peça (0 = sem limite)")
    a = ap.parse_args()
    entrada = Path(a.entrada) if a.entrada else RAIZ / "assets-novos" / a.tema
    saida = Path(a.saida) if a.saida else RAIZ / "assets" / "habitat" / a.tema
    saida.mkdir(parents=True, exist_ok=True)
    man = json.loads((BASE / "habitat-manifest.json").read_text(encoding="utf-8"))
    L = man["layers"]
    cw, ch = man["canvas"]["width"], man["canvas"]["height"]

    cenario = para_jogo(achar(entrada, "A1"), cw, ch, a.cores)
    casa = para_jogo(achar(entrada, "A2"), cw, ch, a.cores)
    acesa = para_jogo(achar(entrada, "A3"), cw, ch, a.cores)
    salvar(cenario, saida / L["backdrop"])
    salvar(casa, saida / L["cottageNight"])
    salvar(luz_ambar(casa, acesa), saida / L["cottageAmber"])
    salvar(para_jogo(achar(entrada, "A4"), cw, ch, a.cores), saida / L["foreground"])
    salvar(sombra(cenario), saida / L["shadow"])

    pw, ph = L["door"]["width"], L["door"]["height"]
    porta = para_jogo(achar(entrada, "A5"), pw * 4, ph, a.cores)
    for i, nome in enumerate(("closed", "opening", "open", "closing")):
        salvar(recortar(porta, i * pw, 0, pw, ph), saida / L["door"]["frames"][nome])

    est = list(man["stations"].values())
    adere = para_jogo(achar(entrada, "A6"), 96 * 3, 56, a.cores)
    for i, s in enumerate(est):
        p = s["props"]
        # a estação do meio tem 54 de altura: perde 2 px do topo (vazio) para manter o pé do objeto
        salvar(recortar(adere, i * 96, 56 - p["height"], p["width"], p["height"]), saida / p["file"])

    for f in L["smoke"]["frames"]:  # fumaça reaproveitada: a chaminé fica na mesma posição em todos os temas
        shutil.copyfile(BASE / f, saida / f)

    h = man["helpers"]
    folha = para_jogo(achar(entrada, "A7"), 4 * h["frame"]["width"], 3 * h["frame"]["height"], a.cores)
    salvar(folha, saida / "helpers.png")
    objs = para_jogo(achar(entrada, "A8"), 4 * man["garden"]["frame"]["width"], man["garden"]["frame"]["height"], a.cores)
    salvar(objs, saida / "garden-objects.png")

    man["id"] = a.tema
    man["name"] = NOMES[a.tema]
    man["helpers"]["frames"] = 4
    man["helpers"]["frameMs"] = 200
    (saida / "habitat-manifest.json").write_text(json.dumps(man, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    prev = Image.new("RGBA", (cw, ch), (36, 35, 42, 255))
    for nome in (L["shadow"], L["backdrop"], L["cottageNight"], L["cottageAmber"], L["foreground"]):
        prev.alpha_composite(Image.open(saida / nome).convert("RGBA"))
    prev.resize((cw * 3, ch * 3), Image.NEAREST).save(entrada / "_preview.png")  # fora do tema: não vira asset
    print("tema gerado em", saida)


if __name__ == "__main__":
    main()
