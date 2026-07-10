-- Fontes customizadas POR MENU A4 (individual, diferente do A3 que é por projeto).
-- jsonb Partial<FontesA4> com multiplicadores { empresa, titulo, categoria,
-- item, descricao, preco }; null = tamanhos automáticos padrão.

ALTER TABLE public.menus_a4
    ADD COLUMN IF NOT EXISTS fontes jsonb;
