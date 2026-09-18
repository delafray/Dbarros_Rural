"""Linha de comando do motor.

    python -m motor_planta manifestos/megaleite-2027.json [--anterior saida/x/mapa.json] [--saida DIR] [--sem-fundo]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .associar import associar
from .comparar import comparar
from .extrair import extrair_pagina, renderizar_fundo
from .gerar_mapa import montar_mapa
from .gerar_planilha import gerar_sql, montar_planilha
from .modelos import Manifesto
from .relatorio import diff_md, relatorio_md
from .validar import tem_erro, validar


def executar(caminho_manifesto: str, saida: str | None = None, anterior: str | None = None,
             com_fundo: bool = True, contagem_planilha: dict[str, int] | None = None) -> dict:
    raw = json.loads(Path(caminho_manifesto).read_text(encoding="utf-8"))
    m = Manifesto.de_dict(raw)
    destino = Path(saida) if saida else Path(__file__).resolve().parent.parent / "saida" / m.slug
    destino.mkdir(parents=True, exist_ok=True)

    pagina = extrair_pagina(m.arquivo_planta)
    estandes, alertas_assoc, ignorados = associar(pagina, m)
    alertas = alertas_assoc + validar(estandes, m, {"contagem_planilha": contagem_planilha or {}})
    ordem = {"erro": 0, "aviso": 1, "info": 2}
    alertas.sort(key=lambda a: (ordem[a.nivel], a.regra, a.codigo or ""))

    mapa = montar_mapa(pagina, estandes, m)
    planilha = montar_planilha(estandes, m)

    (destino / "relatorio.md").write_text(relatorio_md(estandes, alertas, ignorados, m), encoding="utf-8")
    (destino / "mapa.json").write_text(json.dumps(mapa, ensure_ascii=False, indent=1), encoding="utf-8")
    (destino / "planilha.json").write_text(json.dumps(planilha, ensure_ascii=False, indent=1), encoding="utf-8")
    (destino / "alertas.json").write_text(json.dumps([a.para_dict() for a in alertas], ensure_ascii=False, indent=1), encoding="utf-8")
    (destino / "publicar.sql").write_text(gerar_sql(planilha, mapa, m), encoding="utf-8")

    if anterior:
        ant = json.loads(Path(anterior).read_text(encoding="utf-8"))
        d = comparar(ant.get("estandes", []), mapa["estandes"])
        (destino / "diff.md").write_text(diff_md(d, ant.get("versao", "?"), m.versao), encoding="utf-8")

    if com_fundo:
        renderizar_fundo(m.arquivo_planta, str(destino / "fundo.png"), [e.ret for e in estandes if e.ret])

    return {
        "saida": str(destino),
        "estandes": len(estandes),
        "erros": sum(1 for a in alertas if a.nivel == "erro"),
        "avisos": sum(1 for a in alertas if a.nivel == "aviso"),
        "com_erro": tem_erro(alertas),
    }


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Motor de planta → mapa de vendas")
    ap.add_argument("manifesto")
    ap.add_argument("--saida")
    ap.add_argument("--anterior", help="mapa.json da versão anterior, para gerar diff.md")
    ap.add_argument("--sem-fundo", action="store_true", help="não renderiza fundo.png")
    args = ap.parse_args(argv)
    r = executar(args.manifesto, args.saida, args.anterior, com_fundo=not args.sem_fundo)
    print(f"Saída: {r['saida']}")
    print(f"Estandes: {r['estandes']} · erros: {r['erros']} · avisos: {r['avisos']}")
    return 1 if r["com_erro"] else 0


if __name__ == "__main__":
    sys.exit(main())
