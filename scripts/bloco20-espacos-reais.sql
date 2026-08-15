-- ════════════════════════════════════════════════════════════════════════════
-- BLOCO 20 — Recriação dos ESPAÇOS com base nas 96 planilhas reais (rel. 72–78)
-- Pedido do usuário (04/08): "os espaços de hoje estão todos errados — recrie
-- com base nas suas pesquisas".
--
-- ⚠️ PRÉ-REQUISITO: Bloco 19 aplicado (grupo_id nos itens de descritivo).
-- ⚠️ Este bloco APAGA os descritivos dos 5 templates inventados e os recria
--    com dados das planilhas reais. Rodar UMA vez (rodar de novo desfaz
--    edições manuais feitas nos templates depois).
--
-- Fontes por template (MODULO-CUSTOS/PESQUISA-MODULO-CUSTOS/72–78):
--   Stand básico ........... planilha 28 (EXPOSIBRAM, modular 18 m², 3 variantes)
--   Stand pré-construído .... planilhas 19/83 (Megaleite E1, 242,5 m²; portes 150–730)
--   Alameda dos Criadores ... planilha 86 (números EXATOS)
--   Ilha comercial .......... planilha 22 (AMIS, módulo 12 m²)
--   Pista de Julgamento ..... rel. 72/78 + planilhas 63/84
--   Pórtico de entrada ...... planilhas 95/74-77
--   Leilão .................. rel. 72
--   Sala VIP / Administrativa planilha 37 (35 m²)
--   Bloco sanitário ......... planilhas 49/63
--   Baias e testeira ........ planilhas 63/85
--   Bar ..................... planilha 21 (Ilha da Cachaça) + lote 4
--   CAEX .................... planilhas 68/29 (credenciamento/secretaria)
--   Porta-malas ............. SEM planilha na pesquisa — fica vazio p/ o usuário
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 20.1 Itens de catálogo NOVOS da pesquisa (origem='pesquisa') ─────────────
INSERT INTO public.custos_produtos
  (nome, descricao, unidade, categoria_id, grupo_id, unidade_id, frequencia_uso, origem)
SELECT v.nome, v.descricao, v.unidade,
       (SELECT id FROM public.custos_categorias      WHERE slug = v.cat),
       (SELECT id FROM public.custos_produto_grupos  WHERE prosperitas_id = v.grupo),
       (SELECT id FROM public.custos_unidades        WHERE sigla = v.unidade),
       0, 'pesquisa'
FROM (VALUES
  ('Lona lamicel branca (cobertura Box Truss)', 'Cobertura completa de estrutura Box Truss', 'un', 'estruturas', 9,  NULL),
  ('Varão de cobertura para Box Truss',         'Sustentação de lona de cobertura',          'un', 'estruturas', 8,  NULL),
  ('Revestimento em tecido bagum',              'Bagum marrom por metro (lateral/estrutura)','m',  'decoracao',  9,  NULL),
  ('Degrau de madeira',                         'Acesso a piso elevado, por metro',          'm',  'piso',       2,  NULL),
  ('Guarda-corpo de madeira 0,90m',             'Áreas elevadas / lounge / palco',           'm',  'marcenaria', 4,  NULL),
  ('Piso Ecoblock',                             'Piso modular ecológico',                    'm2', 'piso',       2,  NULL),
  ('Contêiner sanitário duplo (masc/fem)',      'Com chuveiro — Expo Oliveira R$ 4.500–6.754','un','sanitarios', 13, NULL),
  ('Contêiner alojamento duplo para tratadores','Alojamento no recinto — Expobom R$ 2.000',  'un', 'estruturas', 13, NULL),
  ('Baia para equinos',                         'Expobom R$ 150/un',                         'un', 'animais',    13, NULL),
  ('Placa de fechamento de pista',              'Gradil/fechamento — Expobom R$ 20/un',      'un', 'estruturas', 10, NULL),
  ('Balcão em inox',                            'Área de serviço bar/cozinha',               'un', 'mobiliario', 5,  NULL),
  ('Fogão industrial',                          'Praça de alimentação / choperia',           'un', 'alimentacao',6,  NULL),
  ('Escaninho com cadeado',                     'Guarda-volumes / secretaria',               'un', 'mobiliario', 5,  NULL)
) AS v(nome, descricao, unidade, cat, grupo, extra)
WHERE NOT EXISTS (SELECT 1 FROM public.custos_produtos p WHERE p.nome = v.nome);

