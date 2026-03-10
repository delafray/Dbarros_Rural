-- Isolamento total de dados de eventos master
-- Regra: master (can_manage_tags=true) ve tudo.
--        Nao-master so ve registros cujo evento pai tem master_user_id IS NULL.

-- ─── 1. Helper: verifica se o usuario logado e master ─────────────────────────
CREATE OR REPLACE FUNCTION public.is_master()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(can_manage_tags, false) FROM public.users WHERE id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.is_master() TO authenticated;

-- ─── 2. eventos ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can manage their own events" ON public.eventos;

CREATE POLICY "master_isolation" ON public.eventos
  FOR ALL TO authenticated
  USING (public.is_master() OR master_user_id IS NULL)
  WITH CHECK (public.is_master() OR master_user_id IS NULL);

-- ─── 3. eventos_edicoes ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can manage editions of their events" ON public.eventos_edicoes;

CREATE POLICY "master_isolation" ON public.eventos_edicoes
  FOR ALL TO authenticated
  USING (
    public.is_master() OR
    (SELECT master_user_id FROM public.eventos WHERE id = evento_id) IS NULL
  )
  WITH CHECK (
    public.is_master() OR
    (SELECT master_user_id FROM public.eventos WHERE id = evento_id) IS NULL
  );

-- ─── 4. atendimentos ──────────────────────────────────────────────────────────
ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "master_isolation" ON public.atendimentos;

CREATE POLICY "master_isolation" ON public.atendimentos
  FOR ALL TO authenticated
  USING (
    public.is_master() OR
    (SELECT e.master_user_id
     FROM public.eventos e
     JOIN public.eventos_edicoes ee ON ee.evento_id = e.id
     WHERE ee.id = edicao_id) IS NULL
  )
  WITH CHECK (
    public.is_master() OR
    (SELECT e.master_user_id
     FROM public.eventos e
     JOIN public.eventos_edicoes ee ON ee.evento_id = e.id
     WHERE ee.id = edicao_id) IS NULL
  );

-- ─── 5. planilha_configuracoes ────────────────────────────────────────────────
ALTER TABLE public.planilha_configuracoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "master_isolation" ON public.planilha_configuracoes;

CREATE POLICY "master_isolation" ON public.planilha_configuracoes
  FOR ALL TO authenticated
  USING (
    public.is_master() OR
    (SELECT e.master_user_id
     FROM public.eventos e
     JOIN public.eventos_edicoes ee ON ee.evento_id = e.id
     WHERE ee.id = edicao_id) IS NULL
  )
  WITH CHECK (
    public.is_master() OR
    (SELECT e.master_user_id
     FROM public.eventos e
     JOIN public.eventos_edicoes ee ON ee.evento_id = e.id
     WHERE ee.id = edicao_id) IS NULL
  );

-- ─── 6. planilha_vendas_estandes ──────────────────────────────────────────────
ALTER TABLE public.planilha_vendas_estandes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "master_isolation" ON public.planilha_vendas_estandes;

CREATE POLICY "master_isolation" ON public.planilha_vendas_estandes
  FOR ALL TO authenticated
  USING (
    public.is_master() OR
    (SELECT e.master_user_id
     FROM public.eventos e
     JOIN public.eventos_edicoes ee ON ee.evento_id = e.id
     JOIN public.planilha_configuracoes pc ON pc.edicao_id = ee.id
     WHERE pc.id = config_id) IS NULL
  )
  WITH CHECK (
    public.is_master() OR
    (SELECT e.master_user_id
     FROM public.eventos e
     JOIN public.eventos_edicoes ee ON ee.evento_id = e.id
     JOIN public.planilha_configuracoes pc ON pc.edicao_id = ee.id
     WHERE pc.id = config_id) IS NULL
  );

-- ─── 7. tarefas ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can manage tarefas" ON public.tarefas;

