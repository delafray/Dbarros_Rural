-- Sistema de controle de imagens por edicao
-- Tabela 1: edicao_imagens_config  => requisitos configurados por categoria/item/avulso
-- Tabela 2: stand_imagens_status   => status manual por estande (solicitado/completo)

CREATE TABLE IF NOT EXISTS public.edicao_imagens_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edicao_id UUID NOT NULL REFERENCES public.eventos_edicoes(id) ON DELETE CASCADE,
    origem_tipo TEXT NOT NULL,  -- 'stand_categoria' | 'item_opcional' | 'avulso'
    origem_ref TEXT NOT NULL,   -- tag da categoria (ex: 'M') | nome do item | label avulso
    tipo TEXT NOT NULL DEFAULT 'imagem', -- 'imagem' | 'logo'
    descricao TEXT NOT NULL,    -- 'Testeira', 'Fundo backdrop', 'Logo principal'
    dimensoes TEXT,             -- '5x1m', '3x2m' (null para logo)
    -- Status proprio apenas para avulso
    avulso_status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente' | 'solicitado' | 'recebido'
    avulso_obs TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.edicao_imagens_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_imagens_config" ON public.edicao_imagens_config
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.stand_imagens_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estande_id UUID NOT NULL UNIQUE REFERENCES public.planilha_vendas_estandes(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente' | 'solicitado' | 'completo'
    observacoes TEXT,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.stand_imagens_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_stand_status" ON public.stand_imagens_status
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
