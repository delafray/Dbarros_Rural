-- Permite que admins e usuarios (projetistas) gerenciem clientes e contatos.
-- Visitantes mantêm apenas SELECT (policy separada).

-- ─── clientes: admin + projetista full access ──────────────────────────────────
DROP POLICY IF EXISTS "Admin pode gerenciar clientes" ON public.clientes;
CREATE POLICY "Admin ou usuario pode gerenciar clientes"
  ON public.clientes FOR ALL
  TO authenticated
  USING (is_admin() OR (SELECT is_projetista FROM public.users WHERE id = auth.uid()))
  WITH CHECK (is_admin() OR (SELECT is_projetista FROM public.users WHERE id = auth.uid()));

-- ─── contatos: admin + projetista full access ──────────────────────────────────
DROP POLICY IF EXISTS "Admin pode gerenciar contatos" ON public.contatos;
CREATE POLICY "Admin ou usuario pode gerenciar contatos"
  ON public.contatos FOR ALL
  TO authenticated
  USING (is_admin() OR (SELECT is_projetista FROM public.users WHERE id = auth.uid()))
  WITH CHECK (is_admin() OR (SELECT is_projetista FROM public.users WHERE id = auth.uid()));
