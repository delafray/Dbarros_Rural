"""Gera a configuração da planilha (CategoriaSetup[]) e o SQL de publicação. Puro.

Formato de CategoriaSetup (services/planilhaVendasService.ts):
  fixo:        standBase = preço do stand; combos[N] = stand + combo N
  area_livre:  preco_m2; combos_adicionais[N] = combo N; standBase = 0
Preços em REAIS (a planilha grava reais).
"""

from __future__ import annotations

import json
from collections import Counter
from typing import Any

from .modelos import Estande, Manifesto

CORES = ["bg-[#FCE4D6]", "bg-[#FFF2CC]", "bg-[#E2EFDA]", "bg-[#D9E1F2]", "bg-[#F2F2F2]", "bg-[#E6E6FA]"]


def montar_categorias(estandes: list[Estande], m: Manifesto) -> list[dict[str, Any]]:
    contagem = Counter(e.familia for e in estandes)
    cats: list[dict[str, Any]] = []
    i = 0
    for letra, fam in m.familias.items():
        n = contagem.get(letra, 0)
        if n == 0:
            continue
        cat: dict[str, Any] = {
            "tag": fam.tag,
            "prefix": letra,
            "cor": CORES[i % len(CORES)],
            "count": n,
            "ordem": i + 1,
            "is_stand": True,
            "comboNames": list(m.combos_nomes),
        }
        if fam.tipo == "area_livre":
            cat.update({
                "tipo_precificacao": "area_livre",
                "preco_m2": fam.preco_m2 or 0,
                "standBase": 0,
                "combos": list(m.combos_precos),
                "combos_adicionais": list(m.combos_precos),
            })
        else:
            cat.update({
                "tipo_precificacao": "fixo",
                "standBase": fam.preco,
                "combos": [fam.preco + c for c in m.combos_precos],
            })
        cats.append(cat)
        i += 1
    return cats


def montar_areas(estandes: list[Estande], m: Manifesto) -> dict[str, float]:
    """stand_nr → área (só famílias area_livre, que é onde a planilha usa area_m2)."""
    out: dict[str, float] = {}
    for e in estandes:
        fam = m.familias.get(e.familia)
        if fam and fam.tipo == "area_livre" and e.area is not None:
            out[e.stand_nr] = e.area
    return out


def montar_planilha(estandes: list[Estande], m: Manifesto) -> dict[str, Any]:
    return {
        "edicao": {"slug": m.slug, "titulo": m.titulo, "ano": m.ano},
        "categorias": montar_categorias(estandes, m),
        "stand_nrs": sorted({e.stand_nr for e in estandes}),
        "areas": montar_areas(estandes, m),
    }


