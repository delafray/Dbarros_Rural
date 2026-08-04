-- ════════════════════════════════════════════════════════════════════════════
-- BLOCO 16 — SEÇÕES (centros de custo reais do usuário, RF-055)
-- ════════════════════════════════════════════════════════════════════════════
-- 3ª dimensão do item: Julgamento (hierárquico por raça), Estrutura, Diversos —
-- o A/B/C com subtotais das planilhas reais (Perdizes/Cláudio).

CREATE TABLE IF NOT EXISTS public.custos_secoes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       text NOT NULL,                 -- "Custos Julgamento dos Animais"
  nome_curto text NOT NULL,                 -- "Julgamento" (poupar espaço na planilha)
  slug       text NOT NULL UNIQUE,
  parent_id  uuid REFERENCES public.custos_secoes(id) ON DELETE CASCADE,
  ordem      int NOT NULL DEFAULT 0,
  ativo      boolean NOT NULL DEFAULT true,
  criado_em  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.custos_secoes ENABLE ROW LEVEL SECURITY;

-- Policies: mesmo padrão das tabelas de EMPRESA (13a)
DROP POLICY IF EXISTS custos_secoes_sel ON public.custos_secoes;
CREATE POLICY custos_secoes_sel ON public.custos_secoes
  FOR SELECT TO authenticated
  USING (public.custos_papel() IN ('admin','gestor','projetista'));
DROP POLICY IF EXISTS custos_secoes_ins ON public.custos_secoes;
CREATE POLICY custos_secoes_ins ON public.custos_secoes
  FOR INSERT TO authenticated WITH CHECK (public.custos_eh_gestor());
DROP POLICY IF EXISTS custos_secoes_upd ON public.custos_secoes;
CREATE POLICY custos_secoes_upd ON public.custos_secoes
  FOR UPDATE TO authenticated
  USING (public.custos_eh_gestor()) WITH CHECK (public.custos_eh_gestor());
DROP POLICY IF EXISTS custos_secoes_del ON public.custos_secoes;
CREATE POLICY custos_secoes_del ON public.custos_secoes
  FOR DELETE TO authenticated USING (public.custos_papel() = 'admin');

-- Item ganha a seção
ALTER TABLE public.custos_itens
  ADD COLUMN IF NOT EXISTS secao_id uuid REFERENCES public.custos_secoes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_custos_itens_secao ON public.custos_itens(secao_id);

-- Seeds: os centros de custo REAIS das planilhas do usuário (lista aberta)
INSERT INTO public.custos_secoes (nome, nome_curto, slug, ordem) VALUES
 ('Custos Julgamento dos Animais', 'Julgamento', 'julgamento', 10),
 ('Custos com a Estrutura do Evento', 'Estrutura', 'estrutura', 20),
 ('Custos Diversos do Evento', 'Diversos', 'diversos', 30)
ON CONFLICT (slug) DO NOTHING;

-- Sub-seções do Julgamento (por raça/tipo — Nelore etc. o gestor acrescenta)
INSERT INTO public.custos_secoes (nome, nome_curto, slug, parent_id, ordem)
SELECT v.nome, v.nome_curto, v.slug, s.id, v.ordem
FROM (VALUES
  ('Julgamento Girolando', 'Girolando', 'julgamento-girolando', 11),
  ('Julgamento Gir',       'Gir',       'julgamento-gir',       12),
  ('Torneio Leiteiro',     'Torneio Leiteiro', 'torneio-leiteiro', 13)
) AS v(nome, nome_curto, slug, ordem)
JOIN public.custos_secoes s ON s.slug = 'julgamento'
ON CONFLICT (slug) DO NOTHING;
