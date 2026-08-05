-- ════════════════════════════════════════════════════════════════════════════
-- BLOCO 22 — Histórico de nomes de produto (RF-059)
-- Renomear produto preserva o nome original (subitem na gestão de produtos;
-- hover mostra a modificação). Registro criado pelo service a cada rename.
-- Idempotente. Pré-requisito: import do catálogo aplicado.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS public.custos_produto_nome_historico (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id    uuid NOT NULL REFERENCES public.custos_produtos(id) ON DELETE CASCADE,
  nome_anterior text NOT NULL,
  nome_novo     text NOT NULL,
  alterado_em   timestamptz NOT NULL DEFAULT now(),
  alterado_por  uuid REFERENCES public.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_custos_prod_nome_hist_produto
  ON public.custos_produto_nome_historico(produto_id, alterado_em);

ALTER TABLE public.custos_produto_nome_historico ENABLE ROW LEVEL SECURITY;

-- RLS padrão EMPRESA — idêntico ao Bloco 13a
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['custos_produto_nome_historico'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %1$s_sel ON public.%1$s', t);
    EXECUTE format('CREATE POLICY %1$s_sel ON public.%1$s FOR SELECT TO authenticated
                    USING (public.custos_papel() IN (''admin'',''gestor'',''projetista''))', t);
    EXECUTE format('DROP POLICY IF EXISTS %1$s_ins ON public.%1$s', t);
    EXECUTE format('CREATE POLICY %1$s_ins ON public.%1$s FOR INSERT TO authenticated
                    WITH CHECK (public.custos_eh_gestor())', t);
    EXECUTE format('DROP POLICY IF EXISTS %1$s_upd ON public.%1$s', t);
    EXECUTE format('CREATE POLICY %1$s_upd ON public.%1$s FOR UPDATE TO authenticated
                    USING (false) WITH CHECK (false)', t);  -- histórico não se edita
    EXECUTE format('DROP POLICY IF EXISTS %1$s_del ON public.%1$s', t);
    EXECUTE format('CREATE POLICY %1$s_del ON public.%1$s FOR DELETE TO authenticated
                    USING (public.custos_papel() = ''admin'')', t);
  END LOOP;
END $$;

COMMIT;

-- ── Verificação ──────────────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM pg_policies WHERE tablename = 'custos_produto_nome_historico') AS policies,  -- esperado: 4
  (SELECT count(*) FROM public.custos_produto_nome_historico)                          AS registros;  -- esperado: 0
