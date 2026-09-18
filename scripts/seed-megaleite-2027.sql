-- ════════════════════════════════════════════════════════════════════════════
-- MEGALEITE 2027 — cadastro do evento, da edição e da planilha de vendas
-- ════════════════════════════════════════════════════════════════════════════
-- Fonte dos dados:
--   • Evento/edição: anúncio no encerramento da 21ª Megaleite (Acrissul, 06/2026):
--     22ª edição, 8 a 12 de junho de 2027, Belo Horizonte/MG. Parque: a edição
--     2026 foi no Parque da Gameleira (Av. Amazonas, 6020) — 2027 ainda sem
--     confirmação oficial do parque → gravado como "a confirmar".
--   • Promotor: Girolando – Associação Brasileira dos Criadores de Girolando,
--     Rua Orlando Vieira do Nascimento, 74 – Vila São Cristóvão, CEP 38040-280,
--     Uberaba/MG · (34) 3331-6032 · www.girolando.com.br · @associacaogirolando
--   • Famílias, preços, merchandising e combos: planta baixa ALT 01 (17/09/2026);
--     PR = Patrocinadores (20 na pista, sem custo — decisão do usuário 17/09)
--     e prints da tabela de preços na pasta H:\...\MEGALEITE\PLANTA BAIXA.
--
-- Como rodar: Supabase → SQL Editor → colar tudo → Run.
-- Idempotente: reaproveita evento/edição se já existirem; se a PLANILHA da
-- edição já existir, não mexe em nada e avisa.
-- Reversão: ver bloco "ROLLBACK" no fim do arquivo (comentado).
-- ════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  -- ── Parâmetros ────────────────────────────────────────────────────────────
  v_master_email     text    := 'ronaldo@ronaldoborba.com.br'; -- dono dos registros
  v_exclusivo_master boolean := true;  -- true = só masters veem o evento até liberar
                                       -- (desmarcar depois em Cadastro do Evento)
  -- Combos de merchandising (R$) — iguais para todas as famílias
  v_combo_nomes jsonb   := '["COMBO 01","COMBO 02","COMBO 03","COMBO 04"]'::jsonb;
  v_combo_precos numeric[] := ARRAY[5500, 8350, 10500, 18000];

  -- ── Variáveis ─────────────────────────────────────────────────────────────
  v_uid  uuid;
  v_ev   uuid;
  v_ed   uuid;
  v_cfg  uuid;
  v_cats jsonb := '[]'::jsonb;
  v_ids   text[] := '{}';
  v_nomes jsonb  := '{}'::jsonb;
  v_precos jsonb := '{}'::jsonb;
  v_nrs  text[] := '{}';
  v_id   uuid;
  v_item record;
  v_cat  record;
  v_cores text[] := ARRAY['bg-[#FCE4D6]','bg-[#FFF2CC]','bg-[#E2EFDA]',
                          'bg-[#D9E1F2]','bg-[#F2F2F2]','bg-[#E6E6FA]'];
  i int;
