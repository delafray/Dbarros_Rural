from pathlib import Path

from motor_planta.associar import associar
from motor_planta.extrair import extrair_pagina
from motor_planta.validar import r_codigo_duplicado, r_numeracao, tem_erro, validar

from conftest import AZUL, VERMELHO, criar_pdf, manifesto_basico


def _rodar(pdf: Path, m=None):
    m = m or manifesto_basico()
    pagina = extrair_pagina(str(pdf))
    estandes, alertas_assoc, ignorados = associar(pagina, m)
    return estandes, alertas_assoc + validar(estandes, m), ignorados


class TestAssociar:
    def test_le_codigo_retangulo_area_e_medida(self, pdf_basico):
        estandes, alertas, ignorados = _rodar(pdf_basico)
        por = {e.codigo: e for e in estandes}
        assert set(por) == {"P-01", "P-02", "L-01"}
        assert por["P-01"].stand_nr == "P 01"
        assert por["P-01"].area_planta == 25 and por["P-01"].medidas == ["5x5"]
        assert por["L-01"].area == 150 and por["L-01"].ret is not None
        assert por["L-01"].ret.cor is not None

    def test_familia_ignorada_nao_vira_estande(self, pdf_basico):
        estandes, _, ignorados = _rodar(pdf_basico)
        assert ignorados == ["B-01"]
        assert not any(e.familia == "B" for e in estandes)

    def test_planta_no_padrao_nao_gera_erro(self, pdf_basico):
        _, alertas, _ = _rodar(pdf_basico)
        assert not tem_erro(alertas), [a.mensagem for a in alertas]

    def test_renomear_do_manifesto_muda_o_codigo(self, tmp_path):
        pdf = criar_pdf(tmp_path / "r.pdf", [{"codigo": "L-00", "x": 20, "y": 20, "area": "2100m²"}])
        m = manifesto_basico(renomear={"L-00": "L-20"})
        estandes, alertas, _ = _rodar(pdf, m)
        assert estandes[0].codigo == "L-20" and estandes[0].stand_nr == "L 20"
        assert not any(a.regra == "numero_zero" for a in alertas)

    def test_sobrescrita_de_area_e_obs_do_manifesto(self, tmp_path):
        pdf = criar_pdf(tmp_path / "s.pdf", [{"codigo": "L-16", "x": 20, "y": 20, "medida": "8 x 5m"}])
        m = manifesto_basico(estandes={"L-16": {"area": 40, "obs": "bônus 7x5 sem custo"}})
        estandes, alertas, _ = _rodar(pdf, m)
        assert estandes[0].area == 40 and estandes[0].obs == "bônus 7x5 sem custo"
        assert not any(a.regra == "area_livre_sem_area" for a in alertas)

    def test_maquinario_usa_area_comercial_e_nao_a_da_planta(self, tmp_path):
        pdf = criar_pdf(tmp_path / "m.pdf", [{"codigo": "M-01", "x": 20, "y": 20, "area": "25m²", "medida": "5x5"}])
        estandes, alertas, _ = _rodar(pdf)
        assert estandes[0].area_planta == 25 and estandes[0].area == 105
        assert not any(a.regra == "area_divergente" for a in alertas)

    def test_codigo_sem_retangulo_e_erro(self, tmp_path):
        pdf = criar_pdf(tmp_path / "sr.pdf", [{"codigo": "P-01", "x": 20, "y": 20, "sem_retangulo": True}])
        _, alertas, _ = _rodar(pdf)
        assert any(a.regra == "sem_retangulo" and a.nivel == "erro" for a in alertas)

    def test_retangulo_da_familia_sem_codigo_e_aviso(self, tmp_path):
        est = [{"codigo": f"P-0{i}", "x": 20 + i * 50, "y": 20, "area": "25m²"} for i in range(1, 4)]
        pdf = criar_pdf(tmp_path / "rs.pdf", est)
        doc_extra = __import__("fitz").open(str(pdf))
        doc_extra[0].draw_rect(__import__("fitz").Rect(300, 200, 340, 240), fill=AZUL, color=(0, 0, 0))
        doc_extra.save(str(tmp_path / "rs2.pdf"))
        _, alertas, _ = _rodar(tmp_path / "rs2.pdf")
        assert any(a.regra == "retangulo_sem_codigo" for a in alertas)


