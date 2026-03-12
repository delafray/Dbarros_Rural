-- Permite que admins e usuarios (projetistas) gerenciem clientes e contatos.
-- Visitantes mantêm apenas SELECT (policy separada).
-- Remove policies legadas que restringiam acesso por user_id.

-- ─── clientes: limpar policies antigas ──────────────────────────────────────────
DROP POLICY IF EXISTS "admins full access clientes" ON public.clientes;
DROP POLICY IF EXISTS "users access own clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admin pode gerenciar clientes" ON public.clientes;
CREATE POLICY "Admin ou usuario pode gerenciar clientes"
  ON public.clientes FOR ALL
  TO authenticated
  USING (is_admin() OR (SELECT is_projetista FROM public.users WHERE id = auth.uid()))
  WITH CHECK (is_admin() OR (SELECT is_projetista FROM public.users WHERE id = auth.uid()));

-- ─── contatos: limpar policies antigas ───────────────────────────────────────────
DROP POLICY IF EXISTS "admins full access contatos" ON public.contatos;
DROP POLICY IF EXISTS "users access own contatos" ON public.contatos;
DROP POLICY IF EXISTS "Admin pode gerenciar contatos" ON public.contatos;
CREATE POLICY "Admin ou usuario pode gerenciar contatos"
  ON public.contatos FOR ALL
  TO authenticated
  USING (is_admin() OR (SELECT is_projetista FROM public.users WHERE id = auth.uid()))
  WITH CHECK (is_admin() OR (SELECT is_projetista FROM public.users WHERE id = auth.uid()));
