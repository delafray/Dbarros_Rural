-- Armazena a senha em texto plano dos visitantes temporarios
-- Protegida por RLS: apenas admin pode ler/escrever
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS temp_password_plain TEXT;
