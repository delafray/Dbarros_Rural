-- ============================================================
-- Migration: edicao_id + politicas de admin na tabela users
-- Rodar no Supabase Studio > SQL Editor
-- ============================================================

-- 1. Adiciona edicao_id (idempotente)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS edicao_id UUID
  REFERENCES public.eventos_edicoes(id) ON DELETE SET NULL;

-- 2. Garante que RLS esta ativo na tabela users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. Politica: admin pode ler qualquer usuario
DROP POLICY IF EXISTS "Admin pode ler qualquer usuario" ON public.users;
CREATE POLICY "Admin pode ler qualquer usuario"
  ON public.users FOR SELECT
  TO authenticated
  USING (is_admin() OR auth.uid() = id);

-- 4. Politica: admin pode atualizar qualquer usuario
--    (necessario para createTempUser e updateUser)
DROP POLICY IF EXISTS "Admin pode atualizar qualquer usuario" ON public.users;
CREATE POLICY "Admin pode atualizar qualquer usuario"
  ON public.users FOR UPDATE
  TO authenticated
  USING (is_admin() OR auth.uid() = id)
  WITH CHECK (is_admin() OR auth.uid() = id);

-- 5. Politica: admin pode inserir usuarios
DROP POLICY IF EXISTS "Admin pode inserir usuarios" ON public.users;
CREATE POLICY "Admin pode inserir usuarios"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- 6. Politica: admin pode deletar usuarios
DROP POLICY IF EXISTS "Admin pode deletar usuarios" ON public.users;
CREATE POLICY "Admin pode deletar usuarios"
  ON public.users FOR DELETE
  TO authenticated
  USING (is_admin());
