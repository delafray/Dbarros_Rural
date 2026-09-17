"""Casa cada código da planta com seu retângulo, área e medidas. Puro.

Entrada: PaginaExtraida + Manifesto. Saída: lista de Estande + alertas de
associação (código sem retângulo, retângulo de família sem código, etc.).
"""

from __future__ import annotations

from collections import Counter, defaultdict

from .modelos import Alerta, Estande, Manifesto, PaginaExtraida, Palavra, Retangulo
from .normalizar import codigo_canonico, parse_area, parse_codigo, parse_medidas, stand_nr

# Rótulos abaixo do código: tolerância horizontal (pt) e alcance vertical (pt).
TOL_X_PT = 10.0
ALCANCE_Y_PT = 32.0
# Palavras na mesma linha: diferença máxima de centro vertical (pt).
TOL_LINHA_PT = 2.5
# Distância (pt) para considerar dois centros "no mesmo lugar" (comparações).
TOL_MESMO_LUGAR_PT = 6.0
# Distância vertical máxima (pt) entre o código e a borda de um retângulo adjacente (código fora da célula).
GAP_ADJACENTE_PT = 12.0
BRANCO = "#ffffff"


def associar(pagina: PaginaExtraida, manifesto: Manifesto) -> tuple[list[Estande], list[Alerta], list[str]]:
    """Devolve (estandes, alertas, codigos_ignorados)."""
    estandes: list[Estande] = []
    alertas: list[Alerta] = []
    ignorados: list[str] = []
    pontos_ignorados: list[tuple[float, float]] = []
    rets_ordenados = sorted(pagina.retangulos, key=lambda r: r.area)
    palavras = _sem_duplicatas(pagina.palavras)

    for p in palavras:
        texto = manifesto.renomear.get(p.texto.strip(), p.texto.strip())
        parsed = parse_codigo(texto)
        if not parsed:
            continue
        familia, numero, estrito = parsed
        if familia in manifesto.ignorar_familias:
            ignorados.append(texto)
            pontos_ignorados.append((p.cx, p.cy))
            continue

        ret = _menor_retangulo_contendo(rets_ordenados, p.cx, p.cy)
        rotulos = _rotulos_abaixo(palavras, p, ret)
        area_planta = next((a for a in (parse_area(t) for t in rotulos) if a is not None), None)
        medidas = parse_medidas(" ".join(rotulos))

        codigo = codigo_canonico(familia, numero)
        est = Estande(
            codigo=codigo,
            codigo_original=p.texto.strip(),
            familia=familia,
            numero=numero,
            stand_nr=stand_nr(familia, numero),
            estrito=estrito and texto == p.texto.strip(),
            ret=ret,
            cx=p.cx,
            cy=p.cy,
            area_planta=area_planta,
            medidas=medidas,
        )
        _aplicar_manifesto(est, manifesto)
        estandes.append(est)

    _reatribuir_retangulos_compartilhados(estandes, rets_ordenados)
    alertas.extend(_alertas_retangulos(estandes, pagina.retangulos, pontos_ignorados))
    return estandes, alertas, ignorados


def _sem_duplicatas(palavras: list[Palavra]) -> list[Palavra]:
    """O Corel exporta alguns textos duas vezes (sombra/contorno) na mesma posição."""
    vistos: set[tuple[str, int, int]] = set()
    out: list[Palavra] = []
    for w in palavras:
        chave = (w.texto, round(w.cx), round(w.cy))
        if chave in vistos:
            continue
        vistos.add(chave)
        out.append(w)
    return out


def _reatribuir_retangulos_compartilhados(estandes: list[Estande], rets_por_area: list[Retangulo]) -> None:
    """Códigos escritos FORA da célula (ex.: fila F) caem todos no mesmo retângulo
    grande. Para esses, procura a célula adjacente (alinhada em x, a poucos pt) sem código."""
    por_ret: dict[tuple[float, float, float, float], list[Estande]] = defaultdict(list)
    for e in estandes:
        if e.ret is not None:
            por_ret[_chave(e.ret)].append(e)
    ocupados = {k for k, lst in por_ret.items()}
    for chave, lista in por_ret.items():
        if len(lista) < 2:
            continue
        for e in lista:
            cand = _retangulo_adjacente(e, rets_por_area, ocupados, chave)
            if cand is not None:
                e.ret = cand
                ocupados.add(_chave(cand))


def _retangulo_adjacente(e: Estande, rets: list[Retangulo], ocupados: set, ignorar: tuple) -> Retangulo | None:
    melhor: tuple[tuple[float, float], Retangulo] | None = None
    for r in rets:
        k = _chave(r)
        if k == ignorar or k in ocupados or r.cor == BRANCO:
            continue
        if not (r.x0 <= e.cx <= r.x1):
            continue
        gap = min(abs(e.cy - r.y1), abs(r.y0 - e.cy))
        if gap > GAP_ADJACENTE_PT or r.contem(e.cx, e.cy):
            continue
        chave_ordem = (round(gap), r.area)
        if melhor is None or chave_ordem < melhor[0]:
            melhor = (chave_ordem, r)
    return melhor[1] if melhor else None


def _chave(r: Retangulo) -> tuple[float, float, float, float]:
    return (r.x0, r.y0, r.x1, r.y1)


