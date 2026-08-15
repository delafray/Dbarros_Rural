-- ════════════════════════════════════════════════════════════════════════════
-- BLOCO 19 — Grupo de produto nos itens de descritivo (RF-057)
-- As seções da tela de espaço (port do Prosperitas) são por GRUPO; os itens
-- de descritivo precisam carregar o grupo. Idempotente.
-- Pré-requisito: bloco de import do catálogo aplicado (custos_produto_grupos).
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.custos_espaco_template_itens
  ADD COLUMN IF NOT EXISTS grupo_id uuid REFERENCES public.custos_produto_grupos(id) ON DELETE SET NULL;
ALTER TABLE public.custos_itens
  ADD COLUMN IF NOT EXISTS grupo_id uuid REFERENCES public.custos_produto_grupos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_custos_tpl_itens_grupo ON public.custos_espaco_template_itens(grupo_id);
CREATE INDEX IF NOT EXISTS idx_custos_itens_grupo     ON public.custos_itens(grupo_id);

-- ── Produtos do seed: grupo onde o mapeamento categoria→grupo é óbvio ────────
-- (para os templates atuais — Stand básico, Bar, CAEX... — aparecerem nas
--  seções certas; seeds de categorias operacionais ficam sem grupo mesmo)
UPDATE public.custos_produtos p
SET grupo_id = g.id
FROM public.custos_categorias c
JOIN public.custos_produto_grupos g ON g.prosperitas_id = CASE c.slug
  WHEN 'tendas'             THEN 1   -- Tenda / Telhado
  WHEN 'piso'               THEN 2   -- Piso / Revestimento
  WHEN 'marcenaria'         THEN 4   -- Marcenaria
  WHEN 'mobiliario'         THEN 5   -- Mobiliário
  WHEN 'programacao-visual' THEN 11  -- Impressão Digital
  WHEN 'eletrica'           THEN 12  -- Elétrica
  END
WHERE p.categoria_id = c.id
  AND p.origem = 'seed'
  AND p.grupo_id IS NULL
  AND c.slug IN ('tendas','piso','marcenaria','mobiliario','programacao-visual','eletrica');

-- ── Backfill: item de descritivo herda o grupo do produto vinculado ──────────
UPDATE public.custos_espaco_template_itens t
SET grupo_id = p.grupo_id
FROM public.custos_produtos p
WHERE p.id = t.produto_id AND t.grupo_id IS NULL AND p.grupo_id IS NOT NULL;

UPDATE public.custos_itens i
SET grupo_id = p.grupo_id
FROM public.custos_produtos p
WHERE p.id = i.produto_id AND i.grupo_id IS NULL AND p.grupo_id IS NOT NULL;

COMMIT;

-- ── Verificação ──────────────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM public.custos_produtos
    WHERE origem='seed' AND grupo_id IS NOT NULL)                  AS seeds_com_grupo,      -- esperado: ~24
  (SELECT count(*) FROM public.custos_espaco_template_itens
    WHERE grupo_id IS NOT NULL)                                    AS itens_template_c_grupo,
  (SELECT count(*) FROM public.custos_espaco_template_itens)       AS itens_template_total, -- esperado: iguais
  (SELECT count(*) FROM public.custos_itens
    WHERE produto_id IS NOT NULL AND grupo_id IS NULL)             AS itens_evento_sem_grupo;
