"""Leitura do PDF vetorial (PyMuPDF). Único módulo que abre arquivo de planta.

Devolve dados brutos (palavras com posição, retângulos preenchidos com cor e
contornos retangulares sem preenchimento, com cor=None);
toda a interpretação fica em `associar.py`, que é puro e testável.
"""

from __future__ import annotations

import fitz  # PyMuPDF

from .modelos import PaginaExtraida, Palavra, Retangulo

# Retângulos menores que isto (em pt) são ruído (traços, pontos de árvore).
MIN_LADO_PT = 4.0
# Retângulos maiores que esta fração da página são fundo/moldura, não estande.
MAX_FRACAO_PAGINA = 0.25
# Desenhos com mais itens que isto são formas complexas (árvores, ícones), não estandes.
MAX_ITENS_DESENHO = 12
# Pontos por curva de Bézier ao converter em polígono.
PASSOS_CURVA = 8
# Pontos mais próximos que isto (pt) são fundidos.
MIN_DIST_PT = 0.3


def cor_hex(rgb: tuple[float, float, float] | None) -> str | None:
    if rgb is None:
        return None
    r, g, b = (max(0, min(255, round(c * 255))) for c in rgb[:3])
    return f"#{r:02x}{g:02x}{b:02x}"


def extrair_pagina(caminho: str, pagina: int = 0) -> PaginaExtraida:
    doc = fitz.open(caminho)
    try:
        page = doc[pagina]
        rect = page.rect
        palavras = [
            Palavra(texto=w[4], x0=w[0], y0=w[1], x1=w[2], y1=w[3])
            for w in page.get_text("words")
            if w[4].strip()
        ]
        retangulos = _retangulos_preenchidos(page, rect.width * rect.height)
        return PaginaExtraida(
            largura=rect.width,
            altura=rect.height,
            palavras=palavras,
            retangulos=retangulos,
            arquivo=caminho,
        )
    finally:
        doc.close()


def _retangulos_preenchidos(page: "fitz.Page", area_pagina: float) -> list[Retangulo]:
    out: list[Retangulo] = []
    for d in page.get_drawings():
        fill = d.get("fill")
        r = d.get("rect")
        if r is None:
            continue
        itens = d.get("items") or []
        if fill is None:
            # Contorno sem preenchimento: só vale se for um retângulo puro ('re'),
            # usado nas células desenhadas sobre uma faixa preenchida (ex.: fila F).
            if not (len(itens) == 1 and itens[0][0] == "re" and d.get("color") is not None):
                continue
        elif len(itens) > MAX_ITENS_DESENHO:
            continue
        if r.width < MIN_LADO_PT or r.height < MIN_LADO_PT:
            continue
        if r.width * r.height > area_pagina * MAX_FRACAO_PAGINA:
            continue
        out.append(Retangulo(x0=r.x0, y0=r.y0, x1=r.x1, y1=r.y1, cor=cor_hex(fill), tracado=_tracado(itens)))
    return out


def _tracado(itens: list) -> tuple[tuple[float, float], ...] | None:
    """Converte os itens do desenho ('l' linha, 'c' Bézier cúbica, 're' retângulo,
    'qu' quadrilátero) numa sequência de pontos. Devolve None para retângulo puro
    (o polígono padrão já é o certo) ou se o traçado não fizer sentido."""
    pts: list[tuple[float, float]] = []
    tem_curva = False
    for it in itens:
        op = it[0]
        if op == "l":
            pts += [(it[1].x, it[1].y), (it[2].x, it[2].y)]
        elif op == "c":
            tem_curva = True
            p0, p1, p2, p3 = it[1], it[2], it[3], it[4]
            for k in range(PASSOS_CURVA + 1):
                t = k / PASSOS_CURVA
                u = 1 - t
                x = u**3 * p0.x + 3 * u**2 * t * p1.x + 3 * u * t**2 * p2.x + t**3 * p3.x
                y = u**3 * p0.y + 3 * u**2 * t * p1.y + 3 * u * t**2 * p2.y + t**3 * p3.y
                pts.append((x, y))
        elif op == "re":
            r = it[1]
            pts += [(r.x0, r.y0), (r.x1, r.y0), (r.x1, r.y1), (r.x0, r.y1)]
        elif op == "qu":
            q = it[1]
            pts += [(q.ul.x, q.ul.y), (q.ur.x, q.ur.y), (q.lr.x, q.lr.y), (q.ll.x, q.ll.y)]
        else:
            return None
    # funde pontos repetidos (fim de um segmento = início do próximo) e fecha
    limpos: list[tuple[float, float]] = []
    for pt in pts:
        if limpos and abs(pt[0] - limpos[-1][0]) < MIN_DIST_PT and abs(pt[1] - limpos[-1][1]) < MIN_DIST_PT:
            continue
        limpos.append(pt)
    if len(limpos) > 1 and abs(limpos[0][0] - limpos[-1][0]) < MIN_DIST_PT and abs(limpos[0][1] - limpos[-1][1]) < MIN_DIST_PT:
        limpos.pop()
    if not tem_curva or len(limpos) < 3:
        return None
    return tuple(limpos)


def renderizar_fundo(
    caminho: str,
    destino: str,
    retangulos_a_apagar: list[Retangulo],
    zoom: float = 3.0,
    pagina: int = 0,
) -> tuple[int, int]:
    """Rasteriza a página com os retângulos dos estandes pintados de branco
    (contorno cinza claro), para servir de fundo do mapa. Devolve (largura, altura) px.
    O PDF de origem NÃO é alterado (desenho só em memória)."""
    doc = fitz.open(caminho)
    try:
        page = doc[pagina]
        for r in retangulos_a_apagar:
            if r.tracado:
                shape = page.new_shape()
                shape.draw_polyline([fitz.Point(x, y) for x, y in r.tracado])
                shape.finish(color=(0.82, 0.82, 0.82), fill=(1, 1, 1), width=0.6, closePath=True)
                shape.commit()
            else:
                page.draw_rect(
                    fitz.Rect(r.x0, r.y0, r.x1, r.y1),
                    color=(0.82, 0.82, 0.82),
                    fill=(1, 1, 1),
                    width=0.6,
                )
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
        pix.save(destino)
        return pix.width, pix.height
    finally:
        doc.close()
