-- Habilita Realtime para a tabela de estandes da planilha de vendas
-- Necessario para que outros usuarios vejam atualizacoes em tempo real

ALTER PUBLICATION supabase_realtime ADD TABLE public.planilha_vendas_estandes;
