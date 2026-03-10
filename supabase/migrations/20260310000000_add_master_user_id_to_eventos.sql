-- Adiciona coluna master_user_id na tabela eventos
-- Quando preenchida, o evento e visivel APENAS para aquele usuario master.
-- Eventos sem master_user_id (NULL) sao visiveis para usuarios nao-master.

ALTER TABLE public.eventos
ADD COLUMN IF NOT EXISTS master_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
