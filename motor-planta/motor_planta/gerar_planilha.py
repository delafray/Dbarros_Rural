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

from .comparar import TOL_POSICAO_PT
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
    - GUARDA (18/09): antes de trocar a planta, cruza a geometria nova com a planilha no banco.
      Se algum estande OCUPADO (venda, reservado ou cortesia) sumiu da planta, mudou de área
      ou mudou de lugar (> TOL_POSICAO_PT), o script PARA (RAISE EXCEPTION, nada gravado) e
      lista os casos. O usuário decide: ajusta a planta/planilha, ou muda
      `v_confirmar_impactos := true` no topo e roda de novo. Vendas nunca são apagadas nem
      têm área sobrescrita automaticamente.
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
--
-- GUARDA DE VENDAS: se a planta nova mexer em estande ocupado (venda, reservado, cortesia),
-- o script PARA sem gravar nada e lista os casos. Leia, decida, e só então mude
-- v_confirmar_impactos para true e rode de novo. Vendas nunca são apagadas.
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_confirmar_impactos boolean := false;  -- ← true SÓ depois de ler a lista de impactos
  v_tol_pos numeric := {TOL_POSICAO_PT:g};   -- pt do PDF: acima disso o estande "mudou de lugar"
  v_ed   uuid;
  v_cfg  uuid;
  v_nrs  text[] := {nrs_sql};
  v_cats jsonb  := {_sql_str(cats_json)}::jsonb;
  v_mapa jsonb  := {_sql_str(estandes_json)}::jsonb;
  v_mapa_ant jsonb;
  v_impactos text[] := '{{}}';
  v_ren_de   text[] := '{{}}';   -- renumerações "mesmo lugar, número novo" (aplicadas só se confirmadas)
  v_ren_para text[] := '{{}}';
  v_ren_alvo text;
  v_ins  int := 0;
  i int;
  r record;
