-- Lonas de cardápio (formato livre, ex.: 100×300cm com área útil 80×210cm)
-- Uma lona agrega os menus A4 do projeto (blocos por estabelecimento, cada um
-- com logo) e distribui o conteúdo dentro da área útil, sem invadir a arte de
-- fundo (logos do evento/patrocinadores).
--
-- ⚠️ Rodar manualmente no SQL Editor do Supabase ANTES do deploy do código.
-- Blocos idempotentes — o script pode ser re-executado com segurança.

-- 1. Logo do estabelecimento (nullable; o A4/A3 ignoram por enquanto) ----------
ALTER TABLE public.menus_a4
    ADD COLUMN IF NOT EXISTS logo_url text;

-- 2. Tabela de lonas -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cardapio_lonas (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    projeto_id          uuid NOT NULL REFERENCES public.cardapio_projetos(id) ON DELETE CASCADE,
    nome                text NOT NULL,
    -- Dimensões finais do arquivo (cm) — livres, informadas por lona
    largura_cm          numeric NOT NULL DEFAULT 100 CHECK (largura_cm > 0),
    altura_cm           numeric NOT NULL DEFAULT 300 CHECK (altura_cm > 0),
    -- Área útil onde o cardápio é distribuído (cm); offsets null = centrada
    util_largura_cm     numeric NOT NULL DEFAULT 80  CHECK (util_largura_cm > 0),
    util_altura_cm      numeric NOT NULL DEFAULT 210 CHECK (util_altura_cm > 0),
    util_offset_x_cm    numeric,
    util_offset_y_cm    numeric,
    -- Arte de fundo da lona (bucket cardapio-assets); null = export só do miolo
    fundo_url           text,
    -- Limites globais da caixa de logo (cm) — proporção sempre preservada;
    -- cada bloco pode sobrescrever no jsonb abaixo
    logo_max_largura_cm numeric NOT NULL DEFAULT 14 CHECK (logo_max_largura_cm > 0),
    logo_max_altura_cm  numeric NOT NULL DEFAULT 7  CHECK (logo_max_altura_cm > 0),
    -- Colunas do fluxo de blocos normais (1..3); destaque ocupa a largura toda
    colunas             integer NOT NULL DEFAULT 2 CHECK (colunas BETWEEN 1 AND 3),
    -- Blocos na ordem de exibição:
    -- [{ menu_id, destaque?, logo_max_largura_cm?, logo_max_altura_cm? }]
    blocos              jsonb NOT NULL DEFAULT '[]',
    -- Multiplicadores de fonte (Partial<FontesLona>); null = padrão
    fontes              jsonb,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cardapio_lonas_projeto ON public.cardapio_lonas(projeto_id);

ALTER TABLE public.cardapio_lonas ENABLE ROW LEVEL SECURITY;

-- Mesmo modelo das demais tabelas de cardápio: autenticado gerencia.
DROP POLICY IF EXISTS "auth_all_cardapio_lonas" ON public.cardapio_lonas;
CREATE POLICY "auth_all_cardapio_lonas" ON public.cardapio_lonas
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
