-- ⏳ PENDENTE DE APLICAR EM PRODUÇÃO (Supabase → SQL Editor). Ver motor-planta/ESPECIFICACAO.md §6.
--
-- planilha_mapa: geometria do mapa de vendas por edição (gerada pelo motor-planta).
-- Uma linha ATIVA por edição; versões anteriores ficam inativas (histórico).
-- O fundo (PNG) mora no bucket edicao-docs em <edicao_id>/mapa-fundo.png; a geometria
-- dos estandes é JSON e o React desenha os polígonos (nada de SVG com script no storage).

CREATE TABLE IF NOT EXISTS public.planilha_mapa (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edicao_id   uuid NOT NULL REFERENCES public.eventos_edicoes(id) ON DELETE CASCADE,
  versao      text NOT NULL,                       -- "ALT 01"
  ativo       boolean NOT NULL DEFAULT true,
  view_box    text NOT NULL,                       -- "0 0 1190.55 841.89" (pt do PDF)
  fundo_path  text,                                -- bucket edicao-docs: <edicao_id>/mapa-fundo.png
  estandes    jsonb NOT NULL,                      -- [{codigo, stand_nr, familia, pontos, centro, area, obs}]
  gerado_em   timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz DEFAULT now(),
  CONSTRAINT planilha_mapa_estandes_e_array CHECK (jsonb_typeof(estandes) = 'array')
);

CREATE UNIQUE INDEX IF NOT EXISTS planilha_mapa_um_ativo_por_edicao
  ON public.planilha_mapa (edicao_id) WHERE ativo;
CREATE INDEX IF NOT EXISTS planilha_mapa_edicao_idx ON public.planilha_mapa (edicao_id);

-- ─── RLS (PADRAO-NOVOS-SISTEMAS §4: projetada antes da tela) ─────────────────
ALTER TABLE public.planilha_mapa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mapa_leitura_equipe" ON public.planilha_mapa;
DROP POLICY IF EXISTS "mapa_escrita_master" ON public.planilha_mapa;

-- Leitura: equipe autenticada, com o MESMO isolamento de evento master usado em
-- planilha_configuracoes (master vê tudo; os demais só eventos sem dono master).
CREATE POLICY "mapa_leitura_equipe" ON public.planilha_mapa
  FOR SELECT TO authenticated
  USING (
    public.is_master() OR
    (SELECT e.master_user_id
       FROM public.eventos e
       JOIN public.eventos_edicoes ee ON ee.evento_id = e.id
      WHERE ee.id = edicao_id) IS NULL
  );

-- Escrita (publicar/trocar mapa): só master. Visitante/temporário/comum não escreve.
CREATE POLICY "mapa_escrita_master" ON public.planilha_mapa
  FOR ALL TO authenticated
  USING (public.is_master())
  WITH CHECK (public.is_master());

-- ─── Verificação (rodar depois de aplicar) ───────────────────────────────────
-- SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'planilha_mapa';
--   → mapa_leitura_equipe (SELECT, authenticated) e mapa_escrita_master (ALL, authenticated)
-- SELECT relrowsecurity FROM pg_class WHERE relname = 'planilha_mapa';   → true
-- Teste de papel restrito (como usuário NÃO master, via app/API):
--   SELECT count(*) FROM planilha_mapa;  → só mapas de eventos sem master_user_id
--   INSERT INTO planilha_mapa (...)      → "new row violates row-level security policy"
