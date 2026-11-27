"""P3.7 — integra a arte do Codex: objetos do jardim maiores e reposicionados no gramado.

Uso:  python tools/processar-arte-p37.py jardim <tema> --entrada <garden-objects-<tema>.png> [--previa <png>]

Reaproveita o pipeline do processador do Gemini (magenta -> alfa real, redução com cor ponderada,
paleta limitada). Só toca em garden-objects.png e na seção "garden" do manifesto do tema.
"""
import argparse
import importlib.util
import json
import shutil
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location("proc", RAIZ / "tools" / "processar-arte-gemini.py")
P = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(P)

QUADRO_JARDIM = 32      # antes 24: os objetos ficavam com ~15 px e sumiam atrás do primeiro plano
ESCALA_JARDIM = 0.85    # fração do quadro ocupada pelo maior objeto
# Âncora = centro da base de cada objeto, no gramado (fora da faixa do primeiro plano e longe das estações).
JARDIM_POS = {
    "cozy-cottage-v2": {"bench": (122, 160), "campfire": (210, 162), "kitten": (36, 150), "mailbox": (290, 150)},
    "japanese-garden": {"bench": (122, 160), "campfire": (210, 162), "kitten": (36, 150), "mailbox": (290, 150)},
    "fantasy-village": {"bench": (122, 160), "campfire": (210, 162), "kitten": (36, 150), "mailbox": (290, 150)},
}
ORDEM = ["bench", "campfire", "kitten", "mailbox"]


