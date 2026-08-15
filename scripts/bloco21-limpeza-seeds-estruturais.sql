-- ════════════════════════════════════════════════════════════════════════════
-- BLOCO 21 — Limpeza REVERSÍVEL dos seeds estruturais redundantes (fase R3)
-- Decisão 04/08: o import do Prosperitas cobre a seção ESTRUTURA; os produtos
-- que a IA inventou nos seeds e que têm equivalente REAL verificado no
-- catálogo importado saem do autocomplete (ativo=false — nada é apagado;
-- itens antigos que os referenciam continuam válidos).
-- Os seeds NÃO-estruturais (marmitex, seguro, pró-labore de jurado,
-- maravalha...) FICAM: são o embrião de Julgamento/Diversos.
-- Reverter: UPDATE custos_produtos SET ativo = true WHERE nome IN (...);
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

UPDATE public.custos_produtos
SET ativo = false
WHERE origem = 'seed'
  AND ativo = true
  AND nome IN (
    -- equivalente real verificado no catálogo importado:
    'Tenda 5x5',              -- Tenda piramidal 5,00x5,00m
    'Tenda 8x8',              -- Tenda piramidal 8,00x8,00m
    'Tenda 10x10',            -- Tenda piramidal 10,00x10,00m
    'Tenda 3x3 com balcão',   -- Tenda piramidal 3,00x3,00m + balcões do catálogo
    'Fechamento de tenda',    -- Fechamento lateral em lona com ilhós (5x5/10x10)
    'Piso deck',              -- Revestimento do piso em Deck
    'Carpete',                -- Revestimento do piso em carpete
    'Tablado / palco',        -- Tablado de madeira / piso elevado tablado
    'Testeira de metalon',    -- Quadro de metalon / testeiras do catálogo
    'Lona impressa',          -- Impressão digital em lona (c/ e s/ ilhós)
    'Ponto de tomada',        -- Tomada/novo padrão ABNT
    'Iluminação de stand'     -- Refletores (HQI/LED/spots) do catálogo
  );

-- Mantidos de propósito (SEM equivalente verificado no catálogo real):
--   'Cadeira simples branca', 'Mesa plástica', 'Jogo mesa + 4 cadeiras',
--   'Balcão modular' (mobiliário plástico de evento rural ≠ mobiliário de
--   stand do Prosperitas), 'Adesivo impresso', 'Blimp instalado',
--   'Galhardete de poste', 'Placa de pista', 'Placa de sinalização',
--   'Gerador 250 kVA', 'Torre de iluminação', 'Material elétrico',
--   'Arquibancada', 'Fechamento gradil', 'Pórtico de entrada',
--   'Brete / curral' e todos os não-estruturais (Julgamento/Diversos).

COMMIT;

-- ── Verificação ──────────────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM public.custos_produtos WHERE origem='seed' AND ativo = false) AS seeds_desativados,  -- esperado: 12
  (SELECT count(*) FROM public.custos_produtos WHERE origem='seed' AND ativo = true)  AS seeds_ativos;       -- esperado: 46

-- Conferência: nenhum desativado sem equivalente real ativo
SELECT p.nome AS desativado
FROM public.custos_produtos p
WHERE p.origem='seed' AND p.ativo = false
ORDER BY p.nome;
