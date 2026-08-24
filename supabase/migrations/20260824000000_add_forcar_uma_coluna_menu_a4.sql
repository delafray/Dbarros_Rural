-- Layout de colunas POR MENU A4: quando true, força coluna única mesmo com
-- mais de 18 itens (limiar automático). false/null = comportamento automático
-- (≤18 itens → 1 coluna; acima → 2 colunas).

ALTER TABLE public.menus_a4
    ADD COLUMN IF NOT EXISTS forcar_uma_coluna boolean NOT NULL DEFAULT false;