class TestValidar:
    def test_duplicado_e_erro(self, tmp_path):
        pdf = criar_pdf(tmp_path / "d.pdf", [
            {"codigo": "P-01", "x": 20, "y": 20, "area": "25m²"},
            {"codigo": "P-01", "x": 120, "y": 20, "area": "25m²"},
        ])
        _, alertas, _ = _rodar(pdf)
        assert any(a.regra == "codigo_duplicado" and a.nivel == "erro" for a in alertas)

    def test_sem_hifen_e_aviso_mas_le_certo(self, tmp_path):
        pdf = criar_pdf(tmp_path / "h.pdf", [{"codigo": "P02", "x": 20, "y": 20, "area": "25m²"}])
        estandes, alertas, _ = _rodar(pdf)
        assert estandes[0].codigo == "P-02"
        assert any(a.regra == "codigo_fora_do_padrao" for a in alertas)

    def test_buraco_na_numeracao_e_aviso(self, tmp_path):
        pdf = criar_pdf(tmp_path / "b.pdf", [
            {"codigo": "P-01", "x": 20, "y": 20, "area": "25m²"},
            {"codigo": "P-03", "x": 120, "y": 20, "area": "25m²"},
        ])
        _, alertas, _ = _rodar(pdf)
        a = next(x for x in alertas if x.regra == "numeracao_com_buraco")
        assert "P-02" in a.mensagem

    def test_area_divergente_do_padrao_da_familia(self, tmp_path):
        pdf = criar_pdf(tmp_path / "a.pdf", [{"codigo": "P-01", "x": 20, "y": 20, "area": "5m²"}])
        _, alertas, _ = _rodar(pdf)
        assert any(a.regra == "area_divergente" and "5 m²" in a.mensagem for a in alertas)

    def test_area_livre_sem_area_e_erro(self, tmp_path):
        pdf = criar_pdf(tmp_path / "al.pdf", [{"codigo": "L-01", "x": 20, "y": 20, "cor": VERMELHO}])
        _, alertas, _ = _rodar(pdf)
        assert any(a.regra == "area_livre_sem_area" and a.nivel == "erro" for a in alertas)

    def test_medidas_duplas_e_aviso_salvo_se_manifesto_decidiu(self, tmp_path):
        pdf = criar_pdf(tmp_path / "md.pdf", [{"codigo": "L-16", "x": 20, "y": 20, "area": "40m²", "medida": "8 x 5m 7 x 5m"}])
        _, alertas, _ = _rodar(pdf)
        assert any(a.regra == "medidas_duplas" for a in alertas)
        _, alertas2, _ = _rodar(pdf, manifesto_basico(estandes={"L-16": {"area": 40}}))
        assert not any(a.regra == "medidas_duplas" for a in alertas2)

    def test_familia_fora_do_manifesto_e_erro(self, tmp_path):
        pdf = criar_pdf(tmp_path / "f.pdf", [{"codigo": "Z-01", "x": 20, "y": 20, "area": "25m²"}])
        _, alertas, _ = _rodar(pdf)
        assert any(a.regra == "familia_desconhecida" and a.nivel == "erro" for a in alertas)

    def test_contagem_vs_planilha(self, pdf_basico):
        m = manifesto_basico()
        pagina = extrair_pagina(str(pdf_basico))
        estandes, _, _ = associar(pagina, m)
        alertas = validar(estandes, m, {"contagem_planilha": {"P": 3, "L": 1}})
        assert [a for a in alertas if a.regra == "contagem_vs_planilha"][0].mensagem.startswith("Família P: 2 na planta, 3")

    def test_regras_puras_aceitam_lista_vazia(self):
        assert r_codigo_duplicado([], manifesto_basico(), {}) == []
        assert r_numeracao([], manifesto_basico(), {}) == []


class TestTracadoCurvo:
    def test_estande_com_lado_curvo_vira_poligono_com_mais_de_4_pontos(self, tmp_path):
        import fitz
        doc = fitz.open(); page = doc.new_page(width=300, height=300)
        sh = page.new_shape()
        sh.draw_line(fitz.Point(50, 50), fitz.Point(150, 50))
        sh.draw_line(fitz.Point(150, 50), fitz.Point(150, 150))
        sh.draw_bezier(fitz.Point(150, 150), fitz.Point(120, 190), fitz.Point(80, 190), fitz.Point(50, 150))
        sh.draw_line(fitz.Point(50, 150), fitz.Point(50, 50))
        sh.finish(color=(0, 0, 0), fill=(0.2, 0.4, 0.8), closePath=True); sh.commit()
        page.insert_text(fitz.Point(70, 90), "L-01", fontsize=8, fontname="helv")
        page.insert_text(fitz.Point(70, 105), "150m²", fontsize=6, fontname="helv")
        pdf = tmp_path / "curvo.pdf"; doc.save(str(pdf)); doc.close()
        estandes, alertas, _ = _rodar(pdf)
        e = estandes[0]
        assert e.codigo == "L-01" and e.ret is not None and e.ret.e_curvo
        pts = e.ret.pontos()
        assert len(pts) > 4
        # o lado curvo desce abaixo de y=150 (barriga da curva), o resto é o retângulo
        assert max(y for _, y in pts) > 160 and min(x for x, _ in pts) >= 49

    def test_retangulo_puro_continua_com_4_pontos(self, pdf_basico):
        estandes, _, _ = _rodar(pdf_basico)
        assert all(len(e.ret.pontos()) == 4 and not e.ret.e_curvo for e in estandes if e.ret)