-- ── 20.2 Limpa os descritivos INVENTADOS dos 5 templates ─────────────────────
DELETE FROM public.custos_espaco_template_itens
WHERE template_id IN (SELECT id FROM public.custos_espacos_template
                      WHERE nome IN ('CAEX','Porta-malas','Bar','Stand básico','Stand customizado'));

-- ── 20.3 Renomeia/atualiza templates existentes e cria os que faltam ─────────
UPDATE public.custos_espacos_template
SET nome = 'Stand pré-construído',
    descricao = 'Box Truss Q25 + piso elevado + lamicel/bagum + testeira digital (Megaleite E1 242,5 m²; portes reais 150 / 242–270 / 730 m²)',
    porte = '242,5 m²'
WHERE nome = 'Stand customizado';

UPDATE public.custos_espacos_template
SET descricao = 'Modular 18 m² (EXPOSIBRAM): tablado + carpete + TS 2,86m + testeira. Variantes: esquina (9m testeira/8 spots), meio (6m/7), ponta de ilha (12m/9)',
    porte = '18 m² (9/16/25)'
WHERE nome = 'Stand básico';

UPDATE public.custos_espacos_template
SET descricao = 'Central de Atendimento ao Expositor — credenciamento/secretaria (planilhas 68/29)'
WHERE nome = 'CAEX';

UPDATE public.custos_espacos_template
SET descricao = 'Bar/ilha de bebidas (planilha 21 — Ilha da Cachaça)'
WHERE nome = 'Bar';

UPDATE public.custos_espacos_template
SET descricao = 'SEM planilha de referência na pesquisa (rel. 72–78) — descritivo a preencher pelo usuário'
WHERE nome = 'Porta-malas';

INSERT INTO public.custos_espacos_template (nome, descricao, porte)
SELECT v.nome, v.descricao, v.porte
FROM (VALUES
  ('Pista de Julgamento',       'Tendas de entrada de animais + deck/carpete + placas de fechamento + back drop + som de pista', NULL),
  ('Pórtico de entrada',        'Box Truss + lona com impressão digital + iluminação (planilha 95: 5,00x5,75m)', '5x5,75m'),
  ('Alameda dos Criadores',     'Corredor comercial aberto — números exatos da planilha 86 (Megaleite 2022)', '268 m²'),
  ('Ilha comercial',            'Módulo AMIS 12 m²: piso + TS + balcão + prateleiras + slat wall (planilha 22)', '12 m²'),
  ('Leilão',                    'Palco 10x5 + carpete + pórtico + sonorização (rel. 72)', NULL),
  ('Sala VIP / Administrativa', 'Sala compacta 35 m²: carpete + TS + vidro spider + climatização (planilha 37)', '35 m² (8–145)'),
  ('Bloco sanitário / Alojamento','Contêineres sanitário duplo + alojamento de tratadores (planilhas 49/63)', NULL),
  ('Baias e testeira de baias', '120 baias equinos + testeira metalon triangular 240 m² com impressão (planilhas 63/85)', NULL)
) AS v(nome, descricao, porte)
WHERE NOT EXISTS (SELECT 1 FROM public.custos_espacos_template t WHERE t.nome = v.nome);

-- ── 20.4 Descritivos REAIS ───────────────────────────────────────────────────
-- produto referenciado por prosperitas_id (import) ou nome (itens 20.1);
-- produto NULL = linha livre (grupo explícito). Quantidades = default editável.
INSERT INTO public.custos_espaco_template_itens
  (template_id, produto_id, categoria_id, grupo_id, descricao, quantidade, formato, ordem)
SELECT t.id,
       CASE WHEN v.pros_id IS NOT NULL THEN (SELECT id FROM public.custos_produtos WHERE prosperitas_id = v.pros_id)
            WHEN v.prod_nome IS NOT NULL THEN (SELECT id FROM public.custos_produtos WHERE nome = v.prod_nome)
            ELSE NULL END,
       COALESCE(
         (SELECT categoria_id FROM public.custos_produtos WHERE prosperitas_id = v.pros_id),
         (SELECT categoria_id FROM public.custos_produtos WHERE nome = v.prod_nome),
         (SELECT id FROM public.custos_categorias WHERE slug = 'outros')),
       COALESCE(
         (SELECT grupo_id FROM public.custos_produtos WHERE prosperitas_id = v.pros_id),
         (SELECT grupo_id FROM public.custos_produtos WHERE nome = v.prod_nome),
         (SELECT id FROM public.custos_produto_grupos WHERE prosperitas_id = v.grupo_fallback)),
       v.descricao, v.qtd, v.formato, v.ordem
