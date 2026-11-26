"""P2.1 — transforma as peças do Gemini em camadas RGBA de um tema do Habitat.

Uso:  python tools/processar-arte-gemini.py <tema> --entrada <pasta com A1..A8> [--saida dir] [--cores 64]

Entrada (um PNG por peça, nome começando pelo código): A1 cenário, A2 casa, A3 casa com janelas acesas,
A4 primeiro plano, A5 porta (4 quadros), A6 adereços (3), A7 ajudantes (4 colunas x 3 linhas), A8 objetos (4).
Saída: assets/habitat/<tema>/ com as mesmas camadas e dimensões da cozy-cottage e um habitat-manifest.json.

Regras: fundo magenta vira alfa real (nunca xadrez); peças com contorno (casa, porta, adereços, objetos,
ajudantes) são recortadas pelo conteúdo e encaixadas na mesma caixa da Cozy Cottage, sem esticar;
nada aqui toca em Clawd, Cloudling ou Atom (os moradores vêm do manifesto da cozy-cottage).
"""
import argparse
import json
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance

RAIZ = Path(__file__).resolve().parent.parent
BASE = RAIZ / "assets" / "habitat" / "cozy-cottage"
NOMES = {"japanese-garden": "Japanese Garden", "fantasy-village": "Fantasy Village"}
CASA_CAIXA = (92, 88)  # largura x altura máximas da casa no canvas (a casa fica ao fundo, deixando o cenário aparecer)
CASA_CHAO_Y = {"japanese-garden": 134, "fantasy-village": 124}  # onde a base da casa pisa (o japonês tem lago atrás: fica mais à frente)
ESCALA_ADERECOS = 0.7   # adereços das estações e objetos do jardim ficam menores que a caixa, na escala da casa
ESCALA_OBJETOS = 0.65
# posição, relativa à casa já colocada, de: porta (centro x, base y, largura, altura) e chaminé (centro x)
PORTA_REL = {"japanese-garden": (0.496, 0.876, 0.30, 0.35), "fantasy-village": (0.524, 0.903, 0.282, 0.40)}
CHAMINE_X = 0.78
LIMIAR_MAGENTA = 90  # distância RGB até #FF00FF para contar como fundo
BOX = Image.Resampling.BOX
MAG = np.array([255, 0, 255], dtype=np.float32)


def achar(pasta, codigo):
    achados = sorted(pasta.glob(f"{codigo}*.png"))
    if not achados:
        raise SystemExit(f"peça {codigo} não encontrada em {pasta} (esperado {codigo}*.png)")
    return achados[0]


def tirar_magenta(caminho):
    """Peça inteira em RGBA, em resolução cheia. Franja rosa de 2 px junto ao fundo também sai."""
    rgb = np.asarray(Image.open(caminho).convert("RGB"), dtype=np.float32)
    fundo = np.sqrt(((rgb - MAG) ** 2).sum(axis=2)) <= LIMIAR_MAGENTA
    rosa = (rgb[..., 0] - rgb[..., 1] > 60) & (rgb[..., 2] - rgb[..., 1] > 60)
    for _ in range(2):
        perto = fundo.copy()
        perto[1:] |= fundo[:-1]
        perto[:-1] |= fundo[1:]
        perto[:, 1:] |= fundo[:, :-1]
        perto[:, :-1] |= fundo[:, 1:]
        fundo = fundo | (perto & rosa)
    alfa = np.where(fundo, 0, 255).astype(np.uint8)
    return np.dstack([rgb.astype(np.uint8), alfa])


def caixa_do_conteudo(rgba):
    ys, xs = np.nonzero(rgba[..., 3])
    if xs.size == 0:
        raise SystemExit("peça sem conteúdo depois de tirar o magenta")
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def uniao_de(caixas):
    return (min(c[0] for c in caixas), min(c[1] for c in caixas), max(c[2] for c in caixas), max(c[3] for c in caixas))


def reduzir(rgba, w, h):
    """Reduz por caixa com cor ponderada pela cobertura (o magenta não contamina as bordas)."""
    a = rgba[..., 3].astype(np.float32) / 255.0
    cob = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).resize((w, h), BOX), dtype=np.float32) / 255.0
    canais = [np.asarray(Image.fromarray((rgba[..., c] * a).astype(np.float32)).resize((w, h), BOX), dtype=np.float32) for c in range(3)]
    cor = np.stack([c / np.maximum(cob, 1e-3) for c in canais], axis=2).clip(0, 255).astype(np.uint8)
    alfa = np.where(cob >= 0.5, 255, 0).astype(np.uint8)
    out = np.dstack([cor, alfa])
    out[alfa == 0, :3] = 0
    return out


