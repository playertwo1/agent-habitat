"""P3.7 — integra a arte do Codex: objetos do jardim maiores e reposicionados no gramado.

Uso:  python tools/processar-arte-p37.py jardim <tema> --entrada <garden-objects-<tema>.png> [--previa <png>]

Reaproveita o pipeline do processador do Gemini (magenta -> alfa real, redução com cor ponderada,
paleta limitada). Só toca em garden-objects.png e na seção "garden" do manifesto do tema.
"""
import argparse
import importlib.util
import json
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("acao", choices=["jardim", "castelo"])
    ap.add_argument("tema", choices=sorted(JARDIM_POS))
    ap.add_argument("--entrada", required=True, help="jardim: o PNG da folha; castelo: a pasta com fv-castle*.png")
    ap.add_argument("--previa", default=None)
    a = ap.parse_args()
    if a.acao == "castelo":
        assert a.tema == "fantasy-village", "o castelo é só do Fantasy Village"
        castelo(Path(a.entrada), a.previa)
    else:
        jardim(a.tema, Path(a.entrada), a.previa)


if __name__ == "__main__":
    main()
