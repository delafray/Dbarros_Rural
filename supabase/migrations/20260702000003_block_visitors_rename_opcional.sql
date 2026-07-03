-- ⚠️ PENDENTE DE APLICAÇÃO — colar no SQL Editor do Supabase.
--
-- SEGURANÇA (achado N5 do teste cego): rename_opcional_item() é SECURITY DEFINER
-- (bypassa RLS) com GRANT para QUALQUER autenticado — um visitante temporário
-- podia renomear itens opcionais de todos os eventos do sistema.
-- Guarda escolhida: bloquear VISITANTES (is_visitor) em vez de exigir admin,
-- para não travar projetistas/usuários normais que configuram vendas legitimamente.

CREATE OR REPLACE FUNCTION public.rename_opcional_item(
    old_nome TEXT,
    new_nome TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Bloqueia visitantes e usuários sem perfil (COALESCE true = nega por padrão)
    IF COALESCE((SELECT is_visitor FROM public.users WHERE id = auth.uid()), true) THEN
        RAISE EXCEPTION 'Acesso negado: visitantes não podem renomear itens opcionais';
    END IF;

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

GRANT EXECUTE ON FUNCTION public.rename_opcional_item(TEXT, TEXT) TO authenticated;
