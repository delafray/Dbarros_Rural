-- Add document storage path columns to eventos_edicoes
-- Files are stored in Supabase Storage bucket "edicao-docs"
-- Only the storage path is saved here, not the file content

ALTER TABLE public.eventos_edicoes
    ADD COLUMN IF NOT EXISTS proposta_comercial_path TEXT,
    ADD COLUMN IF NOT EXISTS planta_baixa_path TEXT;
