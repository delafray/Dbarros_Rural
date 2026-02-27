-- Controle individual de recebimento de imagens por item e por estande
-- Cada linha = um item de imagem recebido (ou nao) para um estande especifico

CREATE TABLE IF NOT EXISTS public.stand_imagem_recebimentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estande_id UUID NOT NULL REFERENCES public.planilha_vendas_estandes(id) ON DELETE CASCADE,
    imagem_config_id UUID NOT NULL REFERENCES public.edicao_imagens_config(id) ON DELETE CASCADE,
    recebido BOOLEAN NOT NULL DEFAULT FALSE,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(estande_id, imagem_config_id)
);

ALTER TABLE public.stand_imagem_recebimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_imagem_recebimentos" ON public.stand_imagem_recebimentos
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Index para queries frequentes por estande
CREATE INDEX IF NOT EXISTS idx_imagem_recebimentos_estande
    ON public.stand_imagem_recebimentos(estande_id);
