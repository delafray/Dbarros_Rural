"""Relatórios em Markdown para o usuário. Puro."""

from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any

from .modelos import Alerta, Estande, Manifesto


def relatorio_md(estandes: list[Estande], alertas: list[Alerta], ignorados: list[str], m: Manifesto) -> str:
    linhas = [f"# Relatório da planta — {m.titulo} ({m.versao})", ""]
    erros = [a for a in alertas if a.nivel == "erro"]
    avisos = [a for a in alertas if a.nivel == "aviso"]
    status = "❌ COM ERROS — corrigir antes de publicar" if erros else ("⚠️ com avisos" if avisos else "✅ tudo no padrão")
    linhas += [f"**Status:** {status}", "", f"Estandes comercializáveis lidos: **{len(estandes)}**", ""]

    linhas += ["## Famílias", "", "| Família | Nome | Qtde | Áreas (m²) | Faixa |", "| --- | --- | --- | --- | --- |"]
    por_fam: dict[str, list[Estande]] = defaultdict(list)
    for e in estandes:
        por_fam[e.familia].append(e)
    for fam in sorted(por_fam):
        lst = sorted(por_fam[fam], key=lambda e: e.numero or 0)
        nome = m.familias[fam].tag if fam in m.familias else "(fora do manifesto)"
        areas = Counter(f"{e.area:g}" for e in lst if e.area is not None)
        areas_txt = ", ".join(f"{a}×{n}" if n > 1 else a for a, n in sorted(areas.items(), key=lambda x: float(x[0]))) or "—"
        faixa = f"{lst[0].codigo} → {lst[-1].codigo}" if lst else "—"
        linhas.append(f"| {fam} | {nome} | {len(lst)} | {areas_txt} | {faixa} |")
    linhas.append("")

    if ignorados:
        c = Counter(x[0] for x in ignorados)
        linhas += ["Ignorados (pavilhões/não comercializados): " + ", ".join(f"{k} ({n})" for k, n in sorted(c.items())), ""]

    for titulo, lista in (("## Erros", erros), ("## Avisos", avisos)):
        linhas += [titulo, ""]
        if not lista:
            linhas += ["Nenhum.", ""]
            continue
        for a in lista:
            linhas.append(f"- `{a.regra}` {a.mensagem}")
        linhas.append("")
    return "\n".join(linhas)


def diff_md(diff: dict[str, Any], versao_anterior: str, versao_atual: str) -> str:
    linhas = [f"# Diferenças: {versao_anterior} → {versao_atual}", ""]
    if diff.get("sem_mudanca"):
        return "\n".join(linhas + ["Nenhuma mudança nos estandes.", ""])
    secoes = [
        ("Novos", [f"`{c}`" for c in diff["novos"]]),
        ("Removidos", [f"`{c}`" for c in diff["removidos"]]),
        ("Renomeados (mesmo lugar)", [f"`{a}` → `{b}`" for a, b in diff["renomeados"]]),
        ("Área alterada", [f"`{c}`: {a} → {b} m²" for c, a, b in diff["area_alterada"]]),
        ("Movidos (mesmo código, outro lugar)", [f"`{c}`" for c in diff["movidos"]]),
    ]
    for titulo, itens in secoes:
        if itens:
            linhas += [f"## {titulo} ({len(itens)})", ""] + [f"- {i}" for i in itens] + [""]
    return "\n".join(linhas)
