-- Indexes para performance das RLS policies (subqueries com JOINs)
-- Sem estes indices, cada query faz full scan nas tabelas referenciadas

CREATE INDEX IF NOT EXISTS idx_eventos_edicoes_evento_id
  ON public.eventos_edicoes(evento_id);

CREATE INDEX IF NOT EXISTS idx_planilha_configuracoes_edicao_id
  ON public.planilha_configuracoes(edicao_id);

CREATE INDEX IF NOT EXISTS idx_planilha_vendas_estandes_config_id
  ON public.planilha_vendas_estandes(config_id);

CREATE INDEX IF NOT EXISTS idx_edicao_imagens_config_edicao_id
  ON public.edicao_imagens_config(edicao_id);

-- Constraints para campos de Area Livre (impede valores negativos)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'area_m2_non_negative'
  ) THEN
    ALTER TABLE public.planilha_vendas_estandes
      ADD CONSTRAINT area_m2_non_negative CHECK (area_m2 IS NULL OR area_m2 >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'preco_m2_override_non_negative'
  ) THEN
    ALTER TABLE public.planilha_vendas_estandes
      ADD CONSTRAINT preco_m2_override_non_negative CHECK (preco_m2_override IS NULL OR preco_m2_override >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'total_override_non_negative'
  ) THEN
    ALTER TABLE public.planilha_vendas_estandes
      ADD CONSTRAINT total_override_non_negative CHECK (total_override IS NULL OR total_override >= 0);
  END IF;
END $$;
