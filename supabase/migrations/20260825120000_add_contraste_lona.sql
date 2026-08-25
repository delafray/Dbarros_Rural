-- Contraste automático da lona:
--  - contraste_modo: 'auto' (detecta pela luminância da arte na área útil),
--    'claro' (texto claro forçado) ou 'escuro' (texto escuro forçado)
--  - scrim_opacidade: véu de contraste atrás da área útil (0 = desligado);
--    escuro sob texto claro, claro sob texto escuro
--
-- ⚠️ Rodar manualmente no SQL Editor do Supabase ANTES do deploy do código.
-- Idempotente — pode ser re-executado com segurança.

ALTER TABLE public.cardapio_lonas
    ADD COLUMN IF NOT EXISTS contraste_modo text NOT NULL DEFAULT 'auto'
        CHECK (contraste_modo IN ('auto', 'claro', 'escuro'));

ALTER TABLE public.cardapio_lonas
    ADD COLUMN IF NOT EXISTS scrim_opacidade numeric NOT NULL DEFAULT 0
        CHECK (scrim_opacidade >= 0 AND scrim_opacidade <= 0.8);
