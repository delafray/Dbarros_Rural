"""Fixtures: gera PDFs sintéticos com PyMuPDF para testar o motor sem depender da planta real."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import fitz
import pytest

from motor_planta.modelos import Manifesto

AZUL = (0.2, 0.4, 0.8)
VERMELHO = (0.9, 0.1, 0.1)
VERDE = (0.1, 0.6, 0.3)


def criar_pdf(caminho: Path, estandes: list[dict[str, Any]], largura: float = 600, altura: float = 400) -> Path:
    """Cada estande: {codigo, x, y, w?, h?, cor?, area?, medida?, sem_retangulo?}.
    O código é escrito no topo do retângulo; área e medida nas linhas abaixo."""
    doc = fitz.open()
    page = doc.new_page(width=largura, height=altura)
    for e in estandes:
        x, y = e["x"], e["y"]
        w, h = e.get("w", 40), e.get("h", 40)
        if not e.get("sem_retangulo"):
            page.draw_rect(fitz.Rect(x, y, x + w, y + h), color=(0, 0, 0), fill=e.get("cor", AZUL), width=0.5)
        page.insert_text(fitz.Point(x + 4, y + 12), e["codigo"], fontsize=8, fontname="helv")
        linha = y + 22
        for txt in (e.get("area"), e.get("medida")):
            if txt:
                page.insert_text(fitz.Point(x + 4, linha), txt, fontsize=6, fontname="helv")
                linha += 8
    doc.save(str(caminho))
    doc.close()
    return caminho


def manifesto_basico(**extra: Any) -> Manifesto:
    d: dict[str, Any] = {
        "edicao": {"slug": "teste-2027", "titulo": "Teste 2027", "ano": 2027},
        "planta": {"arquivo": "", "versao": "ALT 01"},
        "ignorar_familias": ["B"],
        "combos": {"nomes": ["COMBO 01", "COMBO 02"], "precos": [1000, 2000]},
        "familias": {
            "P": {"tag": "PRÉ-MONTADOS", "tipo": "fixo", "preco": 23500, "area_padrao": 25},
            "L": {"tag": "ÁREA LIVRE", "tipo": "area_livre", "preco_m2": 425},
            "M": {"tag": "MAQUINÁRIOS", "tipo": "fixo", "preco": 20002.5, "area_padrao": 105, "area_planta_ignorar": True},
        },
        "estandes": {},
        "renomear": {},
    }
    d.update(extra)
    return Manifesto.de_dict(d)


@pytest.fixture
def pdf_basico(tmp_path: Path) -> Path:
    return criar_pdf(tmp_path / "basico.pdf", [
        {"codigo": "P-01", "x": 20, "y": 20, "area": "25m²", "medida": "5x5"},
        {"codigo": "P-02", "x": 70, "y": 20, "area": "25m²", "medida": "5x5"},
        {"codigo": "L-01", "x": 20, "y": 100, "w": 80, "h": 60, "cor": VERMELHO, "area": "150m²", "medida": "10x15"},
        {"codigo": "B-01", "x": 200, "y": 20, "w": 120, "h": 60, "cor": VERDE},
    ])
