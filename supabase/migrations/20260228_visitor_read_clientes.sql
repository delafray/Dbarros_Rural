-- Visitantes podem ler clientes (necessario para exibir nomes na planilha)
-- Sem esta policy, cliente_id nos estandes nao resolve o nome e mostra "Disponivel"
DROP POLICY IF EXISTS "Visitantes podem ler clientes" ON public.clientes;
CREATE POLICY "Visitantes podem ler clientes"
  ON public.clientes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_visitor = true
    )
  );

-- Visitantes podem ler contatos (necessario para o historico de atendimentos)
DROP POLICY IF EXISTS "Visitantes podem ler contatos" ON public.contatos;
CREATE POLICY "Visitantes podem ler contatos"
  ON public.contatos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_visitor = true
    )
  );