BEGIN
  -- ── 0. Usuário dono ───────────────────────────────────────────────────────
  SELECT id INTO v_uid FROM public.users WHERE lower(email) = lower(v_master_email);
  IF v_uid IS NULL THEN
    SELECT id INTO v_uid FROM public.users
     WHERE can_manage_tags = true ORDER BY created_at LIMIT 1;
    RAISE NOTICE 'E-mail % não encontrado em public.users — usando o primeiro master (%)', v_master_email, v_uid;
  END IF;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário master encontrado — ajuste v_master_email.';
  END IF;

  -- ── 1. Evento ─────────────────────────────────────────────────────────────
  SELECT id INTO v_ev FROM public.eventos WHERE lower(nome) = 'megaleite' LIMIT 1;
  IF v_ev IS NULL THEN
    INSERT INTO public.eventos
      (nome, promotor_nome, promotor_endereco, promotor_telefone, promotor_email,
       promotor_redes_sociais, contato_principal, user_id, master_user_id)
    VALUES
      ('Megaleite',
       'Girolando – Associação Brasileira dos Criadores de Girolando',
       'Rua Orlando Vieira do Nascimento, 74 – Vila São Cristóvão – CEP 38040-280 – Uberaba/MG',
       '(34) 3331-6032',
       NULL, -- e-mail não publicado em texto no site (protegido) — preencher à mão
       jsonb_build_object(
         'site', 'https://www.girolando.com.br',
         'instagram', '@associacaogirolando',
         'facebook', '@associacaogirolando',
         'x', '@abcgirolando',
         'cnpj', '20.041.620/0001-86'),
       NULL,
       v_uid,
       CASE WHEN v_exclusivo_master THEN v_uid ELSE NULL END)
    RETURNING id INTO v_ev;
    RAISE NOTICE 'Evento "Megaleite" criado: %', v_ev;
  ELSE
    RAISE NOTICE 'Evento "Megaleite" já existia (%), reaproveitado.', v_ev;
  END IF;

  -- ── 2. Edição 2027 ────────────────────────────────────────────────────────
  SELECT id INTO v_ed FROM public.eventos_edicoes WHERE evento_id = v_ev AND ano = 2027 LIMIT 1;
  IF v_ed IS NULL THEN
    INSERT INTO public.eventos_edicoes
      (evento_id, titulo, ano, ativo, data_inicio, data_fim,
       local_completo, local_resumido, user_id)
    VALUES
      (v_ev, 'Megaleite 2027 – 22ª edição', 2027, true,
       '2027-06-08T10:00:00Z', '2027-06-12T18:00:00Z',
       'Parque de Exposições Bolivar de Andrade (Parque da Gameleira) – Av. Amazonas, 6020 – Gameleira – Belo Horizonte/MG (parque A CONFIRMAR: anúncio oficial citou só a cidade)',
       'Parque da Gameleira – Belo Horizonte/MG',
       v_uid)
    RETURNING id INTO v_ed;
    RAISE NOTICE 'Edição "Megaleite 2027" criada: %', v_ed;
  ELSE
    RAISE NOTICE 'Edição 2027 já existia (%), reaproveitada.', v_ed;
  END IF;

  -- ── 3. Planilha: só cria se ainda não existir ─────────────────────────────
  SELECT id INTO v_cfg FROM public.planilha_configuracoes WHERE edicao_id = v_ed LIMIT 1;
  IF v_cfg IS NOT NULL THEN
    RAISE NOTICE 'Planilha da edição já existe (%) — NADA foi alterado na planilha.', v_cfg;
    RETURN;
  END IF;

  -- ── 3a. Itens de merchandising (catálogo global itens_opcionais) ──────────
  -- Reaproveita item existente por nome (sem acento/caixa); senão cria.
  FOR v_item IN
    SELECT * FROM (VALUES
      ('Testeira de Pavilhão', 9000, 'testeira'),
      ('Placa de Pista',       3000, 'placa de pista'),
      ('Painel de LED',        3000, 'painel de led'),
      ('Blimp',                3000, 'blimp'),
      ('Galhardetes',          3000, 'galhardete')
    ) AS t(nome, preco, chave)
  LOOP
    SELECT id INTO v_id FROM public.itens_opcionais
     WHERE lower(translate(nome, 'ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç', 'AAAAEEIOOOUCaaaaeeiooouc'))
           LIKE '%' || v_item.chave || '%'
     ORDER BY created_at LIMIT 1;
    IF v_id IS NULL THEN
      INSERT INTO public.itens_opcionais (nome, preco_base)
      VALUES (v_item.nome, v_item.preco) RETURNING id INTO v_id;
      RAISE NOTICE 'Item opcional criado: % (R$ %)', v_item.nome, v_item.preco;
    ELSE
      RAISE NOTICE 'Item opcional reaproveitado: % → %', v_item.chave, v_id;
    END IF;
    v_ids    := v_ids || v_id::text;
    v_nomes  := v_nomes  || jsonb_build_object(v_id::text, v_item.nome);
    v_precos := v_precos || jsonb_build_object(v_id::text, v_item.preco);
  END LOOP;

  -- ── 3b. Famílias (categorias_config) ──────────────────────────────────────
  -- Preços em R$ (a planilha grava reais, não centavos).
  -- fixo:        standBase = preço do stand; combos[N] = stand + combo N
  -- area_livre:  preco_m2 = R$/m²; combos_adicionais[N] = combo N (soma à área)
  i := 0;
  FOR v_cat IN
    SELECT * FROM (VALUES
      -- ordem, tag,                    prefix, qtd, tipo,         base,     m2
      (1, 'CAMAROTES',             'C', 17, 'fixo',       18800.00, NULL::numeric),
      (2, 'PRÉ-MONTADO 40M²',      'D',  4, 'fixo',       37600.00, NULL),
      (3, 'ESPAÇO CRIADORES',      'F', 16, 'fixo',       12000.00, NULL),
      (4, 'PRAÇA DE ALIMENTAÇÃO',  'G', 22, 'fixo',           0.00, NULL),
      (5, 'ÁREA LIVRE',            'L', 20, 'area_livre',    NULL,  425.00),
      (6, 'MAQUINÁRIOS',           'M',  8, 'fixo',       20002.50, NULL),
      (7, 'PRÉ-MONTADOS',          'P', 33, 'fixo',       23500.00, NULL),
      (8, 'PATROCINADORES',        'PR', 20, 'fixo',           0.00, NULL), -- pista, sem custo
      (9, 'RUBIS',                 'R', 19, 'area_livre',    NULL,  400.00)
    ) AS t(ordem, tag, prefix, qtd, tipo, base, m2)
    ORDER BY ordem
  LOOP
    i := i + 1;
    IF v_cat.tipo = 'fixo' THEN
      v_cats := v_cats || jsonb_build_object(
        'tag', v_cat.tag, 'prefix', v_cat.prefix,
        'cor', v_cores[((i - 1) % array_length(v_cores, 1)) + 1],
        'count', v_cat.qtd, 'ordem', v_cat.ordem, 'is_stand', true,
        'tipo_precificacao', 'fixo',
        'standBase', v_cat.base,
        'combos', (SELECT jsonb_agg(v_cat.base + c) FROM unnest(v_combo_precos) AS c),
        'comboNames', v_combo_nomes);
    ELSE
      v_cats := v_cats || jsonb_build_object(
        'tag', v_cat.tag, 'prefix', v_cat.prefix,
        'cor', v_cores[((i - 1) % array_length(v_cores, 1)) + 1],
        'count', v_cat.qtd, 'ordem', v_cat.ordem, 'is_stand', true,
        'tipo_precificacao', 'area_livre',
        'preco_m2', v_cat.m2,
        'standBase', 0,
        'combos', (SELECT jsonb_agg(c) FROM unnest(v_combo_precos) AS c),
        'combos_adicionais', (SELECT jsonb_agg(c) FROM unnest(v_combo_precos) AS c),
        'comboNames', v_combo_nomes);
    END IF;
    -- stand_nr no padrão do sistema: "PREFIXO NN" (com ESPAÇO, 2 dígitos)
    SELECT v_nrs || array_agg(v_cat.prefix || ' ' || lpad(n::text, 2, '0') ORDER BY n)
      INTO v_nrs FROM generate_series(1, v_cat.qtd) AS n;
  END LOOP;

  INSERT INTO public.planilha_configuracoes
    (edicao_id, categorias_config, opcionais_ativos, opcionais_nomes, opcionais_precos)
  VALUES (v_ed, v_cats, v_ids::uuid[], v_nomes, v_precos)
  RETURNING id INTO v_cfg;
  RAISE NOTICE 'Planilha criada: % (% categorias, % opcionais)', v_cfg, jsonb_array_length(v_cats), array_length(v_ids, 1);

  -- ── 3c. Estandes (mesma RPC transacional que o app usa) ───────────────────
  PERFORM * FROM public.regenerate_estandes(v_cfg, v_nrs);
  RAISE NOTICE 'Estandes gerados: %', array_length(v_nrs, 1);

  -- ── 3d. Áreas (m²) das famílias de área livre, lidas da planta ────────────
  -- L-00 da planta (pavilhão 2100 m²) entra como "L 20" — o sistema numera de 01.
  UPDATE public.planilha_vendas_estandes e
     SET area_m2 = a.m2
    FROM (VALUES
      ('L 01', 150), ('L 02', 150), ('L 03',  50), ('L 04', 100), ('L 05',  50),
      ('L 06',  65), ('L 07',  70), ('L 08',  25), ('L 09',  25), ('L 10',  70),
      ('L 11',  50), ('L 12',  65), ('L 13',  50), ('L 14',  50), ('L 15',  85),
      ('L 16',  40), ('L 17',  40), ('L 18',  40), ('L 19', 100), ('L 20', 2100)
    ) AS a(nr, m2)
   WHERE e.config_id = v_cfg AND e.stand_nr = a.nr;

  UPDATE public.planilha_vendas_estandes
     SET area_m2 = 25
   WHERE config_id = v_cfg AND stand_nr LIKE 'R %';

  RAISE NOTICE 'Concluído. Edição: %  Planilha: %', v_ed, v_cfg;