FROM (VALUES
  -- ═ STAND BÁSICO (planilha 28 — EXPOSIBRAM 18 m²) ═
  ('Stand básico', 15,  NULL, NULL, 'Piso elevado tablado',            18::numeric, '6x3',        10),
  ('Stand básico', 18,  NULL, NULL, 'Carpete',                         18,          NULL,         20),
  ('Stand básico', 44,  NULL, NULL, 'Montagem TS 2,86m',               18,          NULL,         30),
  ('Stand básico', 249, NULL, NULL, 'Testeira (quadro de metalon)',    6,           'testeira',   40),
  ('Stand básico', 311, NULL, NULL, 'Impressão digital da testeira',   6,           NULL,         50),
  ('Stand básico', 272, NULL, NULL, 'Tomadas ABNT',                    2,           NULL,         60),
  ('Stand básico', 276, NULL, NULL, 'Spots (esquina 8 / meio 7 / ponta 9)', 8,      NULL,         70),
  -- ═ STAND PRÉ-CONSTRUÍDO (planilhas 19/83 — Megaleite E1, 242,5 m²) ═
  ('Stand pré-construído', 15,  NULL, NULL, 'Piso elevado tablado',    242.5,       'E1',         10),
  ('Stand pré-construído', NULL,'Degrau de madeira', NULL, 'Degraus de acesso', 15, NULL,         20),
  ('Stand pré-construído', 241, NULL, NULL, 'Estrutura Box Truss Q25', 170,         '24,25x7,00m',30),
  ('Stand pré-construído', 242, NULL, NULL, 'Cubos Q25',               8,           NULL,         40),
  ('Stand pré-construído', NULL,'Varão de cobertura para Box Truss', NULL, 'Varões de cobertura', 20, NULL, 50),
  ('Stand pré-construído', NULL,'Lona lamicel branca (cobertura Box Truss)', NULL, 'Cobertura completa', 1, NULL, 60),
  ('Stand pré-construído', NULL,'Revestimento em tecido bagum', NULL, 'Revestimento lateral', 63, NULL,   70),
  ('Stand pré-construído', 249, NULL, NULL, 'Quadros de metalon',      63,          NULL,         80),
  ('Stand pré-construído', 311, NULL, NULL, 'Impressão digital das testeiras', 23,  NULL,         90),
  ('Stand pré-construído', NULL, NULL, 9,   'Fechamento lateral entre stands (lona)', 36, NULL,   100),
  ('Stand pré-construído', 271, NULL, NULL, 'Quadro de energia + cabeamento', 1,    NULL,         110),
  ('Stand pré-construído', 272, NULL, NULL, 'Tomadas ABNT',            8,           NULL,         120),
  ('Stand pré-construído', 275, NULL, NULL, 'Iluminação (refletores HQI)', 10,      NULL,         130),
  -- ═ ALAMEDA DOS CRIADORES (planilha 86 — números exatos) ═
  ('Alameda dos Criadores', 15,  NULL, NULL, 'Piso elevado tablado',   268,         NULL,         10),
  ('Alameda dos Criadores', NULL,'Degrau de madeira', NULL, 'Degraus', 34,          NULL,         20),
  ('Alameda dos Criadores', 19,  NULL, NULL, 'Revestimento em deck',   268,         NULL,         30),
  ('Alameda dos Criadores', 241, NULL, NULL, 'Estrutura Box Truss Q25',66.5,        '2× 33,25m',  40),
  ('Alameda dos Criadores', 249, NULL, NULL, 'Painel de metalon encaixado', 192,    'encaixado',  50),
  ('Alameda dos Criadores', 311, NULL, NULL, 'Impressão digital',      192,         NULL,         60),
  ('Alameda dos Criadores', 272, NULL, NULL, 'Tomadas ABNT',           32,          NULL,         70),
  ('Alameda dos Criadores', 275, NULL, NULL, 'Refletores HQI',         20,          NULL,         80),
  -- ═ PISTA DE JULGAMENTO (rel. 72/78 + planilhas 63/84) ═
  ('Pista de Julgamento', 8,   NULL, NULL, 'Tendas 10x10 — entrada de animais', 2,  '10x10',      10),
  ('Pista de Julgamento', 19,  NULL, NULL, 'Deck — jurados/secretaria de pista', 100, NULL,       20),
  ('Pista de Julgamento', 18,  NULL, NULL, 'Carpete da pista',         800,         'verde',      30),
  ('Pista de Julgamento', NULL,'Placa de fechamento de pista', NULL, 'Fechamento da pista', 50, NULL, 40),
  ('Pista de Julgamento', 249, NULL, NULL, 'Back drop (quadro de metalon)', 40,     NULL,         50),
  ('Pista de Julgamento', 311, NULL, NULL, 'Impressão digital — back drop/placas', 40, NULL,      60),
  ('Pista de Julgamento', NULL, NULL, 13,  'Som de pista (frente Som/LED)', 1,      'vb',         70),
  -- ═ PÓRTICO DE ENTRADA (planilhas 95/74-77) ═
  ('Pórtico de entrada', 241, NULL, NULL, 'Estrutura Box Truss Q25',   26,          '5,00x5,75m', 10),
  ('Pórtico de entrada', 242, NULL, NULL, 'Cubos Q25',                 6,           NULL,         20),
  ('Pórtico de entrada', 255, NULL, NULL, 'Lona com impressão digital e ilhós', 28.75, NULL,      30),
  ('Pórtico de entrada', 275, NULL, NULL, 'Refletores HQI',            2,           NULL,         40),
  -- ═ ILHA COMERCIAL (planilha 22 — AMIS 12 m²) ═
  ('Ilha comercial', 27,  NULL, NULL, 'Piso tablado',                  12,          '3x4',        10),
  ('Ilha comercial', 18,  NULL, NULL, 'Carpete',                       12,          NULL,         20),
  ('Ilha comercial', 42,  NULL, NULL, 'Montagem TS 2,20m',             12,          NULL,         30),
  ('Ilha comercial', 65,  NULL, NULL, 'Prateleiras de madeira',        10,          NULL,         40),
  ('Ilha comercial', 31,  NULL, NULL, 'Balcão armário TS',             1,           NULL,         50),
  ('Ilha comercial', 59,  NULL, NULL, 'Painéis slat wall',             2,           NULL,         60),
  ('Ilha comercial', 272, NULL, NULL, 'Tomadas ABNT',                  2,           NULL,         70),
  -- ═ LEILÃO (rel. 72) ═
  ('Leilão', 27,  NULL, NULL, 'Palco em tablado',                      50,          '10x5',       10),
  ('Leilão', 18,  NULL, NULL, 'Carpete do palco',                      50,          NULL,         20),
  ('Leilão', 241, NULL, NULL, 'Pórtico de entrada (Box Truss)',        20,          NULL,         30),
  ('Leilão', 255, NULL, NULL, 'Lona com impressão digital e ilhós',    15,          NULL,         40),
  ('Leilão', NULL, NULL, 13,  'Sonorização do leilão',                 1,           'vb',         50),
  ('Leilão', 275, NULL, NULL, 'Refletores HQI',                        8,           NULL,         60),
  -- ═ SALA VIP / ADMINISTRATIVA (planilha 37 — 35 m²) ═
  ('Sala VIP / Administrativa', 18,  NULL, NULL, 'Carpete',            35,          '7x5',        10),
  ('Sala VIP / Administrativa', 42,  NULL, NULL, 'Montagem TS 2,20m',  17.5,        NULL,         20),
  ('Sala VIP / Administrativa', 63,  NULL, NULL, 'Porta TS',           1,           NULL,         30),
  ('Sala VIP / Administrativa', 56,  NULL, NULL, 'Painéis de vidro spider 0,98x1,08', 13, NULL,   40),
  ('Sala VIP / Administrativa', 61,  NULL, NULL, 'Porta blindex',      1,           NULL,         50),
  ('Sala VIP / Administrativa', 65,  NULL, NULL, 'Prateleiras',        3,           NULL,         60),
  ('Sala VIP / Administrativa', 207, NULL, NULL, 'Ar-condicionado split', 1,        '18.000 BTU', 70),
  ('Sala VIP / Administrativa', 272, NULL, NULL, 'Tomadas ABNT',       4,           NULL,         80),
  -- ═ BLOCO SANITÁRIO / ALOJAMENTO (planilhas 49/63) ═
  ('Bloco sanitário / Alojamento', NULL,'Contêiner sanitário duplo (masc/fem)', NULL, 'Sanitário com chuveiro', 1, NULL, 10),
  ('Bloco sanitário / Alojamento', NULL,'Contêiner alojamento duplo para tratadores', NULL, 'Alojamento de tratadores', 5, NULL, 20),
  -- ═ BAIAS E TESTEIRA (planilhas 63/85) ═
  ('Baias e testeira de baias', NULL,'Baia para equinos', NULL, 'Baias', 120,       NULL,         10),
  ('Baias e testeira de baias', 249, NULL, NULL, 'Testeira (quadro metalon triangular)', 240, 'triangular', 20),
  ('Baias e testeira de baias', 311, NULL, NULL, 'Impressão digital — identificação', 240, NULL, 30),
  -- ═ BAR (planilha 21 — Ilha da Cachaça) ═
  ('Bar', 3,   NULL, NULL, 'Tenda 5x5',                                1,           '5x5',        10),
  ('Bar', 27,  NULL, NULL, 'Piso tablado',                             25,          NULL,         20),
  ('Bar', 18,  NULL, NULL, 'Carpete',                                  25,          NULL,         30),
  ('Bar', 32,  NULL, NULL, 'Balcões de atendimento TS',                2,           NULL,         40),
  ('Bar', NULL,'Balcão em inox', NULL, 'Balcão de serviço',            1,           NULL,         50),
  ('Bar', 68,  NULL, NULL, 'Prateleiras de vidro — exposição de bebidas', 6,        NULL,         60),
  ('Bar', 271, NULL, NULL, 'Quadro de energia',                        1,           NULL,         70),
  ('Bar', 272, NULL, NULL, 'Tomadas (freezers)',                       4,           NULL,         80),
  ('Bar', 276, NULL, NULL, 'Refletores de LED',                        2,           NULL,         90),
  -- ═ CAEX (planilhas 68/29 — credenciamento/secretaria) ═
  ('CAEX', 27,  NULL, NULL, 'Piso tablado',                            60,          NULL,         10),
  ('CAEX', 18,  NULL, NULL, 'Carpete',                                 60,          NULL,         20),
  ('CAEX', 44,  NULL, NULL, 'Montagem TS 2,86m',                       30,          NULL,         30),
  ('CAEX', 48,  NULL, NULL, 'Balcões de atendimento curvos TS',        6,           NULL,         40),
  ('CAEX', 50,  NULL, NULL, 'Bancadas para computador',                4,           NULL,         50),
  ('CAEX', NULL, NULL, 5,   'Cadeiras de atendimento',                 10,          NULL,         60),
  ('CAEX', NULL,'Escaninho com cadeado', NULL, 'Guarda-volumes',       2,           NULL,         70),
  ('CAEX', 271, NULL, NULL, 'Quadro de energia',                       1,           NULL,         80),
  ('CAEX', 272, NULL, NULL, 'Tomadas ABNT',                            10,          NULL,         90),
  ('CAEX', 276, NULL, NULL, 'Refletores de LED',                       6,           NULL,         100)
) AS v(template, pros_id, prod_nome, grupo_fallback, descricao, qtd, formato, ordem)
JOIN public.custos_espacos_template t ON t.nome = v.template
WHERE NOT EXISTS (
  SELECT 1 FROM public.custos_espaco_template_itens e
  WHERE e.template_id = t.id AND e.descricao = v.descricao
);

COMMIT;

-- ── Verificação ──────────────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM public.custos_produtos WHERE origem='pesquisa')      AS produtos_pesquisa,   -- esperado: 13
  (SELECT count(*) FROM public.custos_espacos_template)                      AS templates_total,     -- esperado: 13
  (SELECT count(*) FROM public.custos_espaco_template_itens)                 AS itens_descritivo,    -- esperado: 84
  (SELECT count(*) FROM public.custos_espaco_template_itens
    WHERE produto_id IS NULL AND grupo_id IS NULL)                           AS itens_sem_grupo;     -- esperado: 0

-- Conferência visual: descritivo da Alameda (deve bater com a planilha 86)
SELECT e.descricao, e.quantidade, e.formato
FROM public.custos_espaco_template_itens e
JOIN public.custos_espacos_template t ON t.id = e.template_id
WHERE t.nome = 'Alameda dos Criadores' ORDER BY e.ordem;
