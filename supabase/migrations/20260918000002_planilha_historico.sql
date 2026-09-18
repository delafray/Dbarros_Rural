-- ⏳ APLICAR EM PRODUÇÃO (Supabase → SQL Editor ou Management API).
--
-- HISTÓRICO DE ALTERAÇÕES da planilha de vendas (pedido do usuário 18/09: "informação não pode
-- se perder" — mapa e planilha são editados em tempo real por várias pessoas).
-- Todo INSERT/UPDATE/DELETE em planilha_vendas_estandes vira uma linha aqui, com a linha
-- inteira ANTES e DEPOIS, só os campos que mudaram, quem fez e quando. Nada é apagado do
-- histórico pelo app. Recuperar = ler `linha_antes` e gravar de volta (ver consultas no fim).
--
-- RLS: leitura só master; ninguém escreve direto (o gatilho grava como SECURITY DEFINER).

CREATE TABLE IF NOT EXISTS public.planilha_vendas_estandes_historico (
  id            bigserial PRIMARY KEY,
  estande_id    uuid NOT NULL,                 -- id da linha da planilha (sem FK: sobrevive ao DELETE)
  config_id     uuid,
  stand_nr      text,
  acao          text NOT NULL CHECK (acao IN ('INSERT', 'UPDATE', 'DELETE')),
  campos        jsonb,                         -- {campo: {de: ..., para: ...}} só do que mudou (UPDATE)
  linha_antes   jsonb,                         -- linha inteira antes (UPDATE/DELETE)
  linha_depois  jsonb,                         -- linha inteira depois (INSERT/UPDATE)
  user_id       uuid DEFAULT auth.uid(),       -- quem fez (null = SQL Editor / serviço)
  criado_em     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS planilha_hist_estande_idx ON public.planilha_vendas_estandes_historico (estande_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS planilha_hist_config_idx  ON public.planilha_vendas_estandes_historico (config_id, criado_em DESC);

COMMENT ON TABLE public.planilha_vendas_estandes_historico IS
  'Trilha completa de mudanças da planilha de vendas (antes/depois, quem, quando). Gravada por gatilho; não apagar.';

CREATE OR REPLACE FUNCTION public.planilha_estande_historico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_antes  jsonb;
  v_depois jsonb;
  v_campos jsonb := '{}'::jsonb;
  k text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_depois := to_jsonb(NEW);
    INSERT INTO public.planilha_vendas_estandes_historico (estande_id, config_id, stand_nr, acao, linha_depois)
    VALUES (NEW.id, NEW.config_id, NEW.stand_nr, 'INSERT', v_depois);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_antes := to_jsonb(OLD);
    v_depois := to_jsonb(NEW);
    FOR k IN SELECT jsonb_object_keys(v_depois) LOOP
      IF k <> 'updated_at' AND (v_antes -> k) IS DISTINCT FROM (v_depois -> k) THEN
        v_campos := v_campos || jsonb_build_object(k, jsonb_build_object('de', v_antes -> k, 'para', v_depois -> k));
      END IF;
    END LOOP;
    IF v_campos = '{}'::jsonb THEN
      RETURN NEW; -- nada mudou de verdade: não polui o histórico
    END IF;
    INSERT INTO public.planilha_vendas_estandes_historico (estande_id, config_id, stand_nr, acao, campos, linha_antes, linha_depois)
    VALUES (NEW.id, NEW.config_id, NEW.stand_nr, 'UPDATE', v_campos, v_antes, v_depois);
    RETURN NEW;
  ELSE
    v_antes := to_jsonb(OLD);
    INSERT INTO public.planilha_vendas_estandes_historico (estande_id, config_id, stand_nr, acao, linha_antes)
    VALUES (OLD.id, OLD.config_id, OLD.stand_nr, 'DELETE', v_antes);
    RETURN OLD;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_planilha_estande_historico ON public.planilha_vendas_estandes;
CREATE TRIGGER trg_planilha_estande_historico
  AFTER INSERT OR UPDATE OR DELETE ON public.planilha_vendas_estandes
  FOR EACH ROW EXECUTE FUNCTION public.planilha_estande_historico();

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.planilha_vendas_estandes_historico ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hist_leitura_master" ON public.planilha_vendas_estandes_historico;
CREATE POLICY "hist_leitura_master" ON public.planilha_vendas_estandes_historico
  FOR SELECT TO authenticated USING (public.is_master());
-- Sem política de INSERT/UPDATE/DELETE: usuário nenhum escreve direto; o gatilho (SECURITY DEFINER) grava.
REVOKE INSERT, UPDATE, DELETE ON public.planilha_vendas_estandes_historico FROM authenticated, anon;

-- ─── Verificação ───────────────────────────────────────────────────────────
-- SELECT tgname FROM pg_trigger WHERE tgname = 'trg_planilha_estande_historico';      → 1 linha
-- SELECT policyname FROM pg_policies WHERE tablename = 'planilha_vendas_estandes_historico'; → hist_leitura_master

-- ─── Consultas de recuperação (master, no SQL Editor) ───────────────────────
-- Últimas mudanças de um estande:
--   SELECT criado_em, acao, campos, user_id FROM public.planilha_vendas_estandes_historico
--    WHERE stand_nr = 'P 09' AND config_id = '<config>' ORDER BY criado_em DESC LIMIT 20;
-- Quem tirou o cliente de uma linha:
--   SELECT criado_em, user_id, campos->'cliente_id', campos->'cliente_nome_livre'
--     FROM public.planilha_vendas_estandes_historico WHERE estande_id = '<id>' AND campos ? 'cliente_id' ORDER BY criado_em DESC;
-- Voltar um campo ao valor anterior (ex.: cliente_id do registro de histórico <hid>):
--   UPDATE public.planilha_vendas_estandes e SET cliente_id = (h.linha_antes->>'cliente_id')::uuid
--     FROM public.planilha_vendas_estandes_historico h WHERE h.id = <hid> AND e.id = h.estande_id;
-- Linha apagada por engano: reinserir a partir de linha_antes do registro DELETE.