CREATE POLICY "master_isolation" ON public.tarefas
  FOR ALL TO authenticated
  USING (
    public.is_master() OR
    (SELECT e.master_user_id
     FROM public.eventos e
     JOIN public.eventos_edicoes ee ON ee.evento_id = e.id
     WHERE ee.id = edicao_id) IS NULL
  )
  WITH CHECK (
    public.is_master() OR
    (SELECT e.master_user_id
     FROM public.eventos e
     JOIN public.eventos_edicoes ee ON ee.evento_id = e.id
     WHERE ee.id = edicao_id) IS NULL
  );

-- ─── 8. tarefas_historico ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can manage tarefas_historico" ON public.tarefas_historico;

CREATE POLICY "master_isolation" ON public.tarefas_historico
  FOR ALL TO authenticated
  USING (
    public.is_master() OR
    (SELECT e.master_user_id
     FROM public.eventos e
     JOIN public.eventos_edicoes ee ON ee.evento_id = e.id
     JOIN public.tarefas t ON t.edicao_id = ee.id
     WHERE t.id = tarefa_id) IS NULL
  )
  WITH CHECK (
    public.is_master() OR
    (SELECT e.master_user_id
     FROM public.eventos e
     JOIN public.eventos_edicoes ee ON ee.evento_id = e.id
     JOIN public.tarefas t ON t.edicao_id = ee.id
     WHERE t.id = tarefa_id) IS NULL
  );

-- ─── 9. edicao_imagens_config ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_all_imagens_config" ON public.edicao_imagens_config;

CREATE POLICY "master_isolation" ON public.edicao_imagens_config
  FOR ALL TO authenticated
  USING (
    public.is_master() OR
    (SELECT e.master_user_id
     FROM public.eventos e
     JOIN public.eventos_edicoes ee ON ee.evento_id = e.id
     WHERE ee.id = edicao_id) IS NULL
  )
  WITH CHECK (
    public.is_master() OR
    (SELECT e.master_user_id
     FROM public.eventos e
     JOIN public.eventos_edicoes ee ON ee.evento_id = e.id
     WHERE ee.id = edicao_id) IS NULL
  );

-- ─── 10. stand_imagens_status ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_all_stand_status" ON public.stand_imagens_status;

CREATE POLICY "master_isolation" ON public.stand_imagens_status
  FOR ALL TO authenticated
  USING (
    public.is_master() OR
    (SELECT e.master_user_id
     FROM public.eventos e
     JOIN public.eventos_edicoes ee ON ee.evento_id = e.id
     JOIN public.planilha_configuracoes pc ON pc.edicao_id = ee.id
     JOIN public.planilha_vendas_estandes pvs ON pvs.config_id = pc.id
     WHERE pvs.id = estande_id) IS NULL
  )
  WITH CHECK (
    public.is_master() OR
    (SELECT e.master_user_id
     FROM public.eventos e
     JOIN public.eventos_edicoes ee ON ee.evento_id = e.id
     JOIN public.planilha_configuracoes pc ON pc.edicao_id = ee.id
     JOIN public.planilha_vendas_estandes pvs ON pvs.config_id = pc.id
     WHERE pvs.id = estande_id) IS NULL
  );

-- ─── 11. stand_imagem_recebimentos ────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_all_imagem_recebimentos" ON public.stand_imagem_recebimentos;

CREATE POLICY "master_isolation" ON public.stand_imagem_recebimentos
  FOR ALL TO authenticated
  USING (
    public.is_master() OR
    (SELECT e.master_user_id
     FROM public.eventos e
     JOIN public.eventos_edicoes ee ON ee.evento_id = e.id
     JOIN public.planilha_configuracoes pc ON pc.edicao_id = ee.id
     JOIN public.planilha_vendas_estandes pvs ON pvs.config_id = pc.id
     WHERE pvs.id = estande_id) IS NULL
  )
  WITH CHECK (
    public.is_master() OR
    (SELECT e.master_user_id
     FROM public.eventos e
     JOIN public.eventos_edicoes ee ON ee.evento_id = e.id
     JOIN public.planilha_configuracoes pc ON pc.edicao_id = ee.id
     JOIN public.planilha_vendas_estandes pvs ON pvs.config_id = pc.id
     WHERE pvs.id = estande_id) IS NULL
  );
