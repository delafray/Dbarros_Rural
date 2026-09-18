import pytest

from motor_planta.normalizar import (
    codigo_canonico, codigo_para_stand_nr, parse_area, parse_codigo, parse_medidas, stand_nr, stand_nr_para_codigo,
)


class TestParseCodigo:
    def test_padrao_estrito_letra_hifen_dois_digitos(self):
        assert parse_codigo("P-01") == ("P", 1, True)

    def test_sem_hifen_e_leniente(self):
        assert parse_codigo("D02") == ("D", 2, False)

    def test_um_digito_e_leniente(self):
        assert parse_codigo("B-1") == ("B", 1, False)

    def test_zero_e_aceito_para_a_validacao_apontar(self):
        assert parse_codigo("L-00") == ("L", 0, True)

    @pytest.mark.parametrize("txt", ["25m²", "5x5", "TL", "PORTARIA", "p-01", "P-", "P-1234", ""])
    def test_nao_codigo_devolve_none(self, txt):
        assert parse_codigo(txt) is None


class TestIdaEVolta:
    def test_planta_para_planilha_usa_espaco_e_dois_digitos(self):
        assert codigo_para_stand_nr("P-01") == "P 01"
        assert codigo_para_stand_nr("P01") == "P 01"
        assert codigo_para_stand_nr("p 1") == "P 01"

    def test_planilha_para_planta_usa_hifen(self):
        assert stand_nr_para_codigo("P 01") == "P-01"
        assert stand_nr_para_codigo("L 20") == "L-20"

    def test_ida_e_volta_e_identidade(self):
        for c in ["C-01", "L-19", "R-19", "P-33"]:
            assert stand_nr_para_codigo(codigo_para_stand_nr(c)) == c

    def test_canonico_e_stand_nr(self):
        assert codigo_canonico("P", 7) == "P-07"
        assert stand_nr("P", 7) == "P 07"

    def test_invalido_levanta_erro(self):
        with pytest.raises(ValueError):
            codigo_para_stand_nr("XYZ")


class TestParseArea:
    @pytest.mark.parametrize("txt,esperado", [("25m²", 25.0), ("2100m²", 2100.0), ("16m2", 16.0), ("25m�", 25.0), ("12,5m²", 12.5)])
    def test_le_metros_quadrados(self, txt, esperado):
        assert parse_area(txt) == esperado

    @pytest.mark.parametrize("txt", ["5x5", "P-01", "25", "m²", "8 x 5m"])
    def test_nao_area_devolve_none(self, txt):
        assert parse_area(txt) is None


class TestParseMedidas:
    def test_uma_medida(self):
        assert parse_medidas("5x5") == ["5x5"]

    def test_duas_medidas_com_espacos_e_m(self):
        assert parse_medidas("8 x 5m 7 x 5m") == ["8x5", "7x5"]

    def test_decimal_com_virgula(self):
        assert parse_medidas("15,0x7,0m") == ["15x7"]

    def test_sem_medida(self):
        assert parse_medidas("25m²") == []
