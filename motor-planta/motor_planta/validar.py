"""Regras de validação da planta contra a convenção e o manifesto. Puro.

Cada regra é uma função (estandes, manifesto, contexto) -> list[Alerta].
Para acrescentar uma regra: escrever a função, registrar em REGRAS, testar.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any, Callable

from .modelos import Alerta, Estande, Manifesto

Contexto = dict[str, Any]  # ex.: {"contagem_planilha": {"P": 33}}
Regra = Callable[[list[Estande], Manifesto, Contexto], list[Alerta]]


def r_codigo_fora_do_padrao(estandes: list[Estande], m: Manifesto, ctx: Contexto) -> list[Alerta]:
    """Código escrito sem hífen ou sem dois dígitos (ex.: 'D02', 'E14', 'B-1')."""
    out = []
    for e in estandes:
        if not e.estrito and e.codigo_original not in m.renomear:
            out.append(Alerta("aviso", "codigo_fora_do_padrao",
                              f"{e.codigo_original}: fora do padrão LETRA-NN (lido como {e.codigo}).", e.codigo))
    return out


def r_codigo_duplicado(estandes: list[Estande], m: Manifesto, ctx: Contexto) -> list[Alerta]:
    """O mesmo código aparece mais de uma vez na planta."""
    cont = Counter(e.codigo for e in estandes)
    return [Alerta("erro", "codigo_duplicado", f"{c}: aparece {n} vezes.", c)
            for c, n in sorted(cont.items()) if n > 1]


def r_familia_desconhecida(estandes: list[Estande], m: Manifesto, ctx: Contexto) -> list[Alerta]:
    """Família presente na planta, não ignorada e ausente do manifesto."""
    fams = sorted({e.familia for e in estandes} - set(m.familias) - m.ignorar_familias)
    return [Alerta("erro", "familia_desconhecida",
                   f"Família {f} está na planta mas não no manifesto (nem em ignorar_familias).", None)
            for f in fams]


def r_numeracao(estandes: list[Estande], m: Manifesto, ctx: Contexto) -> list[Alerta]:
    """Numeração deve começar em 01 e ser contínua; X-00 não existe no sistema."""
    out = []
    por_fam: dict[str, set[int]] = defaultdict(set)
    for e in estandes:
        if e.numero is not None:
            por_fam[e.familia].add(e.numero)
    for fam, nums in sorted(por_fam.items()):
        if 0 in nums:
            out.append(Alerta("erro", "numero_zero", f"{fam}-00 não existe no sistema (numeração começa em 01).", f"{fam}-00"))
        positivos = sorted(n for n in nums if n > 0)
        if positivos and positivos[0] != 1:
            out.append(Alerta("aviso", "numeracao_nao_comeca_em_01", f"Família {fam} começa em {positivos[0]:02d}.", None))
        faltando = [n for n in range(1, (positivos[-1] if positivos else 0) + 1) if n not in nums]
        if faltando:
            lista = ", ".join(f"{fam}-{n:02d}" for n in faltando)
            out.append(Alerta("aviso", "numeracao_com_buraco", f"Família {fam} tem buracos: {lista}.", None))
    return out


def r_area_divergente(estandes: list[Estande], m: Manifesto, ctx: Contexto) -> list[Alerta]:
    """m² escrito na planta diferente do padrão da família (quando há padrão)."""
    out = []
    for e in estandes:
        fam = m.familias.get(e.familia)
        if not fam or fam.area_padrao is None or fam.area_planta_ignorar:
            continue
        if e.codigo in m.estandes and m.estandes[e.codigo].get("area") is not None:
            continue
        if e.area_planta is None:
            out.append(Alerta("aviso", "sem_area", f"{e.codigo}: sem m² na planta (padrão da família: {fam.area_padrao:g} m²).", e.codigo))
        elif abs(e.area_planta - fam.area_padrao) > 0.01:
            out.append(Alerta("aviso", "area_divergente",
                              f"{e.codigo}: {e.area_planta:g} m² na planta, padrão da família é {fam.area_padrao:g} m².", e.codigo))
    return out


def r_area_livre_sem_area(estandes: list[Estande], m: Manifesto, ctx: Contexto) -> list[Alerta]:
    """Família por m² (area_livre) precisa de área em cada estande."""
    out = []
    for e in estandes:
        fam = m.familias.get(e.familia)
        if fam and fam.tipo == "area_livre" and e.area is None:
            out.append(Alerta("erro", "area_livre_sem_area", f"{e.codigo}: família {e.familia} é por m² e o estande não tem área.", e.codigo))
    return out


def r_medidas_duplas(estandes: list[Estande], m: Manifesto, ctx: Contexto) -> list[Alerta]:
    """Mais de uma medida AxB no mesmo estande (ex.: '8 x 5m' e '7 x 5m')."""
    out = []
    for e in estandes:
        if len(set(e.medidas)) > 1:
            if e.codigo in m.estandes:  # decisão já registrada no manifesto
                continue
            out.append(Alerta("aviso", "medidas_duplas", f"{e.codigo}: duas medidas na planta ({', '.join(e.medidas)}).", e.codigo))
    return out


def r_contagem_vs_planilha(estandes: list[Estande], m: Manifesto, ctx: Contexto) -> list[Alerta]:
    """Contagem por família diferente da planilha existente (quando informada no contexto)."""
    esperado: dict[str, int] = ctx.get("contagem_planilha") or {}
    if not esperado:
        return []
    atual = Counter(e.familia for e in estandes)
    out = []
    for fam in sorted(set(esperado) | set(atual)):
        if esperado.get(fam, 0) != atual.get(fam, 0):
            out.append(Alerta("aviso", "contagem_vs_planilha",
                              f"Família {fam}: {atual.get(fam, 0)} na planta, {esperado.get(fam, 0)} na planilha.", None))
    return out


REGRAS: list[Regra] = [
    r_codigo_fora_do_padrao,
    r_codigo_duplicado,
    r_familia_desconhecida,
    r_numeracao,
    r_area_divergente,
    r_area_livre_sem_area,
    r_medidas_duplas,
    r_contagem_vs_planilha,
]


def validar(estandes: list[Estande], manifesto: Manifesto, contexto: Contexto | None = None) -> list[Alerta]:
    ctx = contexto or {}
    alertas: list[Alerta] = []
    for regra in REGRAS:
        alertas.extend(regra(estandes, manifesto, ctx))
    ordem = {"erro": 0, "aviso": 1, "info": 2}
    return sorted(alertas, key=lambda a: (ordem[a.nivel], a.regra, a.codigo or ""))


def tem_erro(alertas: list[Alerta]) -> bool:
    return any(a.nivel == "erro" for a in alertas)
