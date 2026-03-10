-- Adiciona campos de area livre na tabela de estandes
-- area_m2: metragem do stand (m2)
-- preco_m2_override: preco/m2 individual (NULL = usa referencia da categoria)
-- total_override: total base manual (NULL = usa calculado: area_m2 x preco_m2)
-- combo_overrides: overrides manuais por combo { "COMBO 01": 38000, ... }

ALTER TABLE public.planilha_vendas_estandes
ADD COLUMN IF NOT EXISTS area_m2 NUMERIC,
ADD COLUMN IF NOT EXISTS preco_m2_override NUMERIC,
ADD COLUMN IF NOT EXISTS total_override NUMERIC,
ADD COLUMN IF NOT EXISTS combo_overrides JSONB;