def jardim(tema, entrada, previa=None, cores=64):
    pasta = RAIZ / "assets" / "habitat" / tema
    man_path = pasta / "habitat-manifest.json"
    man = json.loads(man_path.read_text(encoding="utf-8"))
    g = man["garden"]
    pecas = P.celulas_de(P.tirar_magenta(entrada), len(ORDEM))[0]
    caixas = [P.caixa_do_conteudo(c) for c in pecas]
    q = QUADRO_JARDIM
    esc = ESCALA_JARDIM * P.escala_caber(caixas, q, q)
    sheet = np.zeros((q, len(ORDEM) * q, 4), dtype=np.uint8)
    for i, (peca, cx) in enumerate(zip(pecas, caixas)):
        P.colar(sheet, P.encaixar(peca, cx, esc, q, q), i * q, 0)
    P.salvar(sheet, pasta / g["file"], cores)
    g["frame"] = {"width": q, "height": q}
    g["items"] = {nome: {"col": i, "x": JARDIM_POS[tema][nome][0], "y": JARDIM_POS[tema][nome][1]} for i, nome in enumerate(ORDEM)}
    man_path.write_text(json.dumps(man, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    if previa:
        P.previa(pasta, man, Path(previa).parent)
        (Path(previa).parent / "_previa-dia.png").replace(previa)
        (Path(previa).parent / "_previa-noite.png").unlink(missing_ok=True)
    print("jardim atualizado em", pasta)


# Castelo do Fantasy Village (P3.7.4): ocupa a caixa da casa antiga, com a base no mesmo chão.
CASTELO_CAIXA = (92, 88)
CASTELO_CHAO_Y = 124
# Portão (arco + soleira) relativo ao contorno do castelo: centro x, base, largura, altura (medido no fv-castle.png).
CASTELO_PORTAO_REL = (0.491, 0.978, 0.390, 0.345)


def castelo(entrada_dir, previa=None, cores=64):
    tema = "fantasy-village"
    pasta = RAIZ / "assets" / "habitat" / tema
    man_path = pasta / "habitat-manifest.json"
    man = json.loads(man_path.read_text(encoding="utf-8"))
    L = man["layers"]
    cw, ch = man["canvas"]["width"], man["canvas"]["height"]
    casa_full = P.tirar_magenta(entrada_dir / "fv-castle.png")
    acesa_full = P.tirar_magenta(entrada_dir / "fv-castle-lit.png")
    caixa = P.caixa_do_conteudo(casa_full)
    tw, th = CASTELO_CAIXA
    ax0, ay0 = man["doorAnchor"]["x"] - tw // 2, CASTELO_CHAO_Y - th
    esc = P.escala_caber([caixa], tw, th)
    casa_ok = np.zeros((ch, cw, 4), dtype=np.uint8)
    acesa_ok = np.zeros((ch, cw, 4), dtype=np.uint8)
    P.colar(casa_ok, P.encaixar(casa_full, caixa, esc, tw, th), ax0, ay0)
    P.colar(acesa_ok, P.encaixar(acesa_full, caixa, esc, tw, th), ax0, ay0)  # mesmo desenho: mesma caixa e escala
    hx0, hy0, hx1, hy1 = P.caixa_do_conteudo(casa_ok)
    hw, hh = hx1 - hx0, hy1 - hy0
    cx_rel, base_rel, pw_rel, ph_rel = CASTELO_PORTAO_REL
    pw, ph = round(pw_rel * hw), round(ph_rel * hh)
    L["door"].update(x=round(hx0 + cx_rel * hw - pw / 2), y=round(hy0 + base_rel * hh - ph), width=pw, height=ph)
    man["cottageHitBox"] = {"x": hx0, "y": hy0, "width": hw, "height": hh}
    # Castelo não tem chaminé: sem fumaça (o renderizador ignora a lista vazia); as janelas âmbar mostram a atividade.
    for f in L["smoke"]["frames"]:
        (pasta / f).unlink(missing_ok=True)
    L["smoke"]["frames"] = []
    P.salvar(casa_ok, pasta / L["cottageNight"], cores)
    P.salvar(P.luz_ambar(casa_ok, acesa_ok), pasta / L["cottageAmber"], cores)
    quadros = P.celulas_de(P.tirar_magenta(entrada_dir / "fv-castle-door.png"), 4)[0]
    uniao = P.uniao_de([P.caixa_do_conteudo(q) for q in quadros])
    esc_porta = P.escala_caber([uniao], pw, ph)
    for q, nome in zip(quadros, ("closed", "opening", "open", "closing")):
        P.salvar(P.encaixar(q, uniao, esc_porta, pw, ph), pasta / L["door"]["frames"][nome], cores)
    man_path.write_text(json.dumps(man, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    if previa:
        P.previa(pasta, man, Path(previa).parent)
        (Path(previa).parent / "_previa-dia.png").replace(previa)
        (Path(previa).parent / "_previa-noite.png").unlink(missing_ok=True)
    print("castelo:", man["cottageHitBox"], "porta:", {k: L["door"][k] for k in ("x", "y", "width", "height")})


# Árvores (P3.7.2): as do fundo saem e entram 6 por tema como sprites, um par por dia (decisão do dono).
ARVORE_QUADRO = (96, 112)
# Por tema: retângulos (x0, y0, x1, y1) do canvas a apagar (copa/tronco sobre o céu) e a preencher espelhando
# os vizinhos (pé do tronco sobre moita/gramado); base (centro x, chão y) de cada lado.
# A faixa espelhada deve ter só a largura do tronco antigo: o tronco novo cobre o meio (faixa larga duplica objetos).
# "preencher" aceita um 5º campo: "e" (só do vizinho da esquerda), "d" (só da direita) ou nada (metade de cada).
ARVORES = {
    # O clássico não tem folha própria: usa as árvores do Cozy v2; o fundo dele só tem as árvores e a chaminé,
    # e a ilha (camada da casa) fica na frente do pé do tronco.
    "cozy-cottage": {
        "apagar": [(10, 0, 130, 145), (195, 0, 305, 145)],
        "preencher": [],
        "base": {"left": (72, 138), "right": (245, 138)},
    },
    "cozy-cottage-v2": {
        "apagar": [(4, 0, 134, 107), (186, 0, 316, 107)],
        "preencher": [(56, 107, 92, 119), (232, 107, 266, 119)],
        "base": {"left": (74, 119), "right": (249, 119)},
    },
    "japanese-garden": {
        # copa; lanterna da direita (a da esquerda fica na faixa da copa); lanternas, pano e tronco do pinheiro sobre o céu
        "apagar": [(0, 0, 142, 78), (84, 78, 98, 87), (200, 0, 316, 66), (235, 66, 248, 90), (248, 66, 274, 90), (286, 66, 300, 90)],
        "preencher": [(27, 78, 37, 89, "e"), (37, 78, 61, 100), (250, 90, 276, 101)],
        "base": {"left": (49, 101), "right": (263, 102)},
    },
    "fantasy-village": {
        "apagar": [(6, 0, 62, 90), (62, 0, 130, 72), (55, 72, 93, 97), (196, 0, 312, 85), (240, 85, 268, 93)],
        "preencher": [(93, 72, 101, 97, "d"), (55, 97, 101, 118), (240, 93, 268, 108), (228, 108, 268, 118)],
        "base": {"left": (78, 118), "right": (254, 118)},
    },
}


def espelhar(img, x0, y0, x1, y1, lado=None):
    """Preenche o retângulo com os pixels vizinhos espelhados (metade esquerda da esquerda, metade direita da direita)."""
    meio = {"e": x1, "d": x0}.get(lado, (x0 + x1) // 2)
    for y in range(y0, y1):
        for x in range(x0, x1):
            if x < meio:
                sx = x0 - 1 - (x - x0)
            else:
                sx = x1 + (x1 - 1 - x)
            sx = min(max(sx, 0), img.shape[1] - 1)
            img[y, x] = img[y, sx]


def limpar_e_centrar(quadro):
    """Tira pedaços de árvores vizinhas (colunas separadas por vão vazio do bloco principal) e centra pelo tronco."""
    h, w = quadro.shape[:2]
    cols = quadro[..., 3].any(axis=0)
    linha = quadro[h - 12, :, 3] > 0  # altura do tronco, acima do tufo de grama
    xs = np.nonzero(linha)[0]
    meio = int(round((xs.min() + xs.max()) / 2)) if xs.size else w // 2
    x0 = meio
    while x0 > 0 and cols[x0 - 1]:
        x0 -= 1
    x1 = meio
    while x1 < w - 1 and cols[x1 + 1]:
        x1 += 1
    out = np.zeros_like(quadro)
    d = w // 2 - meio  # desloca sem dar a volta (o que passar da borda é cortado)
    a0, a1 = max(x0, -d), min(x1 + 1, w - d)
    out[:, a0 + d:a1 + d] = quadro[:, a0:a1]
    return out


def arvores(tema, entrada, previa=None, cores=64):
    cfg = ARVORES[tema]
    pasta = RAIZ / "assets" / "habitat" / tema
    man_path = pasta / "habitat-manifest.json"
    man = json.loads(man_path.read_text(encoding="utf-8"))
    L = man["layers"]
    # Fundo original guardado na primeira execução: rodar de novo parte sempre dele.
    original = RAIZ / "assets-novos" / "p3.7" / f"_fundo-original-{tema}.png"
    if not original.exists():
        shutil.copyfile(pasta / L["backdrop"], original)
    fundo = np.array(Image.open(original).convert("RGBA"))
    for x0, y0, x1, y1 in cfg["apagar"]:
        fundo[y0:y1, x0:x1] = 0
    for r in cfg["preencher"]:
        espelhar(fundo, *r)
    P.salvar(fundo, pasta / L["backdrop"], 0)
    P.salvar(P.sombra(fundo), pasta / L["shadow"], 0)
    pecas = P.celulas_de(P.tirar_magenta(entrada), 6)[0]
    caixas = [P.caixa_do_conteudo(c) for c in pecas]
    w, h = ARVORE_QUADRO  # caixa que define a escala (tamanho visual aprovado)
    esc = P.escala_caber(caixas, w, h)
    largo = 3 * w  # centra pelo tronco numa caixa larga e depois corta na largura da árvore mais larga
    quadros = [limpar_e_centrar(P.encaixar(peca, cx, esc, largo, h)) for peca, cx in zip(pecas, caixas)]
    meia = max(max(largo // 2 - c.min(), c.max() + 1 - largo // 2) for c in (np.nonzero(q[..., 3].any(axis=0))[0] for q in quadros))
    w = 2 * int(meia)
    sheet = np.zeros((h, 6 * w, 4), dtype=np.uint8)
    for i, q in enumerate(quadros):
        P.colar(sheet, q[:, largo // 2 - meia:largo // 2 + meia], i * w, 0)
    P.salvar(sheet, pasta / "trees.png", cores)
    man["trees"] = {
        "file": "trees.png",
        "frame": {"width": w, "height": h},
        "count": 6,
        "left": {"x": cfg["base"]["left"][0], "y": cfg["base"]["left"][1]},
        "right": {"x": cfg["base"]["right"][0], "y": cfg["base"]["right"][1]},
    }
    man_path.write_text(json.dumps(man, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    if previa:
        previa_arvores(pasta, man, Path(previa))
    print("árvores:", tema, man["trees"])


def previa_arvores(pasta, man, destino):
    """Prévia com 3 pares de árvores lado a lado (fundo, árvores, casa, primeiro plano)."""
    L = man["layers"]
    t = man["trees"]
    w, h = t["frame"]["width"], t["frame"]["height"]
    sheet = Image.open(pasta / t["file"]).convert("RGBA")
    quadros = []
    for esq, dir_ in ((0, 1), (2, 3), (4, 5)):
        c = Image.new("RGBA", (320, 192), (36, 35, 42, 255))
        c.alpha_composite(Image.open(pasta / L["backdrop"]).convert("RGBA"))
        for lado, i in (("left", esq), ("right", dir_)):
            c.alpha_composite(sheet.crop((i * w, 0, i * w + w, h)), (t[lado]["x"] - w // 2, t[lado]["y"] - h))
        for nome in (L["cottageNight"], L["foreground"]):
            c.alpha_composite(Image.open(pasta / nome).convert("RGBA"))
        quadros.append(c)
    out = Image.new("RGBA", (320 * 3, 192))
    for i, q in enumerate(quadros):
        out.paste(q, (320 * i, 0))
    out.resize((960 * 2, 192 * 2), Image.NEAREST).save(destino)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("acao", choices=["jardim", "castelo", "arvores"])
    ap.add_argument("tema", choices=sorted(set(JARDIM_POS) | set(ARVORES)))
    ap.add_argument("--entrada", required=True, help="jardim: o PNG da folha; castelo: a pasta com fv-castle*.png")
    ap.add_argument("--previa", default=None)
    a = ap.parse_args()
    if a.acao == "castelo":
        assert a.tema == "fantasy-village", "o castelo é só do Fantasy Village"
        castelo(Path(a.entrada), a.previa)
    elif a.acao == "arvores":
        arvores(a.tema, Path(a.entrada), a.previa)
    else:
        jardim(a.tema, Path(a.entrada), a.previa)


if __name__ == "__main__":
    main()
