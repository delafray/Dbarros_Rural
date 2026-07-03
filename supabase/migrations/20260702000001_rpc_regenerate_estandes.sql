-- ✅ APLICADA EM PRODUÇÃO em 02/07/2026; generateEstandes() já usa esta RPC.
--
-- INTEGRIDADE: generateEstandes() no client faz DELETE + INSERT em duas chamadas
-- separadas. Se o INSERT falhar após o DELETE (rede, timeout), TODOS os estandes
-- da planilha são perdidos sem recuperação. Esta RPC executa os dois passos dentro
-- de uma única transação: ou tudo acontece, ou nada.
--
-- APÓS APLICAR, trocar em services/planilhaVendasService.ts (generateEstandes):
--   const { data, error } = await supabase.rpc('regenerate_estandes', {
--       p_config_id: configId,
--       p_stand_nrs: estandes.map(e => e.stand_nr),
--   });
-- (NÃO trocar o código antes de aplicar a migration — quebraria produção.)

CREATE OR REPLACE FUNCTION public.regenerate_estandes(
  p_config_id UUID,
  p_stand_nrs TEXT[]
)
RETURNS SETOF public.planilha_vendas_estandes
LANGUAGE plpgsql
SECURITY INVOKER  -- respeita as policies RLS do usuário que chama
AS $fn$
BEGIN
  DELETE FROM public.planilha_vendas_estandes WHERE config_id = p_config_id;

  RETURN QUERY
  INSERT INTO public.planilha_vendas_estandes
    (config_id, stand_nr, tipo_venda, opcionais_selecionados, desconto, valor_pago)
  SELECT p_config_id, nr, 'DISPONÍVEL', '{}'::jsonb, 0, 0
  FROM unnest(p_stand_nrs) AS nr
  RETURNING *;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.regenerate_estandes(UUID, TEXT[]) TO authenticated;
