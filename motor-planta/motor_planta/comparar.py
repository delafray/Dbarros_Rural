"""Diff entre duas versões do mapa (mapa.json anterior × estandes atuais). Puro."""

from __future__ import annotations

import math
from typing import Any

TOL_POSICAO_PT = 8.0


def comparar(anterior: list[dict[str, Any]], atual: list[dict[str, Any]]) -> dict[str, Any]:
    """Recebe listas de dicts no formato de Estande.para_dict().

    Devolve: novos, removidos, renomeados [(de, para)], area_alterada [(codigo, de, para)],
    movidos [codigo]. 'renomeados' são pares removido/novo no mesmo lugar.
    """
    ant = {e["codigo"]: e for e in anterior}
    atu = {e["codigo"]: e for e in atual}

    removidos = sorted(set(ant) - set(atu))
    novos = sorted(set(atu) - set(ant))

    renomeados: list[tuple[str, str]] = []
    usados_novos: set[str] = set()
    for r in removidos:
        for n in novos:
            if n in usados_novos:
                continue
            if _mesmo_lugar(ant[r], atu[n]):
                renomeados.append((r, n))
                usados_novos.add(n)
                break
    renomeados_de = {d for d, _ in renomeados}
    removidos = [r for r in removidos if r not in renomeados_de]
    novos = [n for n in novos if n not in usados_novos]

    area_alterada: list[tuple[str, float | None, float | None]] = []
    movidos: list[str] = []
    for c in sorted(set(ant) & set(atu)):
        a, b = ant[c], atu[c]
        if _area(a) != _area(b):
            area_alterada.append((c, _area(a), _area(b)))
        if not _mesmo_lugar(a, b):
            movidos.append(c)

    return {
        "novos": novos,
        "removidos": removidos,
        "renomeados": renomeados,
        "area_alterada": area_alterada,
        "movidos": movidos,
        "sem_mudanca": not (novos or removidos or renomeados or area_alterada or movidos),
    }


def _area(e: dict[str, Any]) -> float | None:
    v = e.get("area")
    return None if v is None else float(v)


def _mesmo_lugar(a: dict[str, Any], b: dict[str, Any]) -> bool:
    ca, cb = a.get("centro"), b.get("centro")
    if not ca or not cb:
        return False
    return math.hypot(ca[0] - cb[0], ca[1] - cb[1]) <= TOL_POSICAO_PT
