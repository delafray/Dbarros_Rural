"""Normalização de códigos, áreas e medidas. Funções puras.

Regra única de ida e volta entre a planta e a planilha:
    planta   "P-01"  ⇄  planilha "P 01"   (buildStandNr do sistema: PREFIXO + espaço + 2 dígitos)
"""

from __future__ import annotations

import re

RE_CODIGO_ESTRITO = re.compile(r"^([A-Z])-(\d{2})$")
RE_CODIGO_LENIENTE = re.compile(r"^([A-Z])-?(\d{1,3})$")
RE_AREA = re.compile(r"^(\d+(?:[.,]\d+)?)\s*m(?:²|2|�)?$", re.IGNORECASE)
RE_MEDIDA = re.compile(r"(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*m?", re.IGNORECASE)


def parse_codigo(texto: str) -> tuple[str, int, bool] | None:
    """Devolve (familia, numero, estrito) ou None se o texto não é código.

    estrito=True quando já está no padrão LETRA-NN.
    """
    t = texto.strip()
    m = RE_CODIGO_ESTRITO.match(t)
    if m:
        return m.group(1), int(m.group(2)), True
    m = RE_CODIGO_LENIENTE.match(t)
    if m:
        return m.group(1), int(m.group(2)), False
    return None


def codigo_canonico(familia: str, numero: int) -> str:
    return f"{familia}-{numero:02d}"


def stand_nr(familia: str, numero: int) -> str:
    """Formato gravado em planilha_vendas_estandes.stand_nr."""
    return f"{familia} {numero:02d}"


def stand_nr_para_codigo(nr: str) -> str:
    """'P 01' → 'P-01'. Aceita também 'P-01' e 'P01'."""
    t = nr.strip().upper().replace(" ", "-")
    p = parse_codigo(t)
    if not p:
        raise ValueError(f"stand_nr inválido: {nr!r}")
    return codigo_canonico(p[0], p[1])


def codigo_para_stand_nr(codigo: str) -> str:
    """'P-01' → 'P 01'. Aceita 'P 01' e 'P01'."""
    t = codigo.strip().upper().replace(" ", "-")
    p = parse_codigo(t)
    if not p:
        raise ValueError(f"código inválido: {codigo!r}")
    return stand_nr(p[0], p[1])


def parse_area(texto: str) -> float | None:
    """'25m²' → 25.0 ; '2100m²' → 2100.0 ; '5x5' → None."""
    m = RE_AREA.match(texto.strip())
    if not m:
        return None
    return float(m.group(1).replace(",", "."))


def parse_medidas(texto: str) -> list[str]:
    """Extrai todas as medidas 'AxB' de um texto (já com as palavras juntas).

    '8 x 5m 7 x 5m' → ['8x5', '7x5'] ; '15,0x7,0m' → ['15x7'] ; '5x5' → ['5x5']
    """
    out: list[str] = []
    for a, b in RE_MEDIDA.findall(texto):
        out.append(f"{_num(a)}x{_num(b)}")
    return out


def _num(s: str) -> str:
    v = float(s.replace(",", "."))
    return str(int(v)) if v.is_integer() else str(v)
