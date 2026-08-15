-- ════════════════════════════════════════════════════════════════════════════
-- BLOCO 23 — Sinônimos migrados para os produtos REAIS (correção RF-049)
-- Bug: os sinônimos do seed ("toldo 5x5" → 'Tenda 5x5') ficaram órfãos quando
-- o Bloco 21 desativou os seeds — a busca filtra p.ativo e "toldo" passou a
-- não achar nada. Este bloco cadastra os sinônimos nas tendas piramidais e
-- demais produtos reais do catálogo Prosperitas. Idempotente.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- "toldo" (genérico + por tamanho) → as 9 tendas piramidais reais
INSERT INTO public.custos_produto_sinonimos (produto_id, termo)
SELECT p.id, v.termo
FROM (VALUES
  (1, 'toldo'), (1, 'toldo 3x3'),
  (2, 'toldo'), (2, 'toldo 4x4'),
  (3, 'toldo'), (3, 'toldo 5x5'),
  (4, 'toldo'), (4, 'toldo 6x6'),
  (5, 'toldo'), (5, 'toldo 7x7'),
  (6, 'toldo'), (6, 'toldo 8x8'),
  (7, 'toldo'), (7, 'toldo 10x5'),
  (8, 'toldo'), (8, 'toldo 10x10'),
  (9, 'toldo'), (9, 'toldo 15x10')
) AS v(pros_id, termo)
JOIN public.custos_produtos p ON p.prosperitas_id = v.pros_id
ON CONFLICT (produto_id, termo) DO NOTHING;

-- Demais sinônimos que apontavam para seeds desativados → produto real
INSERT INTO public.custos_produto_sinonimos (produto_id, termo)
SELECT p.id, v.termo
FROM (VALUES
  (311, 'banner'),             -- Impressão digital em lona
  (255, 'banner'),             -- Impressão digital em Lona com ilhós
  (27,  'assoalho'),           -- Tablado de madeira
  (15,  'assoalho'),           -- Piso elevado tablado
  (19,  'deck'),               -- Revestimento do piso em Deck
  (249, 'faixa de testeira'),  -- Quadro de metalon
  (272, 'tomada'),             -- Tomada/novo padrão ABNT
  (18,  'carpete')             -- Revestimento do piso em carpete (busca direta já acha; sinônimo garante prefixo)
) AS v(pros_id, termo)
JOIN public.custos_produtos p ON p.prosperitas_id = v.pros_id
ON CONFLICT (produto_id, termo) DO NOTHING;

COMMIT;

-- ── Verificação ──────────────────────────────────────────────────────────────
-- 1) contagem de sinônimos em produtos ATIVOS (esperado: >= 26 novos)
SELECT count(*) AS sinonimos_em_produtos_ativos
FROM public.custos_produto_sinonimos s
JOIN public.custos_produtos p ON p.id = s.produto_id AND p.ativo;

-- 2) A PROVA: "toldo" tem de trazer as tendas piramidais
SELECT nome, frequencia_uso, round(score::numeric, 3) AS score
FROM public.custos_buscar_produtos('toldo', 10);

-- 3) e "toldo 10x10" tem de trazer a 10,00x10,00m no topo
SELECT nome FROM public.custos_buscar_produtos('toldo 10x10', 3);
