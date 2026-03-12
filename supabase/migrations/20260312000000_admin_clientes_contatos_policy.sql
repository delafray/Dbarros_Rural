-- Permite que qualquer admin (master ou comum) gerencie clientes e contatos.
-- Antes, apenas visitantes tinham SELECT e admins comuns ficavam sem acesso.

-- ─── clientes: admin full access ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin pode gerenciar clientes" ON public.clientes;
CREATE POLICY "Admin pode gerenciar clientes"
  ON public.clientes FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ─── contatos: admin full access ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin pode gerenciar contatos" ON public.contatos;
CREATE POLICY "Admin pode gerenciar contatos"
  ON public.contatos FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
