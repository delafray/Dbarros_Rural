-- ════════════════════════════════════════════════════════════════════════════
-- BLOCO 25 — RF-060: Centro de Custo EXCLUSIVO do usuário autorizado (14/08)
-- Pedido: módulo vai à main/produção, mas "será apenas para mim" — os demais
-- usuários (mesmo admin/gestor) continuam vendo o sistema como está hoje.
--
-- Como funciona: TODAS as ~76 policies do módulo resolvem permissão via
-- public.custos_papel() / custos_eh_gestor(). Este bloco põe a trava nesse
-- ponto único: se o e-mail do usuário logado não for o autorizado, o papel
-- vira 'sem_acesso' e NENHUMA policy custos_* libera nada (leitura ou
-- escrita), inclusive a view custos_itens_descritivo e o RPC
-- custos_criar_evento_com_edicao. O resto do sistema não passa por essas
-- funções (eventos/atendimentos usam is_master) — segue intacto.
--
-- Liberação geral depois dos testes = rodar a REVERSÃO no fim do bloco.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- Trava por e-mail (mesmo e-mail do licenciamento)
CREATE OR REPLACE FUNCTION public.custos_usuario_autorizado()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = (SELECT auth.uid())
      AND lower(trim(u.email)) = 'ronaldo@ronaldoborba.com.br'
  )
$$;

-- custos_papel() original (Bloco 2 da fase 0) + a trava na frente
CREATE OR REPLACE FUNCTION public.custos_papel()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN NOT public.custos_usuario_autorizado() THEN 'sem_acesso'
    WHEN u.is_admin THEN 'admin'
    WHEN COALESCE(u.can_manage_tags,false) THEN 'gestor'
    WHEN COALESCE(u.is_projetista,false)  THEN 'projetista'
    WHEN COALESCE(u.is_visitor,false)     THEN 'visitante'
    ELSE 'vendedor'
  END
  FROM public.users u WHERE u.id = (SELECT auth.uid())
$$;

COMMIT;

-- ── Verificação 1: quem está autorizado (deve listar SÓ o seu usuário) ───────
SELECT name, email,
       lower(trim(email)) = 'ronaldo@ronaldoborba.com.br' AS autorizado
FROM public.users
WHERE lower(trim(email)) = 'ronaldo@ronaldoborba.com.br';

-- ── Verificação 2: a trava está na frente do papel ───────────────────────────
-- (no SQL Editor auth.uid() é nulo, então aqui deve vir 'sem_acesso'/NULL;
--  a prova real é no app: outro admin logado não deve conseguir ler
--  custos_produtos via API, e o seu usuário deve continuar operando normal)
SELECT public.custos_usuario_autorizado() AS autorizado_no_editor,
       public.custos_papel()              AS papel_no_editor;

-- ════════════════════════════════════════════════════════════════════════════
-- REVERSÃO (liberação geral, SÓ quando os testes acabarem — não rodar agora):
--
-- BEGIN;
-- CREATE OR REPLACE FUNCTION public.custos_papel()
-- RETURNS text
-- LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
-- AS $$
--   SELECT CASE
--     WHEN u.is_admin THEN 'admin'
--     WHEN COALESCE(u.can_manage_tags,false) THEN 'gestor'
--     WHEN COALESCE(u.is_projetista,false)  THEN 'projetista'
--     WHEN COALESCE(u.is_visitor,false)     THEN 'visitante'
--     ELSE 'vendedor'
--   END
--   FROM public.users u WHERE u.id = (SELECT auth.uid())
-- $$;
-- DROP FUNCTION public.custos_usuario_autorizado();
-- COMMIT;
-- (e no front: trocar podeVerCentroCusto pelo gate antigo isAdmin/canManageTags)
-- ════════════════════════════════════════════════════════════════════════════
