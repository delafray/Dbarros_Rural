-- Adiciona colunas de timestamp por status em stand_imagens_status
ALTER TABLE public.stand_imagens_status
    ADD COLUMN IF NOT EXISTS pendente_em  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS solicitado_em TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS completo_em  TIMESTAMPTZ;
