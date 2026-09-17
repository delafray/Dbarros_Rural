from motor_planta.comparar import comparar
from motor_planta.gerar_planilha import gerar_sql, montar_categorias, montar_planilha
from motor_planta.modelos import Estande, Retangulo
from motor_planta.relatorio import diff_md

from conftest import manifesto_basico


def _e(codigo, x, y, area=None):
    fam, num = codigo.split("-")
    return {"codigo": codigo, "centro": [x, y], "area": area, "familia": fam, "numero": int(num)}


class TestComparar:
    def test_sem_mudanca(self):
        a = [_e("P-01", 10, 10, 25)]
        assert comparar(a, a)["sem_mudanca"] is True

    def test_novo_e_removido(self):
        d = comparar([_e("P-01", 10, 10)], [_e("P-02", 300, 300)])
        assert d["novos"] == ["P-02"] and d["removidos"] == ["P-01"]

    def test_renomeado_no_mesmo_lugar_nao_e_novo_nem_removido(self):
        d = comparar([_e("P-34", 100, 100, 100)], [_e("L-19", 102, 101, 100)])
        assert d["renomeados"] == [("P-34", "L-19")]
        assert d["novos"] == [] and d["removidos"] == []

    def test_area_alterada_e_movido(self):
        d = comparar([_e("L-08", 10, 10, 5)], [_e("L-08", 10, 10, 25)])
        assert d["area_alterada"] == [("L-08", 5.0, 25.0)]
        d2 = comparar([_e("L-08", 10, 10, 25)], [_e("L-08", 90, 10, 25)])
        assert d2["movidos"] == ["L-08"]

    def test_diff_md_lista_secoes(self):
        d = comparar([_e("P-34", 100, 100, 100)], [_e("L-19", 100, 100, 100), _e("P-35", 500, 500)])
        md = diff_md(d, "ALT 01", "ALT 02")
        assert "`P-34` → `L-19`" in md and "`P-35`" in md


def _estande(codigo, area=None):
    fam, num = codigo.split("-")
    return Estande(codigo=codigo, codigo_original=codigo, familia=fam, numero=int(num),
                   stand_nr=f"{fam} {int(num):02d}", estrito=True, ret=Retangulo(0, 0, 10, 10, "#000000"),
                   cx=5, cy=5, area=area)


class TestGerarPlanilha:
    def test_categoria_fixa_soma_combo_ao_stand(self):
        cats = montar_categorias([_estande("P-01"), _estande("P-02")], manifesto_basico())
        p = next(c for c in cats if c["prefix"] == "P")
        assert p["count"] == 2 and p["tipo_precificacao"] == "fixo"
        assert p["standBase"] == 23500 and p["combos"] == [24500, 25500]
        assert p["comboNames"] == ["COMBO 01", "COMBO 02"]

    def test_categoria_area_livre_usa_preco_m2_e_adicionais(self):
        cats = montar_categorias([_estande("L-01", 150)], manifesto_basico())
        l = cats[0]
        assert l["tipo_precificacao"] == "area_livre" and l["preco_m2"] == 425
        assert l["combos_adicionais"] == [1000, 2000] and l["standBase"] == 0

    def test_familia_sem_estande_na_planta_nao_vira_categoria(self):
        cats = montar_categorias([_estande("P-01")], manifesto_basico())
        assert [c["prefix"] for c in cats] == ["P"]

    def test_areas_so_para_area_livre(self):
        pl = montar_planilha([_estande("P-01", 25), _estande("L-01", 150)], manifesto_basico())
        assert pl["areas"] == {"L 01": 150}
        assert pl["stand_nrs"] == ["L 01", "P 01"]

    def test_sql_e_idempotente_e_escapa_aspas(self):
        m = manifesto_basico()
        m.titulo = "Teste d'Água 2027"
        pl = montar_planilha([_estande("L-01", 150)], m)
        sql = gerar_sql(pl, {"view_box": "0 0 1 1", "estandes": []}, m)
        assert "regenerate_estandes" in sql and "planilha_mapa" in sql
        assert "d''Água" in sql
        assert "NOT EXISTS" in sql  # nunca apaga estande existente
        assert "DELETE" not in sql.upper().replace("-- ", "")
