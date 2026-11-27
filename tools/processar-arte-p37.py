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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("acao", choices=["jardim"])
    ap.add_argument("tema", choices=sorted(JARDIM_POS))
    ap.add_argument("--entrada", required=True)
    ap.add_argument("--previa", default=None)
    a = ap.parse_args()
    jardim(a.tema, Path(a.entrada), a.previa)


if __name__ == "__main__":
    main()