def _aplicar_manifesto(est: Estande, m: Manifesto) -> None:
    fam = m.familias.get(est.familia)
    sobre = m.estandes.get(est.codigo) or {}
    if "obs" in sobre:
        est.obs = str(sobre["obs"])
    if sobre.get("area") is not None:
        est.area = float(sobre["area"])
    elif fam and fam.area_planta_ignorar and fam.area_padrao is not None:
        est.area = fam.area_padrao
    elif est.area_planta is not None:
        est.area = est.area_planta
    elif fam and fam.area_padrao is not None:
        est.area = fam.area_padrao


def _menor_retangulo_contendo(rets_por_area: list[Retangulo], x: float, y: float) -> Retangulo | None:
    """Menor retângulo preenchido que contém o ponto. Um retângulo BRANCO (caixa de
    texto) só vale se não houver retângulo colorido em volta (ex.: L-00 no pavilhão azul)."""
    branco: Retangulo | None = None
    for r in rets_por_area:  # já ordenados do menor para o maior
        if r.cor is None or not r.contem(x, y):
            continue
        if r.cor == BRANCO:
            branco = branco or r
            continue
        return r
    return branco


def _rotulos_abaixo(palavras: list[Palavra], codigo: Palavra, ret: Retangulo | None) -> list[str]:
    """Textos das linhas logo abaixo do código (dentro do retângulo, se houver)."""
    candidatas: list[Palavra] = []
    for w in palavras:
        if w is codigo:
            continue
        dy = w.cy - codigo.cy
        if dy <= 0 or dy > ALCANCE_Y_PT:
            continue
        celula_pequena = ret is not None and ret.largura <= 4 * (codigo.x1 - codigo.x0)
        if ret is not None and not ret.contem(w.cx, w.cy):
            continue
        if not celula_pequena and abs(w.cx - codigo.cx) > max(TOL_X_PT, (codigo.x1 - codigo.x0) / 2):
            continue
        if parse_codigo(w.texto.strip()):
            continue  # outro código, não é rótulo deste
        candidatas.append(w)
    # agrupa por linha e devolve as linhas de cima para baixo, palavras da esquerda para a direita
    linhas: list[list[Palavra]] = []
    for w in sorted(candidatas, key=lambda w: (w.cy, w.x0)):
        if linhas and abs(linhas[-1][0].cy - w.cy) <= TOL_LINHA_PT:
            linhas[-1].append(w)
        else:
            linhas.append([w])
    return [" ".join(w.texto for w in sorted(l, key=lambda w: w.x0)) for l in linhas]


def _alertas_retangulos(estandes: list[Estande], retangulos: list[Retangulo],
                        pontos_ignorados: list[tuple[float, float]] | None = None) -> list[Alerta]:
    alertas: list[Alerta] = []
    por_ret: dict[tuple[float, float, float, float], list[Estande]] = defaultdict(list)
    for e in estandes:
        if e.ret is None:
            alertas.append(Alerta("erro", "sem_retangulo", f"{e.codigo}: código sem retângulo preenchido em volta.", e.codigo))
        else:
            por_ret[(e.ret.x0, e.ret.y0, e.ret.x1, e.ret.y1)].append(e)
    for chave, lista in por_ret.items():
        if len(lista) > 1:
            cods = ", ".join(sorted(x.codigo for x in lista))
            alertas.append(Alerta("erro", "retangulo_compartilhado", f"{cods}: mais de um código no mesmo retângulo.", lista[0].codigo))

    # retângulo com cor de família (cor usada por ≥3 estandes) mas sem código dentro
    cores_familia = Counter(e.cor for e in estandes if e.cor)
    cores_validas = {c for c, n in cores_familia.items() if n >= 3}
    area_tipica: dict[str, float] = {}
    for c in cores_validas:
        areas = sorted(e.ret.area for e in estandes if e.cor == c and e.ret)
        area_tipica[c] = areas[len(areas) // 2]
    usados = set(por_ret.keys())
    orfaos: dict[str, list[Retangulo]] = defaultdict(list)
    for r in retangulos:
        if r.cor in cores_validas and (r.x0, r.y0, r.x1, r.y1) not in usados                 and 0.5 * area_tipica[r.cor] <= r.area <= 2.0 * area_tipica[r.cor]:
            # ignora se algum estande está contido nele (ex.: lote 15x7 em volta do M)
            # ou se o código dentro é de família ignorada (pavilhão, família pendente)
            if any(r.contem(e.cx, e.cy) for e in estandes):
                continue
            if any(r.contem(x, y) for x, y in (pontos_ignorados or [])):
                continue
            orfaos[r.cor].append(r)
    for cor, lista in orfaos.items():
        fam = next((e.familia for e in estandes if e.cor == cor), "?")
        pos = ", ".join(f"({r.cx:.0f},{r.cy:.0f})" for r in lista[:4]) + (" …" if len(lista) > 4 else "")
        alertas.append(Alerta(
            "aviso", "retangulo_sem_codigo",
            f"{len(lista)} retângulo(s) com a cor da família {fam} ({cor}) sem código em texto dentro: {pos}. "
            f"Se são estandes, o código está em curvas ou fora da célula.",
            None,
        ))
    return alertas