END $$;

-- ── Conferência ─────────────────────────────────────────────────────────────
SELECT split_part(e.stand_nr, ' ', 1) AS familia,
       count(*)                        AS estandes,
       count(e.area_m2)                AS com_area,
       sum(e.area_m2)                  AS m2_total
  FROM public.planilha_vendas_estandes e
  JOIN public.planilha_configuracoes pc ON pc.id = e.config_id
  JOIN public.eventos_edicoes ed ON ed.id = pc.edicao_id
 WHERE ed.ano = 2027 AND ed.titulo ILIKE 'Megaleite%'
 GROUP BY 1 ORDER BY 1;
-- Esperado: C 17 · D 4 · F 16 · G 22 · L 20 (20 com área, 3.375 m²) · M 8 · P 33 · PR 20 · R 19 (19 com área, 475 m²)
-- Total: 159 estandes.

-- ── ROLLBACK (só se precisar desfazer; descomente e rode) ───────────────────
-- DELETE FROM public.planilha_vendas_estandes WHERE config_id IN
--   (SELECT pc.id FROM public.planilha_configuracoes pc JOIN public.eventos_edicoes ed ON ed.id = pc.edicao_id
--     WHERE ed.ano = 2027 AND ed.titulo ILIKE 'Megaleite%');
-- DELETE FROM public.planilha_configuracoes WHERE edicao_id IN
--   (SELECT id FROM public.eventos_edicoes WHERE ano = 2027 AND titulo ILIKE 'Megaleite%');
-- DELETE FROM public.eventos_edicoes WHERE ano = 2027 AND titulo ILIKE 'Megaleite%';
-- DELETE FROM public.eventos WHERE lower(nome) = 'megaleite'
--   AND NOT EXISTS (SELECT 1 FROM public.eventos_edicoes WHERE evento_id = eventos.id);
-- (itens_opcionais criados ficam no catálogo; apagar em Itens Opcionais se não quiser.)
