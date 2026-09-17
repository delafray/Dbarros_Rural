"""Regressão com a planta real do Megaleite 2027 (só roda se o PDF existir na máquina)."""

import json
from collections import Counter
from pathlib import Path

import pytest

from motor_planta.associar import associar
from motor_planta.extrair import extrair_pagina
from motor_planta.modelos import Manifesto
from motor_planta.validar import tem_erro, validar

MANIFESTO = Path(__file__).resolve().parent.parent / "manifestos" / "megaleite-2027.json"


@pytest.fixture(scope="module")
def resultado():
    m = Manifesto.de_dict(json.loads(MANIFESTO.read_text(encoding="utf-8")))
    if not Path(m.arquivo_planta).exists():
        pytest.skip("planta do Megaleite não está nesta máquina")
    pagina = extrair_pagina(m.arquivo_planta)
    estandes, alertas_assoc, ignorados = associar(pagina, m)
    return estandes, alertas_assoc + validar(estandes, m), ignorados


def test_contagem_por_familia(resultado):
    estandes, _, _ = resultado
    assert Counter(e.familia for e in estandes) == {"C": 17, "D": 4, "F": 16, "G": 22, "L": 20, "M": 8, "P": 33, "R": 19}


def test_sem_erros_bloqueantes(resultado):
    _, alertas, _ = resultado
    assert not tem_erro(alertas), [a.mensagem for a in alertas if a.nivel == "erro"]


def test_familias_ignoradas_incluem_pavilhoes_e_pr_pendente(resultado):
    _, _, ignorados = resultado
    fams = Counter(x.split("-")[0] for x in ignorados)
    assert fams["B"] == 17 and fams["E"] == 12
    assert fams["PR"] == 20  # pendente de decisão (ver manifesto "_pendente")


def test_areas_conhecidas(resultado):
    estandes, _, _ = resultado
    por = {e.codigo: e for e in estandes}
    assert por["L-20"].area == 2100 and por["L-19"].area == 100 and por["L-16"].area == 40
    assert por["M-01"].area == 105 and por["R-01"].area == 25
