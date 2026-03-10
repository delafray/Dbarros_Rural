-- Adiciona coluna opcionais_nomes para snapshot dos nomes dos itens opcionais por edicao.
-- Isso desvincula os nomes da tabela global itens_opcionais, evitando que renames
-- no cadastro afetem edicoes ja comercializadas.
-- Formato: { "item-uuid": "Nome do Item no momento da ativacao" }

ALTER TABLE public.planilha_configuracoes 
ADD COLUMN IF NOT EXISTS opcionais_nomes JSONB DEFAULT '{}';

-- Popula opcionais_nomes para configuracoes existentes que ja tem itens ativos
-- mas ainda nao tem o snapshot (migracao retroativa)
UPDATE public.planilha_configuracoes pc
SET opcionais_nomes = (
    SELECT jsonb_object_agg(io.id, io.nome)
    FROM unnest(pc.opcionais_ativos) AS item_id
    JOIN public.itens_opcionais io ON io.id = item_id::uuid
)
WHERE pc.opcionais_ativos IS NOT NULL 
  AND array_length(pc.opcionais_ativos, 1) > 0
  AND (pc.opcionais_nomes IS NULL OR pc.opcionais_nomes = '{}'::jsonb);
