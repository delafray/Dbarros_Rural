-- Funcao RPC para propagar rename de item opcional para todas as referencias
-- Atualiza: opcionais_selecionados nos estandes + origem_ref nas configs de imagem

CREATE OR REPLACE FUNCTION public.rename_opcional_item(
    old_nome TEXT,
    new_nome TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Renomeia a chave em planilha_vendas_estandes.opcionais_selecionados
    UPDATE planilha_vendas_estandes
    SET opcionais_selecionados =
        (opcionais_selecionados - old_nome) ||
        jsonb_build_object(new_nome, opcionais_selecionados->old_nome)
    WHERE opcionais_selecionados ? old_nome;

    -- 2. Renomeia origem_ref em edicao_imagens_config (tipo item_opcional)
    UPDATE edicao_imagens_config
    SET origem_ref = new_nome
    WHERE origem_tipo = 'item_opcional' AND origem_ref = old_nome;
END;
$$;

-- Permissao para usuarios autenticados chamarem a funcao
GRANT EXECUTE ON FUNCTION public.rename_opcional_item(TEXT, TEXT) TO authenticated;
