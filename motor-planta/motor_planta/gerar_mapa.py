"""Monta o mapa.json (geometria que o React desenha). Puro."""

from __future__ import annotations

from typing import Any

from .modelos import Estande, Manifesto, PaginaExtraida


def montar_mapa(pagina: PaginaExtraida, estandes: list[Estande], manifesto: Manifesto) -> dict[str, Any]:
    ordenados = sorted(estandes, key=lambda e: (e.familia, e.numero or 0))
    return {
        "edicao": manifesto.slug,
        "versao": manifesto.versao,
        "view_box": f"0 0 {pagina.largura:.2f} {pagina.altura:.2f}",
        "largura": round(pagina.largura, 2),
        "altura": round(pagina.altura, 2),
        "familias": {
            letra: {"tag": f.tag, "tipo": f.tipo}
            for letra, f in manifesto.familias.items()
            if any(e.familia == letra for e in estandes)
        },
        "estandes": [e.para_dict() for e in ordenados],
    }
