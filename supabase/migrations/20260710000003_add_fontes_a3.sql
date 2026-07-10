-- Tamanhos de fonte customizados do A3 Duplo, por projeto.
-- jsonb Partial<FontesA3> { empresa, titulo, categoria, item, descricao, preco };
-- null = tamanhos padrão.

ALTER TABLE public.cardapio_projetos
    ADD COLUMN IF NOT EXISTS fontes_a3 jsonb;
