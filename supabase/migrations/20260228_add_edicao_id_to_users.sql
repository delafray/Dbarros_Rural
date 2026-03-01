-- Adiciona edicao_id na tabela users para vincular visitantes temporarios a uma edicao especifica
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS edicao_id UUID
  REFERENCES public.eventos_edicoes(id) ON DELETE SET NULL;
