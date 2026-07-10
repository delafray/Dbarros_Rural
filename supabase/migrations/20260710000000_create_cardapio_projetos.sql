-- Projetos de Cardápio por Evento
-- Agrupa cardápios (banner) e menus A4 por projeto/evento, com tema visual
-- (fundo, cores, chancela) configurável por projeto.
--
-- ⚠️ Rodar manualmente no SQL Editor do Supabase ANTES do deploy do código.
-- Todos os blocos são idempotentes — o script pode ser re-executado com
-- segurança (inclusive só o bloco de backfill, se novos cardápios forem
-- criados entre a execução do SQL e o deploy).

-- 1. Tabela de projetos --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cardapio_projetos (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome             text NOT NULL,
    edicao_id        uuid REFERENCES public.eventos_edicoes(id) ON DELETE SET NULL,
    tema             jsonb,        -- Partial<CardapioTema>; null = visual padrão
    -- Fundos independentes por formato (bucket cardapio-assets); null = cor sólida
    fundo_banner_url text,         -- banner 1600×880 (também usado no painel duplo)
    fundo_a4_url     text,         -- menu A4 retrato
    fundo_a3_url     text,         -- páginas A3 duplo retrato
    chancela_url     text,         -- chancela/rodapé do A4; null = /chancela.png
    created_at       timestamptz DEFAULT now(),
    updated_at       timestamptz DEFAULT now()
);

ALTER TABLE public.cardapio_projetos ENABLE ROW LEVEL SECURITY;

-- Módulo utilitário: qualquer usuário autenticado gerencia (mesmo modelo das
-- tabelas de tarefas/imagens).
DROP POLICY IF EXISTS "auth_all_cardapio_projetos" ON public.cardapio_projetos;
CREATE POLICY "auth_all_cardapio_projetos" ON public.cardapio_projetos
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. FK nullable nas tabelas existentes ----------------------------------------
-- Nullable para rollout seguro: o código em produção ignora a coluna até o
-- deploy da versão nova.
ALTER TABLE public.cardapios
    ADD COLUMN IF NOT EXISTS projeto_id uuid REFERENCES public.cardapio_projetos(id) ON DELETE CASCADE;
ALTER TABLE public.menus_a4
    ADD COLUMN IF NOT EXISTS projeto_id uuid REFERENCES public.cardapio_projetos(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_cardapios_projeto ON public.cardapios(projeto_id);
CREATE INDEX IF NOT EXISTS idx_menus_a4_projeto  ON public.menus_a4(projeto_id);

-- 3. Projeto legado "91ª EXPOZEBU" + backfill (re-rodável) ----------------------
DO $$
DECLARE v_projeto uuid;
BEGIN
    SELECT id INTO v_projeto FROM public.cardapio_projetos WHERE nome = '91ª EXPOZEBU';
    IF v_projeto IS NULL THEN
        INSERT INTO public.cardapio_projetos (nome, edicao_id)
        VALUES (
            '91ª EXPOZEBU',
            -- vincula à edição cadastrada, se existir
            (SELECT id FROM public.eventos_edicoes
              WHERE titulo ILIKE '%expozebu%' ORDER BY ano DESC LIMIT 1)
        )
        RETURNING id INTO v_projeto;
    END IF;

    UPDATE public.cardapios SET projeto_id = v_projeto WHERE projeto_id IS NULL;
    UPDATE public.menus_a4  SET projeto_id = v_projeto WHERE projeto_id IS NULL;
END $$;

-- 4. Bucket público para fundos/chancelas ---------------------------------------
-- Público é obrigatório: o export PNG desenha o fundo no canvas (drawImage +
-- toDataURL) e precisa de CORS liberado para não "tingir" (taint) o canvas.
INSERT INTO storage.buckets (id, name, public)
VALUES ('cardapio-assets', 'cardapio-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public_read_cardapio_assets" ON storage.objects;
CREATE POLICY "public_read_cardapio_assets" ON storage.objects
    FOR SELECT USING (bucket_id = 'cardapio-assets');

DROP POLICY IF EXISTS "auth_insert_cardapio_assets" ON storage.objects;
CREATE POLICY "auth_insert_cardapio_assets" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'cardapio-assets');

DROP POLICY IF EXISTS "auth_update_cardapio_assets" ON storage.objects;
CREATE POLICY "auth_update_cardapio_assets" ON storage.objects
    FOR UPDATE TO authenticated USING (bucket_id = 'cardapio-assets');

DROP POLICY IF EXISTS "auth_delete_cardapio_assets" ON storage.objects;
CREATE POLICY "auth_delete_cardapio_assets" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'cardapio-assets');
