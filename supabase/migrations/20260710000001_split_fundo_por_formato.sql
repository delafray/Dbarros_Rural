-- Complemento: fundos independentes por formato (banner, A4, A3)
--
-- Para quem rodou a PRIMEIRA versão da migration 20260710000000 (que tinha um
-- campo único fundo_url): adiciona as 3 colunas novas, migra o valor antigo e
-- remove fundo_url. Idempotente e seguro também em banco novo (onde a versão
-- atualizada da migration base já cria as 3 colunas e fundo_url nunca existiu).

ALTER TABLE public.cardapio_projetos
    ADD COLUMN IF NOT EXISTS fundo_banner_url text,
    ADD COLUMN IF NOT EXISTS fundo_a4_url     text,
    ADD COLUMN IF NOT EXISTS fundo_a3_url     text;

-- Migra o fundo antigo (se a coluna existir e houver valor) para banner e A4,
-- que eram os formatos que o campo único cobria.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name   = 'cardapio_projetos'
           AND column_name  = 'fundo_url'
    ) THEN
        UPDATE public.cardapio_projetos
           SET fundo_banner_url = COALESCE(fundo_banner_url, fundo_url),
               fundo_a4_url     = COALESCE(fundo_a4_url, fundo_url)
         WHERE fundo_url IS NOT NULL;

        ALTER TABLE public.cardapio_projetos DROP COLUMN fundo_url;
    END IF;
END $$;