BEGIN
  SELECT id INTO v_ed FROM public.eventos_edicoes
   WHERE ano = {m.ano} AND titulo ILIKE {_sql_str(titulo_like)}
   ORDER BY created_at LIMIT 1;
  IF v_ed IS NULL THEN
    RAISE EXCEPTION {_sql_str(f'Edição "{m.titulo}" ({m.ano}) não encontrada — cadastre o evento/edição antes.')};
  END IF;

  SELECT id INTO v_cfg FROM public.planilha_configuracoes WHERE edicao_id = v_ed LIMIT 1;

  -- ── Guarda: estandes ocupados × planta nova (compara com o mapa ativo atual) ──────────
  SELECT estandes INTO v_mapa_ant FROM public.planilha_mapa WHERE edicao_id = v_ed AND ativo LIMIT 1;
  IF v_cfg IS NOT NULL THEN
    FOR r IN
      SELECT e.stand_nr, e.tipo_venda, e.area_m2, n.value AS novo, a.value AS antigo,
             COALESCE(c.nome_fantasia, c.razao_social, c.nome_completo, e.cliente_nome_livre, 'sem cliente') AS cliente
        FROM public.planilha_vendas_estandes e
        LEFT JOIN public.clientes c ON c.id = e.cliente_id
        LEFT JOIN LATERAL (SELECT value FROM jsonb_array_elements(v_mapa) WHERE value->>'stand_nr' = e.stand_nr LIMIT 1) n ON true
        LEFT JOIN LATERAL (SELECT value FROM jsonb_array_elements(COALESCE(v_mapa_ant, '[]'::jsonb)) WHERE value->>'stand_nr' = e.stand_nr LIMIT 1) a ON true
       WHERE e.config_id = v_cfg AND COALESCE(e.tipo_venda, '') NOT IN ('', 'DISPONÍVEL')
       ORDER BY e.stand_nr
    LOOP
      IF r.novo IS NULL THEN
        -- Sumiu com esse número. Há um estande NOVO no mesmo lugar? Então só trocou de número.
        v_ren_alvo := NULL;
        IF r.antigo IS NOT NULL THEN
          SELECT value->>'stand_nr' INTO v_ren_alvo
            FROM jsonb_array_elements(v_mapa)
           WHERE sqrt(power((value->'centro'->>0)::numeric - (r.antigo->'centro'->>0)::numeric, 2)
                    + power((value->'centro'->>1)::numeric - (r.antigo->'centro'->>1)::numeric, 2)) <= v_tol_pos
           ORDER BY 1 LIMIT 1;
        END IF;
        IF v_ren_alvo IS NOT NULL AND NOT EXISTS (
             SELECT 1 FROM public.planilha_vendas_estandes x
              WHERE x.config_id = v_cfg AND x.stand_nr = v_ren_alvo AND COALESCE(x.tipo_venda, '') NOT IN ('', 'DISPONÍVEL')) THEN
          v_impactos := v_impactos || format('%s [%s, %s]: só TROCOU DE NÚMERO → %s (mesmo lugar). Tudo certo? Ao confirmar, a linha da planilha é renumerada para %s',
            r.stand_nr, r.tipo_venda, r.cliente, v_ren_alvo, v_ren_alvo);
          v_ren_de := v_ren_de || r.stand_nr;
          v_ren_para := v_ren_para || v_ren_alvo;
        ELSE
          v_impactos := v_impactos || format('%s [%s, %s]: SUMIU da planta %s (linha da planilha mantida; o mapa não vai mostrá-lo)', r.stand_nr, r.tipo_venda, r.cliente, {_sql_str(m.versao)});
        END IF;
      ELSIF r.antigo IS NOT NULL THEN
        IF (r.novo->>'area')::numeric IS DISTINCT FROM (r.antigo->>'area')::numeric THEN
          v_impactos := v_impactos || format('%s [%s, %s]: ÁREA na planta %s → %s m² (planilha tem %s m²; NÃO alterada — ajuste na tela se for o caso)',
            r.stand_nr, r.tipo_venda, r.cliente, COALESCE(r.antigo->>'area', '?'), COALESCE(r.novo->>'area', '?'), COALESCE(r.area_m2::text, '—'));
        END IF;
        IF sqrt(power((r.novo->'centro'->>0)::numeric - (r.antigo->'centro'->>0)::numeric, 2)
              + power((r.novo->'centro'->>1)::numeric - (r.antigo->'centro'->>1)::numeric, 2)) > v_tol_pos THEN
          v_impactos := v_impactos || format('%s [%s, %s]: MUDOU DE LUGAR na planta (confira se ainda é o estande que o cliente comprou)', r.stand_nr, r.tipo_venda, r.cliente);
        END IF;
      END IF;
    END LOOP;
    IF array_length(v_impactos, 1) > 0 THEN
      IF NOT v_confirmar_impactos THEN
        RAISE EXCEPTION E'Planta % afeta % estande(s) OCUPADO(S). NADA foi gravado.\n\n%\n\nDecida: ajuste a planta/planilha, OU mude v_confirmar_impactos := true no topo e rode de novo.',
          {_sql_str(m.versao)}, array_length(v_impactos, 1), array_to_string(v_impactos, E'\n');
      END IF;
      RAISE NOTICE 'Impactos em estandes ocupados CONFIRMADOS pelo usuário (%): %', array_length(v_impactos, 1), array_to_string(v_impactos, ' | ');
      -- Renumerações confirmadas: a linha ocupada passa a ter o número novo. Se já existir uma linha
      -- com o número novo, ela só sai se estiver VAZIA (sem marca, sem cliente, sem opcionais, sem valor).
      FOR i IN 1 .. COALESCE(array_length(v_ren_de, 1), 0) LOOP
        DELETE FROM public.planilha_vendas_estandes x
         WHERE x.config_id = v_cfg AND x.stand_nr = v_ren_para[i]
           AND COALESCE(x.tipo_venda, '') IN ('', 'DISPONÍVEL') AND x.cliente_id IS NULL
           AND COALESCE(x.cliente_nome_livre, '') = '' AND COALESCE(x.valor_pago, 0) = 0
           AND NOT EXISTS (SELECT 1 FROM jsonb_each_text(COALESCE(x.opcionais_selecionados, '{{}}'::jsonb)) o WHERE o.value <> '');
        UPDATE public.planilha_vendas_estandes SET stand_nr = v_ren_para[i]
         WHERE config_id = v_cfg AND stand_nr = v_ren_de[i];
        RAISE NOTICE 'Renumerado: % → %', v_ren_de[i], v_ren_para[i];
      END LOOP;
    END IF;
  END IF;

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
