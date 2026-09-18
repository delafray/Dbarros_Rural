-- ⏳ APLICAR EM PRODUÇÃO (Supabase → SQL Editor ou Management API). Ver motor-planta/ESPECIFICACAO.md §6.1.
--
-- mapa_rotulo: "nome no mapa" do estande (pedido do usuário 18/09). Texto curto, por linha da
-- planilha (= por estande × edição), que substitui o nome fantasia SÓ no desenho do mapa
-- (ex.: "META AGRONEGOCIOS" → "META AGRONEG" para caber maior). Regras:
--   • some sozinho quando o CLIENTE da linha muda (trigger abaixo): volta ao nome padrão;
--   • troca de status (x / reservado / cortesia / vazio) NÃO mexe nele;
--   • outra edição = outra linha = sem rótulo (cada planta tem o seu).
-- RLS: mesma tabela, mesmas políticas já existentes de planilha_vendas_estandes.

ALTER TABLE public.planilha_vendas_estandes
  ADD COLUMN IF NOT EXISTS mapa_rotulo text;

COMMENT ON COLUMN public.planilha_vendas_estandes.mapa_rotulo IS
  'Nome curto do cliente só para o desenho do mapa de vendas; NULL = usa o nome fantasia. Zerado automaticamente quando o cliente da linha muda.';

CREATE OR REPLACE FUNCTION public.planilha_estande_limpa_rotulo_mapa()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Cliente mudou (id ou nome livre) e o rótulo não foi mexido nesta mesma escrita → volta ao padrão.
  IF (NEW.cliente_id IS DISTINCT FROM OLD.cliente_id
      OR NEW.cliente_nome_livre IS DISTINCT FROM OLD.cliente_nome_livre)
     AND NEW.mapa_rotulo IS NOT DISTINCT FROM OLD.mapa_rotulo THEN
    NEW.mapa_rotulo := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_planilha_estande_limpa_rotulo_mapa ON public.planilha_vendas_estandes;
CREATE TRIGGER trg_planilha_estande_limpa_rotulo_mapa
  BEFORE UPDATE ON public.planilha_vendas_estandes
  FOR EACH ROW EXECUTE FUNCTION public.planilha_estande_limpa_rotulo_mapa();

-- ─── Verificação ───────────────────────────────────────────────────────────
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name = 'planilha_vendas_estandes' AND column_name = 'mapa_rotulo';   → 1 linha
-- SELECT tgname FROM pg_trigger WHERE tgname = 'trg_planilha_estande_limpa_rotulo_mapa'; → 1 linha