def colar(destino, pedaco, x, y):
    """Cola o pedaço no destino, cortando o que passar da borda."""
    H, W = destino.shape[:2]
    h, w = pedaco.shape[:2]
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(W, x + w), min(H, y + h)
    if x1 <= x0 or y1 <= y0:
        return
    destino[y0:y1, x0:x1] = pedaco[y0 - y:y1 - y, x0 - x:x1 - x]


def encaixar(rgba, caixa, escala, box_w, box_h, centro=False):
    """Recorta a caixa, reduz pela escala e alinha embaixo (ou centraliza) numa caixa box_w x box_h transparente."""
    x0, y0, x1, y1 = caixa
    sub = rgba[y0:y1, x0:x1]
    nw = max(1, round(sub.shape[1] * escala))
    nh = max(1, round(sub.shape[0] * escala))
    red = reduzir(sub, nw, nh)
    out = np.zeros((box_h, box_w, 4), dtype=np.uint8)
    colar(out, red, (box_w - nw) // 2, (box_h - nh) // 2 if centro else box_h - nh)
    return out


def escala_caber(caixas, box_w, box_h):
    """Escala única que faz todas as caixas caberem na caixa de destino (mesma proporção entre quadros)."""
    return min(min(box_w / (x1 - x0), box_h / (y1 - y0)) for x0, y0, x1, y1 in caixas)


def paleta(rgba, cores):
    if not cores:
        return rgba
    im = Image.fromarray(rgba[..., :3], "RGB").quantize(colors=cores, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    out = np.dstack([np.asarray(im), rgba[..., 3]])
    out[rgba[..., 3] == 0, :3] = 0
    return out


def salvar(arr, destino, cores):
    Image.fromarray(paleta(arr, cores), "RGBA").save(destino)


def luz_ambar(casa, acesa):
    """Pixels que mudaram entre a casa apagada e a acesa viram a camada de luz âmbar."""
    diff = np.abs(casa[..., :3].astype(int) - acesa[..., :3].astype(int)).sum(axis=2)
    mudou = (diff > 40) & (acesa[..., 3] > 0)
    out = np.zeros_like(acesa)
    out[mudou] = acesa[mudou]
    out[mudou, 3] = 150
    return out


def luz_por_cor(casa, acesa):
    """Quando a casa acesa é outro desenho: cor quente da A3, só onde a casa apagada é escura (vidro das janelas)."""
    r, g, b = (acesa[..., i].astype(int) for i in range(3))
    quente = (acesa[..., 3] > 0) & (r > 200) & (g > 120) & (g < 240) & (b < 120) & (r - b > 110)
    escuro = (casa[..., 3] > 0) & (casa[..., :3].astype(int).sum(axis=2) < 300)
    for _ in range(2):
        e = escuro.copy()
        e[1:] |= escuro[:-1]
        e[:-1] |= escuro[1:]
        e[:, 1:] |= escuro[:, :-1]
        e[:, :-1] |= escuro[:, 1:]
        escuro = e
    mudou = quente & escuro
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


def celulas_de(rgba, colunas, linhas=1):
    cw, ch = rgba.shape[1] // colunas, rgba.shape[0] // linhas
    return [[rgba[r * ch:(r + 1) * ch, c * cw:(c + 1) * cw] for c in range(colunas)] for r in range(linhas)]


def previa(saida, man, destino):
    """Prévia de dia e de noite só com cenário, casa, adereços e objetos (os moradores vêm da app)."""
    cw, ch = man["canvas"]["width"], man["canvas"]["height"]
    L = man["layers"]
    base = Image.new("RGBA", (cw, ch), (36, 35, 42, 255))
    for nome in (L["shadow"], L["backdrop"], L["cottageNight"], L["cottageAmber"], L["foreground"]):
        base.alpha_composite(Image.open(saida / nome).convert("RGBA"))
    d = L["door"]
    base.alpha_composite(Image.open(saida / d["frames"]["closed"]).convert("RGBA"), (d["x"], d["y"]))
    for s in man["stations"].values():
        p = s["props"]
        base.alpha_composite(Image.open(saida / p["file"]).convert("RGBA"), (p["x"], p["y"]))
    obj = Image.open(saida / man["garden"]["file"]).convert("RGBA")
    fw = man["garden"]["frame"]["width"]
    for it in man["garden"]["items"].values():
        base.alpha_composite(obj.crop((it["col"] * fw, 0, it["col"] * fw + fw, fw)), (it["x"] - fw // 2, it["y"] - fw))
    dia = base.resize((cw * 3, ch * 3), Image.NEAREST)
    noite = ImageEnhance.Color(ImageEnhance.Brightness(dia).enhance(0.6)).enhance(0.85)
    dia.save(destino / "_previa-dia.png")
    noite.save(destino / "_previa-noite.png")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("tema", choices=sorted(NOMES))
    ap.add_argument("--entrada", required=True)
    ap.add_argument("--saida", default=None, help="padrão: assets/habitat/<tema>")
    ap.add_argument("--previas", default=None, help="pasta das prévias (padrão: a pasta de entrada)")
    ap.add_argument("--cores", type=int, default=64, help="paleta máxima por camada (0 = sem limite)")
    a = ap.parse_args()
    entrada = Path(a.entrada)
    saida = Path(a.saida) if a.saida else RAIZ / "assets" / "habitat" / a.tema
    saida.mkdir(parents=True, exist_ok=True)
    man = json.loads((BASE / "habitat-manifest.json").read_text(encoding="utf-8"))
    L = man["layers"]
    cw, ch = man["canvas"]["width"], man["canvas"]["height"]
    cores = a.cores

    # Cenário: a peça inteira vai para o tamanho do canvas (a proporção do Gemini é a da cena).
    cenario = reduzir(tirar_magenta(achar(entrada, "A1")), cw, ch)
    salvar(cenario, saida / L["backdrop"], cores)
    salvar(sombra(cenario), saida / L["shadow"], 0)

    # Primeiro plano: ajusta à largura do canvas; se sobrar altura, corta o topo e mantém o chão.
    fg_full = tirar_magenta(achar(entrada, "A4"))
    fg_h = round(fg_full.shape[0] * cw / fg_full.shape[1])
    fg = reduzir(fg_full, cw, fg_h)
    fg = fg[fg_h - ch:] if fg_h >= ch else np.vstack([np.zeros((ch - fg_h, cw, 4), dtype=np.uint8), fg])
    salvar(fg, saida / L["foreground"], cores)

    # Casa: A2 e A3 usam a mesma transformação (caixa e escala de A2), no lugar da casa da Cozy.
    casa_full = tirar_magenta(achar(entrada, "A2"))
    acesa_full = tirar_magenta(achar(entrada, "A3"))
    caixa_casa = caixa_do_conteudo(casa_full)
    tw, th = CASA_CAIXA
    ax0, ay0 = man["doorAnchor"]["x"] - tw // 2, CASA_CHAO_Y[a.tema] - th
    esc_casa = escala_caber([caixa_casa], tw, th)
    casa_ok = np.zeros((ch, cw, 4), dtype=np.uint8)
    acesa_ok = np.zeros((ch, cw, 4), dtype=np.uint8)
    colar(casa_ok, encaixar(casa_full, caixa_casa, esc_casa, tw, th), ax0, ay0)
    caixa_acesa = caixa_do_conteudo(acesa_full)
    mesmo_desenho = all(abs((c1[2] - c1[0]) / (c2[2] - c2[0]) - 1) < 0.02 and abs((c1[3] - c1[1]) / (c2[3] - c2[1]) - 1) < 0.02 for c1, c2 in [(caixa_acesa, caixa_casa)])
    if mesmo_desenho:
        colar(acesa_ok, encaixar(acesa_full, caixa_casa, esc_casa, tw, th), ax0, ay0)
    else:  # a A3 é outro desenho: alinha pelo próprio contorno
        colar(acesa_ok, encaixar(acesa_full, caixa_acesa, escala_caber([caixa_acesa], tw, th), tw, th), ax0, ay0)
    hx0, hy0, hx1, hy1 = caixa_do_conteudo(casa_ok)
    hw, hh = hx1 - hx0, hy1 - hy0
    cx_rel, base_rel, pw_rel, ph_rel = PORTA_REL[a.tema]
    pw, ph = round(pw_rel * hw), round(ph_rel * hh)
    L["door"].update(x=round(hx0 + cx_rel * hw - pw / 2), y=round(hy0 + base_rel * hh - ph), width=pw, height=ph)
    L["smoke"].update(x=round(hx0 + CHAMINE_X * hw - L["smoke"]["width"] / 2), y=max(0, hy0 - 20))
    man["cottageHitBox"] = {"x": hx0, "y": hy0, "width": hw, "height": hh}
    salvar(casa_ok, saida / L["cottageNight"], cores)
    luz = luz_ambar(casa_ok, acesa_ok)
    if not mesmo_desenho or (luz[..., 3] > 0).sum() > 4000:  # diferença enorme = a A3 tem a casa toda em tons de noite
        luz = luz_por_cor(casa_ok, acesa_ok)
    salvar(luz, saida / L["cottageAmber"], cores)

    # Porta: os 4 quadros usam a mesma caixa (união do conteúdo), para a porta não tremer ao abrir.
    quadros = celulas_de(tirar_magenta(achar(entrada, "A5")), 4)[0]
    uniao = uniao_de([caixa_do_conteudo(q) for q in quadros])
    esc_porta = escala_caber([uniao], pw, ph)
    for q, nome in zip(quadros, ("closed", "opening", "open", "closing")):
        salvar(encaixar(q, uniao, esc_porta, pw, ph), saida / L["door"]["frames"][nome], cores)

    # Adereços: 3 estações, mesma escala, cada uma alinhada embaixo na caixa do manifesto.
    est = list(man["stations"].values())
    pecas = celulas_de(tirar_magenta(achar(entrada, "A6")), 3)[0]
    caixas = [caixa_do_conteudo(c) for c in pecas]
    esc = ESCALA_ADERECOS * escala_caber(caixas, min(s["props"]["width"] for s in est), min(s["props"]["height"] for s in est))
    for s, peca, cx in zip(est, pecas, caixas):
        p = s["props"]
        salvar(encaixar(peca, cx, esc, p["width"], p["height"]), saida / p["file"], cores)

    for f in L["smoke"]["frames"]:  # mesmos quadros de fumaça; a posição vem de FUMACA
        shutil.copyfile(BASE / f, saida / f)

    # Ajudantes: 4 colunas (quadros) x 3 linhas (moradores); cada linha usa a caixa comum dos quadros dela.
    h = man["helpers"]
    fw_, fh_ = h["frame"]["width"], h["frame"]["height"]
    sheet = np.zeros((3 * fh_, 4 * fw_, 4), dtype=np.uint8)
    for r, linha in enumerate(celulas_de(tirar_magenta(achar(entrada, "A7")), 4, 3)):
        uniao = uniao_de([caixa_do_conteudo(q) for q in linha])
        esc_aj = escala_caber([uniao], fw_, fh_)
        for c, q in enumerate(linha):
            colar(sheet, encaixar(q, uniao, esc_aj, fw_, fh_, centro=True), c * fw_, r * fh_)
    salvar(sheet, saida / h["file"], cores)

    # Objetos do jardim: mesma escala, alinhados embaixo (a âncora do manifesto é o centro da base).
    g = man["garden"]
    gw, gh = g["frame"]["width"], g["frame"]["height"]
    n = len(g["items"])
    pecas = celulas_de(tirar_magenta(achar(entrada, "A8")), n)[0]
    caixas = [caixa_do_conteudo(c) for c in pecas]
    esc_obj = ESCALA_OBJETOS * escala_caber(caixas, gw, gh)
    sheet = np.zeros((gh, n * gw, 4), dtype=np.uint8)
    for i, (peca, cx) in enumerate(zip(pecas, caixas)):
        colar(sheet, encaixar(peca, cx, esc_obj, gw, gh), i * gw, 0)
    salvar(sheet, saida / g["file"], cores)

    man["id"] = a.tema
    man["name"] = NOMES[a.tema]
    man["helpers"]["frames"] = 4
    man["helpers"]["frameMs"] = 200
    (saida / "habitat-manifest.json").write_text(json.dumps(man, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    pv = Path(a.previas) if a.previas else entrada
    pv.mkdir(parents=True, exist_ok=True)
    previa(saida, man, pv)
    print("tema gerado em", saida)


if __name__ == "__main__":
    main()