def _sql_str(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def gerar_sql(planilha: dict[str, Any], mapa: dict[str, Any], m: Manifesto) -> str:
    """SQL idempotente para o Supabase SQL Editor.

    - Localiza a edição por ano + título (ILIKE). Não cria evento/edição (isso é
      cadastro; ver scripts/seed-<evento>.sql ou a tela).
    - Planilha inexistente → cria config com as categorias e gera os estandes (RPC).
    - Planilha existente → só INSERE stand_nr que faltam e preenche area_m2 nula.
      Nunca apaga estande nem sobrescreve categorias (preços podem ter sido editados na tela).
    - Mapa: desativa o mapa ativo anterior e insere o novo (planilha_mapa).
    """
    cats_json = json.dumps(planilha["categorias"], ensure_ascii=False)
    nrs = planilha["stand_nrs"]
    areas = planilha["areas"]
    estandes_json = json.dumps(mapa["estandes"], ensure_ascii=False)
    titulo_like = (m.titulo.split(" ")[0] if m.titulo else "") + "%"

    nrs_sql = "ARRAY[" + ", ".join(_sql_str(n) for n in nrs) + "]::text[]"
    areas_values = ", ".join(f"({_sql_str(k)}, {v:g})" for k, v in sorted(areas.items())) or "('__nenhum__', 0)"

    return f"""-- ═══════════════════════════════════════════════════════════════════════════
-- {m.titulo} — publicação da planta {m.versao} (gerado pelo motor-planta)
-- Rodar no Supabase → SQL Editor. Idempotente (ver regras no cabeçalho do gerador).
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_ed   uuid;
  v_cfg  uuid;
  v_nrs  text[] := {nrs_sql};
  v_cats jsonb  := {_sql_str(cats_json)}::jsonb;
  v_mapa jsonb  := {_sql_str(estandes_json)}::jsonb;
  v_ins  int := 0;
BEGIN
  SELECT id INTO v_ed FROM public.eventos_edicoes
   WHERE ano = {m.ano} AND titulo ILIKE {_sql_str(titulo_like)}
   ORDER BY created_at LIMIT 1;
  IF v_ed IS NULL THEN
    RAISE EXCEPTION {_sql_str(f'Edição "{m.titulo}" ({m.ano}) não encontrada — cadastre o evento/edição antes.')};
  END IF;

  SELECT id INTO v_cfg FROM public.planilha_configuracoes WHERE edicao_id = v_ed LIMIT 1;
  IF v_cfg IS NULL THEN
    INSERT INTO public.planilha_configuracoes (edicao_id, categorias_config, opcionais_ativos, opcionais_nomes, opcionais_precos)
    VALUES (v_ed, v_cats, '{{}}', '{{}}'::jsonb, '{{}}'::jsonb)
    RETURNING id INTO v_cfg;
    PERFORM * FROM public.regenerate_estandes(v_cfg, v_nrs);
    RAISE NOTICE 'Planilha criada (%) com % estandes. Itens opcionais: configurar na tela.', v_cfg, array_length(v_nrs, 1);
  ELSE
    INSERT INTO public.planilha_vendas_estandes (config_id, stand_nr, tipo_venda, opcionais_selecionados, desconto, valor_pago)
    SELECT v_cfg, nr, 'DISPONÍVEL', '{{}}'::jsonb, 0, 0
      FROM unnest(v_nrs) AS nr
     WHERE NOT EXISTS (SELECT 1 FROM public.planilha_vendas_estandes e WHERE e.config_id = v_cfg AND e.stand_nr = nr);
    GET DIAGNOSTICS v_ins = ROW_COUNT;
    RAISE NOTICE 'Planilha já existia (%): % estande(s) novo(s) inserido(s); categorias NÃO alteradas.', v_cfg, v_ins;
  END IF;

  UPDATE public.planilha_vendas_estandes e
     SET area_m2 = a.m2
    FROM (VALUES {areas_values}) AS a(nr, m2)
   WHERE e.config_id = v_cfg AND e.stand_nr = a.nr AND e.area_m2 IS NULL;

  UPDATE public.planilha_mapa SET ativo = false WHERE edicao_id = v_ed AND ativo;
  INSERT INTO public.planilha_mapa (edicao_id, versao, ativo, view_box, fundo_path, estandes)
  VALUES (v_ed, {_sql_str(m.versao)}, true, {_sql_str(mapa["view_box"])}, v_ed::text || '/mapa-fundo.png', v_mapa);
  RAISE NOTICE 'Mapa {m.versao} publicado para a edição %.', v_ed;
END $$;

-- Conferência
SELECT split_part(e.stand_nr, ' ', 1) AS familia, count(*) AS estandes, count(e.area_m2) AS com_area
  FROM public.planilha_vendas_estandes e
  JOIN public.planilha_configuracoes pc ON pc.id = e.config_id
  JOIN public.eventos_edicoes ed ON ed.id = pc.edicao_id
 WHERE ed.ano = {m.ano} AND ed.titulo ILIKE {_sql_str(titulo_like)}
 GROUP BY 1 ORDER BY 1;
"""
